'use client'

import { useState, useEffect, useRef } from 'react'
import { VoiceActivityDetector } from '@/lib/voiceActivityDetection'

interface VoiceControlProps {
  onSpeechStart: () => void
  onSpeechEnd: (audioBlob: Blob) => Promise<void>
  onStop?: () => void // Called when stop button is clicked (for stopping playback/recording)
  disabled?: boolean
  isProcessing?: boolean
  isRecording?: boolean // Track if currently recording
  avatarState?: 'idle' | 'listening' | 'thinking' | 'speaking' // Current avatar state
  onInterrupt?: () => void // Called when user interrupts (for VAD reset)
  onStartTalking?: () => Promise<void> // Called when "Start Talking" button is clicked from idle state
}

export default function VoiceControl({ 
  onSpeechStart, 
  onSpeechEnd,
  onStop,
  disabled = false,
  isProcessing = false,
  isRecording = false,
  avatarState,
  onInterrupt,
  onStartTalking
}: VoiceControlProps) {
  const [isListening, setIsListening] = useState(false)
  const [localIsRecording, setLocalIsRecording] = useState(false)
  const vadRef = useRef<VoiceActivityDetector | null>(null)
  const isProcessingRef = useRef(false)
  const onSpeechStartRef = useRef(onSpeechStart)
  const disabledRef = useRef(disabled)
  const recordingStateRef = useRef(false)
  
  // Keep callback ref updated
  useEffect(() => {
    onSpeechStartRef.current = onSpeechStart
  }, [onSpeechStart])

  useEffect(() => {
    isProcessingRef.current = isProcessing
  }, [isProcessing])

  useEffect(() => {
    disabledRef.current = disabled
  }, [disabled])

  const startListening = async () => {
    if (isListening || disabled) return

    try {
      const vad = new VoiceActivityDetector()
      vadRef.current = vad

      await vad.start(
        // onSpeechStart
        () => {
          // Only ignore if truly disabled (stopped/idle state)
          // Always listen during speaking/thinking for interruptions!
          if (disabledRef.current) {
            // Reset recording state to ensure no UI updates
            setLocalIsRecording(false)
            recordingStateRef.current = false
            return
          }
          
          // Mark that we're recording
          setLocalIsRecording(true)
          recordingStateRef.current = true
          
          // Reset recording state if we're interrupting during processing
          if (isProcessingRef.current && vadRef.current) {
            vadRef.current.resetRecording()
          }
          
          // ALWAYS call onSpeechStart when user speaks - this handles interruptions!
          // Even if we're processing or speaking, interrupt and handle new speech
          onSpeechStartRef.current()
          
          // Notify about interruption - always notify, not just when processing
          if (onInterrupt) {
            onInterrupt()
          }
        },
        // onSpeechEnd
        async (audioBlob: Blob) => {
          // CRITICAL: Check disabled state using ref (always current value)
          // Don't process if disabled (stopped/idle state)
          if (disabledRef.current) {
            setLocalIsRecording(false)
            recordingStateRef.current = false
            return
          }
          
          // Mark that recording has ended
          setLocalIsRecording(false)
          recordingStateRef.current = false

          // Minimal validation - check if empty or too small (Whisper needs at least ~0.25s = ~5000 bytes)
          if (!audioBlob || audioBlob.size === 0 || audioBlob.size < 5000) {
            return
          }

          // IMPORTANT: Process new speech even if currently processing!
          // This allows interruption - onSpeechStart already cancelled the old processing
          // The handleSpeechEnd will handle cancelling old requests and starting new ones
          try {
            await onSpeechEnd(audioBlob)
          } catch (error) {
            // Silently handle errors - they're handled in the page component
          }
        }
      )

      setIsListening(true)
    } catch (error) {
      alert('Failed to access microphone. Please check permissions.')
    }
  }

  const stopListening = () => {
    if (vadRef.current) {
      vadRef.current.stop()
      vadRef.current = null
    }
    setIsListening(false)
  }

  // Don't auto-start listening on mount - wait for user to click "Start Talking"
  useEffect(() => {
    return () => {
      stopListening()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on unmount

  // Update listening state when disabled changes
  useEffect(() => {
    if (disabled) {
      // Stop listening if disabled (stop button was clicked) - FORCE STOP
      // CRITICAL: Stop VAD immediately and clear all state
      if (vadRef.current) {
        vadRef.current.stop()
        vadRef.current = null
      }
      setLocalIsRecording(false)
      recordingStateRef.current = false
      setIsListening(false)
      // Update ref immediately so any pending callbacks will see disabled=true
      disabledRef.current = true
    } else if (!disabled && !isListening && vadRef.current === null) {
      // Start listening if re-enabled (after start button was clicked)
      // Reset stopped state in parent component
      if (onInterrupt) {
        onInterrupt()
      }
      startListening()
    }
    // NOTE: We keep VAD running even when isProcessing is true
    // This allows interruptions during processing/speaking
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled])

  const handleToggle = async () => {
    console.log('[VoiceControl] handleToggle called, isListening:', isListening, 'avatarState:', avatarState)
    if (isListening) {
      stopListening()
      // When stopping manually via toggle, call onStop
      if (onStop) {
        onStop()
      }
    } else {
      // If we're starting from idle state, call onStartTalking first (to play greeting)
      // onStartTalking will handle setting state to listening after greeting plays
      if (avatarState === 'idle' && onStartTalking) {
        console.log('[VoiceControl] Starting from idle, calling onStartTalking...')
        try {
          await onStartTalking()
          console.log('[VoiceControl] onStartTalking completed')
        } catch (error) {
          console.error('[VoiceControl] Error in onStartTalking:', error)
        }
        // onStartTalking will call onInterrupt internally after greeting finishes
        return
      }
      
      // When starting (including after being stopped), reset any stopped state in parent
      // This will change avatarState to 'listening', making disabled=false
      // The useEffect watching 'disabled' will then start listening
      if (onInterrupt) {
        onInterrupt() // This will reset stopped flag in parent and change avatarState to 'listening'
      }
      // Don't call startListening() here - let useEffect handle it when disabled becomes false
    }
  }

  const handleStop = () => {
    // Stop everything - complete shutdown
    // CRITICAL: Set disabled ref FIRST before stopping VAD to prevent race conditions
    disabledRef.current = true
    
    if (vadRef.current) {
      vadRef.current.stop()
      vadRef.current = null
    }
    
    setLocalIsRecording(false)
    recordingStateRef.current = false
    setIsListening(false)
    
    // Call onStop to handle stopping Coach Alan's audio and resetting parent state
    if (onStop) {
      onStop()
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex items-center gap-3">
        {/* Main Listening Button */}
        <button
          onClick={handleToggle}
          disabled={false} // Never disable - always allow start/stop
          className={`
            px-8 py-4 rounded-full text-white font-semibold text-lg
            transition-all duration-200 transform
            ${
              isListening
                ? isProcessing
                  ? 'bg-yellow-500 hover:bg-yellow-600 shadow-lg' // Processing but still listening
                  : 'bg-green-500 hover:bg-green-600 scale-110 shadow-lg animate-pulse' // Listening and ready
                : 'bg-blue-500 hover:bg-blue-600 hover:scale-105 shadow-md'
            }
            disabled:opacity-50 disabled:cursor-not-allowed
          `}
        >
          {isListening
            ? avatarState === 'thinking' || avatarState === 'speaking'
              ? 'Listening...' // Show "Listening..." during thinking/speaking to indicate interruption is possible
              : isProcessing
              ? 'Processing...' // Show processing if actively processing (shouldn't happen often)
              : 'Listening...' // Show listening if VAD is active and ready
            : 'Start Talking'}
        </button>

        {/* Stop Button - Always visible when listening (even during processing/speaking) */}
        {isListening && (
          <button
            onClick={handleStop}
            className={`
              px-6 py-4 rounded-full text-white font-semibold text-lg
              transition-all duration-200 transform hover:scale-105
              shadow-lg
              ${
                (localIsRecording || isRecording)
                  ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                  : 'bg-red-600 hover:bg-red-700'
              }
            `}
            title="Stop everything - listening, processing, and audio"
          >
            ⏹️ Stop
          </button>
        )}
      </div>
      
      {isListening && !isProcessing && !disabled && !(localIsRecording || isRecording) && (
        <div className="text-sm text-white/70">
          🎤 Speak naturally - I'll detect when you're talking
        </div>
      )}
      
      {(localIsRecording || isRecording) && isListening && !disabled && (
        <div className="text-sm text-red-300 animate-pulse">
          🔴 Recording... Click Stop when finished
        </div>
      )}
    </div>
  )
}
