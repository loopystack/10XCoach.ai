export interface AudioRecorder {
  start: () => Promise<void>
  stop: () => Promise<Blob>
  isRecording: () => boolean
}

export class BrowserAudioRecorder implements AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []
  private stream: MediaStream | null = null
  private recording = false

  async start(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })

      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
      }

      // Fallback to default if webm not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType!)) {
        options.mimeType = 'audio/webm'
      }

      this.mediaRecorder = new MediaRecorder(this.stream, options)
      this.audioChunks = []

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
        }
      }

      this.mediaRecorder.start()
      this.recording = true
    } catch (error) {
      console.error('Error accessing microphone:', error)
      throw new Error('Failed to access microphone')
    }
  }

  async stop(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.recording) {
        reject(new Error('Not recording'))
        return
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
        this.cleanup()
        resolve(audioBlob)
      }

      this.mediaRecorder.onerror = (event) => {
        this.cleanup()
        reject(new Error('Recording error'))
      }

      this.mediaRecorder.stop()
      this.recording = false
    })
  }

  isRecording(): boolean {
    return this.recording
  }

  private cleanup() {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }
    this.mediaRecorder = null
    this.audioChunks = []
  }
}

// Global audio controller for interruption support
let currentAudio: HTMLAudioElement | null = null
let currentResolve: (() => void) | null = null
let currentReject: ((error: Error) => void) | null = null
let currentTimeUpdateHandler: (() => void) | null = null
let currentMetadataHandler: (() => void) | null = null

export function stopAudioPlayback(): boolean {
  if (currentAudio) {
    const audio = currentAudio
    const url = audio.src
    const wasPlaying = !audio.paused
    
    // Remove event listeners properly
    if (currentTimeUpdateHandler) {
      audio.removeEventListener('timeupdate', currentTimeUpdateHandler)
      currentTimeUpdateHandler = null
    }
    if (currentMetadataHandler) {
      audio.removeEventListener('loadedmetadata', currentMetadataHandler)
      currentMetadataHandler = null
    }
    
    // Force stop the audio immediately
    audio.pause()
    audio.currentTime = 0
    
    // Remove all event listeners to prevent any callbacks
    audio.onended = null
    audio.onerror = null
    audio.onpause = null
    
    // Remove from DOM if it was added
    audio.load() // This stops and resets the audio element
    
    currentAudio = null
    
    // Clean up blob URL
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
    }
    
    // Resolve/reject the promise if it exists (so waiting code continues)
    if (currentResolve) {
      currentResolve()
      currentResolve = null
    }
    if (currentReject) {
      currentReject(new Error('Audio playback interrupted'))
      currentReject = null
    }
    
    return wasPlaying
  }
  return false
}

export async function playAudio(
  audioData: ArrayBuffer, 
  mimeType: string = 'audio/mpeg',
  onTimeUpdate?: (currentTime: number, duration: number) => void
): Promise<void> {
  // Stop any currently playing audio
  stopAudioPlayback()
  
  return new Promise((resolve, reject) => {
    const blob = new Blob([audioData], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const audio = new Audio(url)
    
    // Store references for interruption
    currentAudio = audio
    currentResolve = resolve
    currentReject = reject

    // Optimize for immediate playback - start loading as soon as possible
    audio.preload = 'auto'
    
    // Set up time update callback for word highlighting
    if (onTimeUpdate) {
      const timeUpdateHandler = () => {
        if (currentAudio === audio && !audio.paused && isFinite(audio.duration) && audio.duration > 0) {
          onTimeUpdate(audio.currentTime, audio.duration)
        }
      }
      
      const metadataHandler = () => {
        if (currentAudio === audio && isFinite(audio.duration) && audio.duration > 0) {
          onTimeUpdate(0, audio.duration)
        }
      }
      
      // Store handlers for cleanup
      currentTimeUpdateHandler = timeUpdateHandler
      currentMetadataHandler = metadataHandler
      
      audio.addEventListener('timeupdate', timeUpdateHandler)
      audio.addEventListener('loadedmetadata', metadataHandler)
      
      // Also try to get duration immediately if already loaded
      if (audio.readyState >= 1 && isFinite(audio.duration) && audio.duration > 0) {
        onTimeUpdate(0, audio.duration)
      }
    }

    // Start playing as soon as enough data is loaded (reduces perceived latency)
    const canPlayHandler = () => {
      if (currentAudio === audio && audio.readyState >= 2) { // HAVE_CURRENT_DATA or higher
        // Audio has enough data to start playing
        audio.play().catch((error) => {
          if (currentAudio === audio) {
            URL.revokeObjectURL(url)
            currentAudio = null
            currentResolve = null
            currentReject = null
            reject(error)
          }
        })
        audio.removeEventListener('canplay', canPlayHandler)
      }
    }
    
    audio.addEventListener('canplay', canPlayHandler)
    
    // Also try to play immediately if already ready
    if (audio.readyState >= 2) {
      audio.play().catch((error) => {
        if (currentAudio === audio) {
          URL.revokeObjectURL(url)
          currentAudio = null
          currentResolve = null
          currentReject = null
          reject(error)
        }
      })
    }

    audio.onended = () => {
      if (currentAudio === audio) {
        URL.revokeObjectURL(url)
        currentAudio = null
        currentResolve = null
        currentReject = null
        currentTimeUpdateHandler = null
        currentMetadataHandler = null
        resolve()
      }
    }

    audio.onerror = () => {
      if (currentAudio === audio) {
        URL.revokeObjectURL(url)
        currentAudio = null
        currentResolve = null
        currentReject = null
        currentTimeUpdateHandler = null
        currentMetadataHandler = null
        reject(new Error('Audio playback failed'))
      }
    }
  })
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

