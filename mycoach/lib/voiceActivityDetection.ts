/**
 * Voice Activity Detection (VAD) using Web Audio API
 * Detects when user is speaking based on audio volume threshold
 */
export class VoiceActivityDetector {
  private audioContext: AudioContext | null = null
  private analyser: AnalyserNode | null = null
  private microphone: MediaStreamAudioSourceNode | null = null
  private stream: MediaStream | null = null
  private isListening = false
  private checkInterval: number | null = null
  
  // VAD parameters - optimized for better word recognition and sensitivity
  private readonly volumeThreshold: number = 0.06 // Lower threshold for better sensitivity to capture all words
  private readonly silenceDuration: number = 800 // 0.8s - longer silence to capture complete sentences
  private readonly checkIntervalMs: number = 30 // Check more frequently (30ms) for better word detection
  private readonly minSpeechDuration: number = 300 // Minimum 0.3s - lower to capture shorter words
  private readonly minSpeechSamples: number = 3 // Fewer samples needed - more sensitive to speech start
  
  private lastSpeechTime: number = 0
  private recordingStartTime: number = 0 // Track when recording actually started
  private speechDetectionCount: number = 0 // Count consecutive speech detections
  private onSpeechStart: (() => void) | null = null
  private onSpeechEnd: ((audioChunk: Blob) => void) | null = null
  private mediaRecorder: MediaRecorder | null = null
  private audioChunks: Blob[] = []

  async start(
    onSpeechStart: () => void,
    onSpeechEnd: (audioChunk: Blob) => void
  ): Promise<void> {
    if (this.isListening) {
      return
    }

    this.onSpeechStart = onSpeechStart
    this.onSpeechEnd = onSpeechEnd

    try {
      // Get microphone stream with improved quality settings for better word recognition
      // Whisper API works best with 16kHz, but we request higher quality and let browser handle it
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000, // Optimal for Whisper API (16kHz)
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Additional constraints for better audio quality and word recognition
          latency: 0.01, // Low latency for real-time feel
          googEchoCancellation: true,
          googNoiseSuppression: true,
          googAutoGainControl: true,
          googHighpassFilter: true, // Filter low-frequency noise
          googTypingNoiseDetection: true, // Reduce typing noise
        },
      })

      // Create audio context and analyser
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      this.analyser = this.audioContext.createAnalyser()
      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = 0.8

      this.microphone = this.audioContext.createMediaStreamSource(this.stream)
      this.microphone.connect(this.analyser)

      // Set up MediaRecorder for capturing audio chunks
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',
      }

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

      this.isListening = true
      this.lastSpeechTime = Date.now()

      // Start continuous monitoring
      this.startMonitoring()
    } catch (error) {
      console.error('Failed to start VAD:', error)
      throw new Error('Failed to access microphone for voice activity detection')
    }
  }

  private startMonitoring(): void {
    if (!this.analyser || !this.isListening) return

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount)

    const check = () => {
      if (!this.isListening || !this.analyser) return

      this.analyser.getByteFrequencyData(dataArray)
      
      // Calculate average volume
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length
      const normalizedVolume = average / 255

      const now = Date.now()
      const isSpeechDetected = normalizedVolume > this.volumeThreshold

      if (isSpeechDetected) {
        this.lastSpeechTime = now
        this.speechDetectionCount++

        // Only start recording after sustained speech (multiple consecutive detections)
        // This filters out brief noise spikes
        if (
          this.mediaRecorder && 
          this.mediaRecorder.state === 'inactive' &&
          this.speechDetectionCount >= this.minSpeechSamples
        ) {
          this.audioChunks = []
          this.recordingStartTime = now
          this.mediaRecorder.start()
          if (this.onSpeechStart) {
            this.onSpeechStart()
          }
        }
      } else {
        // Reset speech detection count on silence
        this.speechDetectionCount = 0
        
        // Check if silence has been long enough to end speech
        const silenceDuration = now - this.lastSpeechTime

        if (
          this.mediaRecorder &&
          this.mediaRecorder.state === 'recording' &&
          silenceDuration >= this.silenceDuration
        ) {
          // Calculate actual recording duration
          const recordingDuration = now - this.recordingStartTime
          
          // Stop recording and process the audio
          this.mediaRecorder.stop()
          
          this.mediaRecorder.onstop = () => {
            // CRITICAL: Don't process if VAD has been stopped
            if (!this.isListening) {
              this.audioChunks = []
              this.recordingStartTime = 0
              return
            }
            
            if (this.audioChunks.length > 0) {
              const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
              
              // Only process if recording was long enough (filters out brief noise)
              // AND still listening AND has meaningful size
              if (
                recordingDuration >= this.minSpeechDuration &&
                audioBlob.size > 0 && 
                this.onSpeechEnd && 
                this.isListening
              ) {
                this.onSpeechEnd(audioBlob)
              }
              
              this.audioChunks = []
            }
            
            this.recordingStartTime = 0
            
            // Restart recording after a brief pause if still listening
            if (this.isListening && this.mediaRecorder) {
              setTimeout(() => {
                if (this.isListening && this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
                  this.audioChunks = []
                  this.mediaRecorder.start()
                }
              }, 100)
            }
          }
        }
      }

      // Schedule next check
      if (this.isListening) {
        this.checkInterval = window.setTimeout(check, this.checkIntervalMs)
      }
    }

    // Start checking
    check()
  }

  stop(): void {
    if (!this.isListening) return

    this.isListening = false
    this.speechDetectionCount = 0
    this.recordingStartTime = 0

    if (this.checkInterval !== null) {
      clearTimeout(this.checkInterval)
      this.checkInterval = null
    }

    if (this.mediaRecorder) {
      // Clear onstop callback to prevent it from firing after stop
      this.mediaRecorder.onstop = null
      
      if (this.mediaRecorder.state === 'recording') {
        this.mediaRecorder.stop()
      }
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop())
      this.stream = null
    }

    if (this.audioContext) {
      this.audioContext.close()
      this.audioContext = null
    }

    this.analyser = null
    this.microphone = null
    this.mediaRecorder = null
    this.audioChunks = []
    this.onSpeechStart = null
    this.onSpeechEnd = null
  }

  isActive(): boolean {
    return this.isListening
  }

  // Manually trigger speech end (useful for immediate interruption or manual stop)
  triggerSpeechEnd(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      // Store the callback before stopping
      const callback = this.onSpeechEnd
      
      this.mediaRecorder.stop()
      
      this.mediaRecorder.onstop = () => {
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' })
          
          // Call callback even if audio is small (manual stop takes priority)
          if (audioBlob.size > 0 && callback) {
            callback(audioBlob)
          }
          
          this.audioChunks = []
        }
        
        // Restart recording after a brief pause if still listening
        if (this.isListening && this.mediaRecorder) {
          setTimeout(() => {
            if (this.isListening && this.mediaRecorder && this.mediaRecorder.state === 'inactive') {
              this.audioChunks = []
              this.mediaRecorder.start()
            }
          }, 100)
        }
      }
    }
  }

  // Reset recording state - useful when interrupting
  resetRecording(): void {
    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      // Stop current recording without processing
      this.mediaRecorder.stop()
      this.audioChunks = []
      
      // Restart recording immediately if still listening
      if (this.isListening) {
        setTimeout(() => {
          if (this.mediaRecorder && this.mediaRecorder.state === 'inactive' && this.isListening) {
            this.audioChunks = []
            this.mediaRecorder.start()
          }
        }, 50)
      }
    }
  }
}

