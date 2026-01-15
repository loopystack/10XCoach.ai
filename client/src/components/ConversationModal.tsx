import { useEffect, useRef, useState } from 'react'
import { X, Mic, Square, Save } from 'lucide-react'
import { notify } from '../utils/notification'
import './ConversationModal.css'

interface Coach {
  id: number
  name: string
  specialty?: string
  tagline?: string
  avatar?: string
}

interface ConversationModalProps {
  coach: Coach
  isOpen: boolean
  onClose: () => void
  apiType?: 'openai' | 'elevenlabs'
}

const ConversationModal = ({ coach, isOpen, onClose, apiType = 'openai' }: ConversationModalProps) => {
  const [isConnected, setIsConnected] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState('Ready to start')
  const [statusType, setStatusType] = useState<'idle' | 'active' | 'success' | 'error' | 'recording'>('idle')
  const [elapsedTime, setElapsedTime] = useState(0) // Timer in seconds
  
  // Refs for WebSocket and audio
  const wsRef = useRef<WebSocket | null>(null)
  const isRecordingRef = useRef(false)
  const isConnectedRef = useRef(false)
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartTimeRef = useRef<number | null>(null)
  const inputAudioContextRef = useRef<AudioContext | null>(null)
  const outputAudioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const audioQueueRef = useRef<string[]>([])
  const isPlayingAudioRef = useRef(false)
  const shouldStopAudioRef = useRef(false)
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null)
  const currentResponseIdRef = useRef<string | null>(null)
  const audioLevelsRef = useRef<number[]>(new Array(20).fill(0))
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isOpen) {
      cleanup()
      return
    }

    // Start visualizer when modal opens
    if (canvasRef.current) {
      setupVisualizer()
    }

    return () => {
      cleanup()
    }
  }, [isOpen])

  const cleanup = () => {
    // Stop all audio FIRST - this is critical
    clearAudioQueue()
    
    // Close WebSocket connection
    if (wsRef.current) {
      try {
        if (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING) {
          wsRef.current.close(1000, 'Cleanup')
        }
      } catch (e) {
        console.warn('Error closing WebSocket:', e)
      }
      wsRef.current = null
    }
    
    // Stop media stream
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => {
        track.stop()
        track.enabled = false
      })
      mediaStreamRef.current = null
    }
    
    // Disconnect audio processors
    if (processorRef.current) {
      try {
        processorRef.current.disconnect()
      } catch (e) {
        // Already disconnected
      }
      processorRef.current = null
    }
    if (gainNodeRef.current) {
      try {
        gainNodeRef.current.disconnect()
      } catch (e) {
        // Already disconnected
      }
      gainNodeRef.current = null
    }
    
    // Close audio contexts completely
    if (inputAudioContextRef.current) {
      try {
        if (inputAudioContextRef.current.state !== 'closed') {
          inputAudioContextRef.current.close()
        }
      } catch (e) {
        console.warn('Error closing input audio context:', e)
      }
      inputAudioContextRef.current = null
    }
    if (outputAudioContextRef.current) {
      try {
        if (outputAudioContextRef.current.state !== 'closed') {
          outputAudioContextRef.current.close()
        }
      } catch (e) {
        console.warn('Error closing output audio context:', e)
      }
      outputAudioContextRef.current = null
    }
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    
    // Clear timeouts
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    
    // Reset all refs
    shouldStopAudioRef.current = true
    currentAudioSourceRef.current = null
    currentResponseIdRef.current = null
    isConnectedRef.current = false
    isRecordingRef.current = false
    sessionStartTimeRef.current = null
    
    // Reset state
    setIsConnected(false)
    setIsRecording(false)
    setStatus('Ready to start')
    setStatusType('idle')
    setElapsedTime(0)
  }

  const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
    const bytes = new Uint8Array(buffer)
    let binary = ''
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i])
    }
    return btoa(binary)
  }

  const resampleAudio = (input: Float32Array | ArrayLike<number>, inputSampleRate: number, outputSampleRate: number): Float32Array => {
    const inputArray = input instanceof Float32Array ? input : new Float32Array(input)
    
    if (inputSampleRate === outputSampleRate) {
      return inputArray
    }
    
    const ratio = inputSampleRate / outputSampleRate
    const outputLength = Math.round(inputArray.length / ratio)
    const output = new Float32Array(outputLength)
    
    for (let i = 0; i < outputLength; i++) {
      const index = i * ratio
      const indexFloor = Math.floor(index)
      const indexCeil = Math.min(indexFloor + 1, inputArray.length - 1)
      const fraction = index - indexFloor
      output[i] = inputArray[indexFloor] * (1 - fraction) + inputArray[indexCeil] * fraction
    }
    
    return output
  }

  const queueAudio = (audioData: string, responseId?: string) => {
    // Don't queue audio if we've been told to stop
    if (shouldStopAudioRef.current) {
      return
    }
    
    if (responseId && responseId !== currentResponseIdRef.current) {
      clearAudioQueue()
      shouldStopAudioRef.current = false // Reset stop flag for new response
      currentResponseIdRef.current = responseId
    }
    
    if (!currentResponseIdRef.current && responseId) {
      currentResponseIdRef.current = responseId
    }
    
    if (responseId && responseId !== currentResponseIdRef.current) {
      return
    }
    
    audioQueueRef.current.push(audioData)
    
    if (!isPlayingAudioRef.current && !shouldStopAudioRef.current) {
      playAudioQueue()
    }
  }

  const clearAudioQueue = () => {
    // Set stop flag first to prevent new audio from playing
    shouldStopAudioRef.current = true
    
    // Stop any currently playing audio source
    if (currentAudioSourceRef.current) {
      try {
        currentAudioSourceRef.current.stop()
        currentAudioSourceRef.current.disconnect()
      } catch (e) {
        // Audio source may already be stopped
      }
      currentAudioSourceRef.current = null
    }
    
    // Clear the audio queue
    audioQueueRef.current = []
    isPlayingAudioRef.current = false
    
    // Close the audio context completely to stop all audio
    if (outputAudioContextRef.current) {
      try {
        // Stop all audio sources first
        if (outputAudioContextRef.current.state !== 'closed') {
          // Suspend first to stop playback immediately
          outputAudioContextRef.current.suspend().catch(() => {})
          
          // Then close after a short delay to ensure all audio stops
          setTimeout(() => {
            if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
              outputAudioContextRef.current.close().catch(() => {})
            }
          }, 100)
        }
      } catch (e) {
        console.warn('Error closing audio context:', e)
      }
    }
  }

  const playAudioQueue = async () => {
    // Don't play if we should stop
    if (shouldStopAudioRef.current) {
      isPlayingAudioRef.current = false
      audioQueueRef.current = [] // Clear queue
      return
    }
    
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false
      return
    }

    isPlayingAudioRef.current = true

    // Check if audio context was closed (e.g., during cleanup)
    if (!outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
      // Don't create a new context if we're stopping
      if (shouldStopAudioRef.current) {
        isPlayingAudioRef.current = false
        audioQueueRef.current = []
        return
      }
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000
      })
    }
    
    if (outputAudioContextRef.current.state === 'suspended') {
      try {
        await outputAudioContextRef.current.resume()
      } catch (e) {
        console.warn('Error resuming audio context:', e)
        isPlayingAudioRef.current = false
        return
      }
    }

    try {
      while (audioQueueRef.current.length > 0 && !shouldStopAudioRef.current) {
        // Double-check stop flag before each audio chunk
        if (shouldStopAudioRef.current) {
          audioQueueRef.current = [] // Clear remaining queue
          break
        }
        
        const audioData = audioQueueRef.current.shift()
        if (!audioData) continue

        // Check again before processing
        if (shouldStopAudioRef.current || !outputAudioContextRef.current || outputAudioContextRef.current.state === 'closed') {
          audioQueueRef.current = [] // Clear remaining queue
          break
        }
        
        const binaryString = atob(audioData)
        const bytes = new Uint8Array(binaryString.length)
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i)
        }
        
        const int16Data = new Int16Array(bytes.buffer)
        const float32Data = new Float32Array(int16Data.length)
        const scale = 1 / 32768
        for (let i = 0; i < int16Data.length; i++) {
          float32Data[i] = int16Data[i] * scale
        }

        const audioBuffer = outputAudioContextRef.current.createBuffer(1, float32Data.length, 24000)
        audioBuffer.getChannelData(0).set(float32Data)

        const source = outputAudioContextRef.current.createBufferSource()
        source.buffer = audioBuffer
        source.connect(outputAudioContextRef.current.destination)
        
        // Store the current source so we can stop it if needed
        currentAudioSourceRef.current = source
        
        source.start(0)
        
        await new Promise((resolve) => {
          source.onended = () => {
            currentAudioSourceRef.current = null
            resolve(undefined)
          }
        })
        
        // Clear the source reference after it ends
        currentAudioSourceRef.current = null
      }
    } catch (error) {
      console.error('Error playing audio:', error)
      currentAudioSourceRef.current = null
    }

    isPlayingAudioRef.current = false
    
    // Only continue playing if we should not stop and context is still valid
    if (audioQueueRef.current.length > 0 && !shouldStopAudioRef.current && outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
      playAudioQueue()
    } else if (shouldStopAudioRef.current) {
      // Clear any remaining audio if we should stop
      audioQueueRef.current = []
    }
  }

  const initializeAudio = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      })

      mediaStreamRef.current = stream

      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      inputAudioContextRef.current = inputAudioContext
      
      if (inputAudioContext.state === 'suspended') {
        await inputAudioContext.resume()
      }
      
      const actualSampleRate = inputAudioContext.sampleRate
      console.log('Input audio context sample rate:', actualSampleRate)

      const source = inputAudioContext.createMediaStreamSource(stream)
      
      const analyser = inputAudioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      const buffer = new ArrayBuffer(analyser.frequencyBinCount)
      dataArrayRef.current = new Uint8Array(buffer)
      source.connect(analyser)
      
      const bufferSize = 4096
      const processor = inputAudioContext.createScriptProcessor(bufferSize, 1, 1)
      processorRef.current = processor
      
      let audioBuffer: number[] = []
      const sendInterval = 100
      let lastSendTime = Date.now()
      
      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0)
        
        // Use refs to get current values (avoid stale closure)
        const shouldSend = isRecordingRef.current && 
                          isConnectedRef.current && 
                          wsRef.current && 
                          wsRef.current.readyState === WebSocket.OPEN
        
        if (shouldSend) {
          let processedData: Float32Array = new Float32Array(inputData)
          if (actualSampleRate !== 24000) {
            processedData = resampleAudio(new Float32Array(inputData), actualSampleRate, 24000)
          }
          
          const int16Data = new Int16Array(processedData.length)
          for (let i = 0; i < processedData.length; i++) {
            int16Data[i] = Math.max(-32768, Math.min(32767, processedData[i] * 32768))
          }
          
          audioBuffer.push(...Array.from(int16Data))
          
          const now = Date.now()
          if (now - lastSendTime >= sendInterval && audioBuffer.length > 0) {
            const bufferToSend = new Int16Array(audioBuffer)
            const base64Audio = arrayBufferToBase64(bufferToSend.buffer)
            
            try {
              if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({
                  type: 'audio',
                  audio: base64Audio
                }))
              }
            } catch (sendError) {
              console.error('❌ Error sending audio:', sendError)
              return
            }
            
            audioBuffer = []
            lastSendTime = now
          }
        } else if (!isRecordingRef.current) {
          audioBuffer = []
        }
      }

      source.connect(processor)
      const gainNode = inputAudioContext.createGain()
      gainNode.gain.value = 0
      gainNodeRef.current = gainNode
      processor.connect(gainNode)
      gainNode.connect(inputAudioContext.destination)
      
      console.log('Audio processor initialized and connected')
      setupVisualizer()

    } catch (error) {
      console.error('Error initializing audio:', error)
      throw new Error('Could not access microphone. Please check permissions.')
    }
  }

  const setupVisualizer = () => {
    // Cancel any existing animation
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height

    const draw = () => {
      // Always continue the animation loop
      animationFrameRef.current = requestAnimationFrame(draw)
      
      // Clear canvas
      const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--bg-primary')?.trim() || '#ffffff'
      ctx.fillStyle = bgColor
      ctx.fillRect(0, 0, width, height)
      
      // Only show bars when recording and analyser is available
      if (isRecordingRef.current && analyserRef.current && dataArrayRef.current) {
        // TypeScript workaround: getByteFrequencyData requires Uint8Array<ArrayBuffer>
        // Create a new Uint8Array from ArrayBuffer to satisfy TypeScript's strict type checking
        const buffer = new ArrayBuffer(dataArrayRef.current.length)
        const dataArray = new Uint8Array(buffer)
        analyserRef.current.getByteFrequencyData(dataArray)
        
        // Update audio levels array (smooth the visualization)
        const step = Math.floor(dataArray.length / 20)
        for (let i = 0; i < 20; i++) {
          const value = dataArray[i * step] || 0
          audioLevelsRef.current[i] = Math.max(audioLevelsRef.current[i] * 0.7, value / 255)
        }
        
        // Draw bars
        const gradient = ctx.createLinearGradient(0, 0, width, 0)
        gradient.addColorStop(0, '#3b82f6')
        gradient.addColorStop(0.5, '#8b5cf6')
        gradient.addColorStop(1, '#ec4899')
        ctx.fillStyle = gradient
        
        const barWidth = width / 20
        for (let i = 0; i < 20; i++) {
          const barHeight = audioLevelsRef.current[i] * height * 0.8
          ctx.fillRect(i * barWidth + 2, height - barHeight, barWidth - 4, barHeight)
        }
      } else {
        // When not recording, gradually fade out the bars
        for (let i = 0; i < 20; i++) {
          audioLevelsRef.current[i] = audioLevelsRef.current[i] * 0.9
          if (audioLevelsRef.current[i] > 0.01) {
            const gradient = ctx.createLinearGradient(0, 0, width, 0)
            gradient.addColorStop(0, '#3b82f6')
            gradient.addColorStop(0.5, '#8b5cf6')
            gradient.addColorStop(1, '#ec4899')
            ctx.fillStyle = gradient
            const barWidth = width / 20
            const barHeight = audioLevelsRef.current[i] * height * 0.8
            ctx.fillRect(i * barWidth + 2, height - barHeight, barWidth - 4, barHeight)
          }
        }
      }
    }

    draw()
  }

  const startConversation = async (retryCount = 0) => {
    const MAX_RETRIES = 3
    const RETRY_DELAY = 2000 // 2 seconds between retries
    
    try {
      // Reset audio stop flag for new conversation
      shouldStopAudioRef.current = false
      
      if (retryCount === 0) {
        setStatus('Connecting...')
        setStatusType('active')
      } else {
        setStatus(`Reconnecting... (Attempt ${retryCount + 1}/${MAX_RETRIES + 1})`)
        setStatusType('active')
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount))
      }

      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        notify.warning('Please log in to start a conversation')
        onClose()
        return
      }

      let userName = null
      let userId = null

      try {
        const payload = token.split('.')[1]
        const decodedPayload = JSON.parse(atob(payload))
        userName = decodedPayload.name || decodedPayload.userName || decodedPayload.username || decodedPayload.firstName
        userId = decodedPayload.userId
      } catch (e) {
        console.warn('Could not decode token payload:', e)
      }

      // Use the same protocol and host, connect to root path
      // Nginx will proxy WebSocket upgrade to Node.js server
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      // Connect to root path - nginx will handle WebSocket upgrade
      const wsUrl = `${protocol}//${window.location.host}/`
      console.log(`🔌 Connecting WebSocket to: ${wsUrl} (Attempt ${retryCount + 1})`)
      console.log('📍 Current location:', window.location.href)
      console.log('🔌 Protocol:', protocol)
      console.log('🔌 Host:', window.location.host)
      
      // Close any existing connection before creating a new one
      if (wsRef.current) {
        try {
          if (wsRef.current.readyState === WebSocket.CONNECTING || wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.close(1000, 'Reconnecting')
          }
        } catch (e) {
          console.warn('Error closing existing WebSocket:', e)
        }
        wsRef.current = null
      }
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws
      
      // Add connection timeout - increased to 30 seconds for better reliability
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error('⏱️ WebSocket connection timeout - readyState:', ws.readyState)
          try {
            if (ws.readyState === WebSocket.CONNECTING || ws.readyState === WebSocket.OPEN) {
              ws.close(1008, 'Connection timeout')
            }
          } catch (e) {
            console.warn('Error closing timed-out WebSocket:', e)
          }
          
          // Retry if we haven't exceeded max retries
          if (retryCount < MAX_RETRIES) {
            console.log(`🔄 Retrying connection (${retryCount + 1}/${MAX_RETRIES})...`)
            setTimeout(() => {
              startConversation(retryCount + 1)
            }, RETRY_DELAY * (retryCount + 1))
          } else {
            setStatus('Connection failed after multiple attempts. Please check your connection and try again.')
            setStatusType('error')
            notify.error('Unable to connect to the coach. Please check your internet connection and try again.')
            cleanup()
          }
        }
      }, 30000) // 30 second timeout
      
      ws.onopen = () => {
        clearTimeout(connectionTimeout)
        console.log('✅ WebSocket connected')
        console.log(`🎤 Starting conversation with coach: ${coach.name}`)
        
        // Start timer when connection is established
        sessionStartTimeRef.current = Date.now()
        setElapsedTime(0)
        timerIntervalRef.current = setInterval(() => {
          if (sessionStartTimeRef.current) {
            const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current) / 1000)
            setElapsedTime(elapsed)
          }
        }, 1000) // Update every second
        
        // Send start message immediately after connection
        try {
          const startMessage = {
            type: 'start',
            coachName: coach.name.trim(),
            apiType: apiType,
            token: token,
            coachId: coach.id,
            userName: userName,
            userId: userId
          }
          ws.send(JSON.stringify(startMessage))
          console.log('📤 Start message sent:', startMessage)
        } catch (error) {
          console.error('❌ Error sending start message:', error)
          setStatus('Error sending start message')
          setStatusType('error')
        }
      }
      
      ws.onerror = (error) => {
        clearTimeout(connectionTimeout)
        console.error('❌ WebSocket error:', error)
        console.error('❌ WebSocket readyState:', ws.readyState)
        console.error('❌ WebSocket URL:', wsUrl)
        
        // Don't set error status immediately - let onclose handle retry logic
        // This prevents showing error before retry logic kicks in
      }
      
      ws.onclose = (event) => {
        clearTimeout(connectionTimeout)
        console.log('❌ WebSocket closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean,
          readyState: ws.readyState
        })
        
        // Stop timer when connection closes
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current)
          timerIntervalRef.current = null
        }
        sessionStartTimeRef.current = null
        
        // Only show error and retry if:
        // 1. Not a clean close (code 1000)
        // 2. Not already connected
        // 3. Not a normal closure initiated by us (code 1001)
        if (event.code !== 1000 && !isConnectedRef.current && event.code !== 1001) {
          // Retry if we haven't exceeded max retries and it's not a user-initiated close
          if (retryCount < MAX_RETRIES && event.code !== 1000) {
            console.log(`🔄 Connection closed unexpectedly. Retrying... (${retryCount + 1}/${MAX_RETRIES})`)
            setTimeout(() => {
              startConversation(retryCount + 1)
            }, RETRY_DELAY * (retryCount + 1))
            return // Don't cleanup yet, we're retrying
          } else {
            setStatus(`Connection failed: ${event.reason || `Error code ${event.code}`}. Please try again.`)
            setStatusType('error')
          }
        } else if (event.code === 1000) {
          // Clean close - user or system initiated
          setStatus('Connection closed')
          setStatusType('idle')
        }
        
        // Only cleanup if we're not retrying
        if (retryCount >= MAX_RETRIES || event.code === 1000) {
          cleanup()
        }
      }

      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type !== 'audio') {
            console.log('📨 Received message:', data.type)
          }
          
          if (data.type === 'connected') {
            try {
              await initializeAudio()
              isConnectedRef.current = true
              isRecordingRef.current = true
              setIsConnected(true)
              setIsRecording(true)
              setStatus('Listening... Speak now!')
              setStatusType('recording')
              currentResponseIdRef.current = null
              console.log('✅ Audio initialized, recording started')
            } catch (audioError: any) {
              console.error('Audio initialization error:', audioError)
              setStatus(`Error: ${audioError.message}`)
              setStatusType('error')
              cleanup()
            }
          } else if (data.type === 'audio') {
            queueAudio(data.audio, data.responseId)
          } else if (data.type === 'greeting') {
            console.log('👋 Received greeting:', data.message)
            setStatus(`Connected with ${data.coachName}`)
            setStatusType('success')
          } else if (data.type === 'response_cancelled') {
            if (!data.responseId || data.responseId === currentResponseIdRef.current) {
              clearAudioQueue()
              currentResponseIdRef.current = null
            }
          } else if (data.type === 'error') {
            console.error('❌ Server error:', data.message)
            setStatus(`Error: ${data.message}`)
            setStatusType('error')
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current)
              saveTimeoutRef.current = null
            }
          } else if (data.type === 'conversation_saved') {
            console.log('✅ Conversation saved response received:', data)
            
            // Stop the timer when conversation is saved
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current)
              timerIntervalRef.current = null
            }
            sessionStartTimeRef.current = null
            
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current)
              saveTimeoutRef.current = null
            }
            setStatus('Conversation saved successfully!')
            setStatusType('success')
            setTimeout(() => {
              setStatus('Ready')
              setStatusType('idle')
            }, 3000)
            notify.success('Conversation saved successfully!')
          } else if (data.type === 'stopped') {
            isRecordingRef.current = false
            setIsRecording(false)
            setStatus('Stopped')
            setStatusType('idle')
          }
        } catch (parseError) {
          console.error('❌ Error parsing message:', parseError, event.data)
        }
      }


    } catch (error: any) {
      console.error('Error starting conversation:', error)
      setStatus(`Error: ${error.message}`)
      setStatusType('error')
      cleanup()
    }
  }

  const stopConversation = () => {
    // Stop audio immediately - this must happen first
    clearAudioQueue()
    
    // Stop the timer
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }
    
    // Stop recording
    isRecordingRef.current = false
    setIsRecording(false)
    setStatus('Stopped')
    setStatusType('idle')
    
    // Send stop messages to server
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      if (currentResponseIdRef.current) {
        wsRef.current.send(JSON.stringify({ 
          type: 'response.cancel',
          response_id: currentResponseIdRef.current
        }))
      }
      wsRef.current.send(JSON.stringify({ type: 'input_audio_buffer.clear' }))
      wsRef.current.send(JSON.stringify({ type: 'stop' }))
    }
    
    // Automatically save the conversation after stopping
    // Wait a moment for the stop message to be processed
    setTimeout(() => {
      saveConversation()
    }, 500)
  }

  const saveConversation = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      notify.warning('Not connected. Please start a conversation first.')
      return
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      notify.warning('Authentication token not found. Please log in again.')
      return
    }

    // Stop the timer when saving
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current)
      timerIntervalRef.current = null
    }

    // Calculate duration from elapsed time (in minutes)
    const durationMinutes = elapsedTime / 60

    setStatus('Saving conversation...')
    setStatusType('active')
    
    saveTimeoutRef.current = setTimeout(() => {
      console.error('⏱️ Save conversation timeout')
      setStatus('Save timeout - please try again')
      setStatusType('error')
          notify.error('Save conversation timed out. Please try again.')
    }, 10000)

    try {
      wsRef.current.send(JSON.stringify({
        type: 'save_conversation',
        token: token,
        coachId: coach.id,
        duration: durationMinutes // Send the timer duration in minutes
      }))
      console.log('✅ Save message sent successfully with duration:', durationMinutes, 'minutes')
    } catch (error: any) {
      console.error('❌ Error sending save message:', error)
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }
      setStatus('Error sending save request')
      setStatusType('error')
          notify.error('Failed to send save request: ' + error.message)
    }
  }

  if (!isOpen) return null

  return (
    <div className="conversation-modal-overlay" onClick={onClose}>
      <div className="conversation-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="conversation-modal-header">
          <div className="conversation-coach-info">
            {coach.avatar && (
              <img src={coach.avatar} alt={coach.name} className="conversation-coach-avatar" />
            )}
            <div>
              <h3>{coach.name}</h3>
              {coach.specialty && <p className="conversation-coach-specialty">{coach.specialty}</p>}
              {coach.tagline && <p className="conversation-coach-tagline">"{coach.tagline}"</p>}
            </div>
          </div>
          <div className="conversation-header-right">
            {isConnected && (
              <div className="conversation-timer">
                <span className="conversation-timer-label">Session Time:</span>
                <span className="conversation-timer-value">
                  {Math.floor(elapsedTime / 3600).toString().padStart(2, '0')}:
                  {Math.floor((elapsedTime % 3600) / 60).toString().padStart(2, '0')}:
                  {(elapsedTime % 60).toString().padStart(2, '0')}
                </span>
              </div>
            )}
            <button className="conversation-modal-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="conversation-modal-body">
          <div className="conversation-status">
            <div className={`conversation-status-indicator ${statusType}`}></div>
            <span className="conversation-status-text">{status}</span>
          </div>

          <div className="conversation-visualizer">
            <canvas ref={canvasRef} width={600} height={120}></canvas>
          </div>

          <div className="conversation-controls">
            {!isRecording ? (
              <button
                className="conversation-btn conversation-btn-primary"
                onClick={() => startConversation(0)}
                disabled={isConnected && !isRecording}
              >
                <Mic size={20} />
                <span>Start Conversation</span>
              </button>
            ) : (
              <button
                className="conversation-btn conversation-btn-secondary"
                onClick={stopConversation}
              >
                <Square size={20} />
                <span>Stop & Save</span>
              </button>
            )}
            
            {isConnected && (
              <button
                className="conversation-btn conversation-btn-save"
                onClick={saveConversation}
                disabled={!isRecording}
              >
                <Save size={20} />
                <span>Save Conversation</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConversationModal
