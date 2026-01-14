import { useEffect, useRef, useState } from 'react'
import { X, Mic, Square, Save } from 'lucide-react'
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
  const [statusType, setStatusType] = useState<'idle' | 'active' | 'success' | 'error'>('idle')
  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const mediaStreamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioQueueRef = useRef<ArrayBuffer[]>([])
  const isPlayingAudioRef = useRef(false)

  useEffect(() => {
    if (!isOpen) {
      // Cleanup when modal closes
      cleanup()
      return
    }

    return () => {
      cleanup()
    }
  }, [isOpen])

  const playAudioResponse = async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) return
    
    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData)
      const source = audioContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(audioContextRef.current.destination)
      source.start(0)
    } catch (err) {
      console.error('Error playing audio:', err)
    }
  }

  const processAudioQueue = async () => {
    if (isPlayingAudioRef.current || audioQueueRef.current.length === 0) return
    
    isPlayingAudioRef.current = true
    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()
      if (audioData) {
        await playAudioResponse(audioData)
      }
    }
    isPlayingAudioRef.current = false
  }

  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop())
      mediaStreamRef.current = null
    }
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
    audioQueueRef.current = []
    isPlayingAudioRef.current = false
    setIsConnected(false)
    setIsRecording(false)
    setStatus('Ready to start')
    setStatusType('idle')
  }

  const getWebSocketUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.host
    return `${protocol}//${host}/`
  }

  const startConversation = async () => {
    try {
      setStatus('Connecting...')
      setStatusType('active')

      // Get token
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      if (!token) {
        alert('Please log in to start a conversation')
        onClose()
        return
      }

      // Connect WebSocket
      const wsUrl = getWebSocketUrl()
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('✅ WebSocket connected')
        setIsConnected(true)
        
        // Request microphone access
        navigator.mediaDevices.getUserMedia({ audio: true })
          .then(stream => {
            mediaStreamRef.current = stream
            
            // Setup audio context
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
            audioContextRef.current = audioContext
            
            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 256
            analyserRef.current = analyser
            source.connect(analyser)
            
            // Setup audio processor for streaming
            const processor = audioContext.createScriptProcessor(4096, 1, 1)
            processorRef.current = processor
            processor.onaudioprocess = (e) => {
              if (!isRecording || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return
              
              const inputData = e.inputBuffer.getChannelData(0)
              const pcm16 = new Int16Array(inputData.length)
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768))
              }
              
              // Send audio to server
              wsRef.current.send(JSON.stringify({
                type: 'audio',
                audio: Array.from(pcm16)
              }))
            }
            source.connect(processor)
            processor.connect(audioContext.destination)
            
            // Start visualization
            startVisualization()
            
            // Send start message
            ws.send(JSON.stringify({
              type: 'start',
              token: token,
              coachId: coach.id,
              coachName: coach.name,
              apiType: apiType
            }))
            
            setIsRecording(true)
            setStatus('Connected - Start speaking')
            setStatusType('active')
          })
          .catch(err => {
            console.error('Microphone access denied:', err)
            alert('Microphone access is required for voice conversations')
            setStatus('Microphone access denied')
            setStatusType('error')
          })
      }

      ws.onmessage = async (event) => {
        try {
          // Check if it's binary audio data
          if (event.data instanceof ArrayBuffer) {
            await playAudioResponse(event.data)
            return
          }
          
          const message = JSON.parse(event.data)
          console.log('📨 WebSocket message:', message.type)
          
          switch (message.type) {
            case 'connected':
              setStatus('Connected')
              setStatusType('active')
              break
            case 'error':
              setStatus(message.message || 'Error occurred')
              setStatusType('error')
              break
            case 'conversation_saved':
              setStatus('Conversation saved successfully')
              setStatusType('success')
              setTimeout(() => {
                setStatus('Ready to start')
                setStatusType('idle')
              }, 2000)
              break
            case 'stopped':
              setIsRecording(false)
              setStatus('Stopped')
              setStatusType('idle')
              break
            case 'audio_response':
              // Queue audio for playback
              if (event.data instanceof ArrayBuffer) {
                audioQueueRef.current.push(event.data)
                processAudioQueue()
              }
              break
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setStatus('Connection error')
        setStatusType('error')
      }

      ws.onclose = () => {
        console.log('WebSocket closed')
        setIsConnected(false)
        setIsRecording(false)
        setStatus('Disconnected')
        setStatusType('idle')
      }

    } catch (error) {
      console.error('Error starting conversation:', error)
      setStatus('Failed to start conversation')
      setStatusType('error')
    }
  }

  const stopConversation = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }))
    }
    setIsRecording(false)
    setStatus('Stopped')
    setStatusType('idle')
  }

  const saveConversation = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      alert('Not connected. Please start a conversation first.')
      return
    }

    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    if (!token) {
      alert('Authentication token not found')
      return
    }

    setStatus('Saving conversation...')
    setStatusType('active')
    
    wsRef.current.send(JSON.stringify({
      type: 'save_conversation',
      token: token,
      coachId: coach.id
    }))
  }

  const startVisualization = () => {
    if (!canvasRef.current || !analyserRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const analyser = analyserRef.current
    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!isRecording || !analyserRef.current) return

      animationFrameRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(dataArray)

      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const barWidth = (canvas.width / bufferLength) * 2.5
      let barHeight
      let x = 0

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height

        const gradient = ctx.createLinearGradient(0, canvas.height - barHeight, 0, canvas.height)
        gradient.addColorStop(0, '#3b82f6')
        gradient.addColorStop(1, '#8b5cf6')
        ctx.fillStyle = gradient

        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight)
        x += barWidth + 1
      }
    }

    draw()
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
          <button className="conversation-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
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
                onClick={startConversation}
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
                <span>Stop</span>
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

