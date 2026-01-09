'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import CoachAvatar from '@/components/CoachAvatar'
import VoiceControl from '@/components/VoiceControl'
import TranscriptPane from '@/components/TranscriptPane'
import { playAudio, base64ToArrayBuffer, stopAudioPlayback } from '@/lib/audioClient'

type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface Turn {
  id: string
  speaker: 'user' | 'coach'
  text: string
  timestamp: Date
}

interface Coach {
  id: number
  name: string
  email: string
  specialty?: string
  description?: string
  tagline?: string
  avatar?: string
}

export default function CoachAlanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [sessionId] = useState(() => uuidv4())
  const [avatarState, setAvatarState] = useState<AvatarState>('idle') // Start in idle mode
  const [turns, setTurns] = useState<Turn[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [playingTurnId, setPlayingTurnId] = useState<string | null>(null)
  const [audioProgress, setAudioProgress] = useState<{ currentTime: number; duration: number } | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [isEndingSession, setIsEndingSession] = useState(false)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const processingLockRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentPlaybackRef = useRef<Promise<void> | null>(null)
  const isStoppedRef = useRef(false) // Track if system is stopped
  const currentPlayingTurnIdRef = useRef<string | null>(null) // Track current turn for callbacks

  // Check authentication on mount
  // Note: Middleware already protects this route, so if the page loads, user is authenticated
  // This check is just for extra safety and UX
  useEffect(() => {
    const checkAuth = async () => {
      // If token is in URL, middleware will handle it and redirect to remove it
      // Otherwise, verify the cookie token exists
      const token = searchParams.get('token')
      
      if (!token) {
        // Token should be in cookie if middleware already processed it
        // Just verify it exists via API for extra safety
        try {
          const response = await fetch('/api/verify-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: 'cookie' })
          })
          
          if (!response.ok) {
            // If verification fails, redirect to login
            const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://95.216.225.37:3000'
            window.location.href = `${dashboardUrl}/login?redirect=${encodeURIComponent(window.location.href)}`
            return
          }
        } catch (error) {
          // If API call fails, assume middleware will handle it on next request
          console.error('Auth check failed:', error)
        }
      }
      
      // If we reach here, authentication is valid
      setIsAuthenticated(true)
      
      // Fetch user email for email summary
      try {
        const userInfoResponse = await fetch('/api/user-info')
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json()
          setUserEmail(userInfo.email)
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error)
      }

      // Fetch coaches list
      try {
        const coachesResponse = await fetch('/api/coaches')
        if (coachesResponse.ok) {
          const coachesData = await coachesResponse.json()
          console.log('[Coaches] Fetched coaches:', coachesData.length, coachesData)
          setCoaches(coachesData)
          // Set default coach (Alan) if available, or first coach
          const alanCoach = coachesData.find((c: Coach) => c.name.toLowerCase().includes('alan')) || coachesData[0]
          if (alanCoach) {
            console.log('[Coaches] Setting default coach:', alanCoach.name, 'Avatar:', alanCoach.avatar)
            // Set selected coach immediately to avoid showing default Alan.jpg
            setSelectedCoach(alanCoach)
          }
        } else {
          console.error('[Coaches] Failed to fetch coaches, status:', coachesResponse.status)
        }
      } catch (error) {
        console.error('[Coaches] Failed to fetch coaches:', error)
      }
    }
    
    checkAuth()
  }, [searchParams])

  const handleStartTalking = async () => {
    // This is called when "Start Talking" button is clicked from idle state
    // First, get and play the greeting, then start listening
    
    console.log('[handleStartTalking] Starting greeting flow...')
    
    try {
      setAvatarState('thinking')
      setIsProcessing(true)
      
      console.log('[handleStartTalking] Calling greeting API...')
      // Call greeting API
      const response = await fetch('/api/greeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      })
      
      console.log('[handleStartTalking] Greeting API response status:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[handleStartTalking] Greeting API error:', errorData)
        throw new Error(errorData.message || errorData.error || 'Failed to get greeting')
      }
      
      const data = await response.json()
      console.log('[handleStartTalking] Greeting received, text:', data.coachText?.substring(0, 50))
      console.log('[handleStartTalking] Has audioBase64:', !!data.audioBase64, 'audioBase64 length:', data.audioBase64?.length)
      
      // Don't store greeting - removed for latency optimization
      
      // Play greeting audio (if available)
      if (data.audioBase64) {
        console.log('[handleStartTalking] Playing greeting audio...')
        setAvatarState('speaking')
        const audioBuffer = base64ToArrayBuffer(data.audioBase64)
        // No turn tracking - removed for latency optimization
        currentPlayingTurnIdRef.current = null
        setPlayingTurnId(null)
        setAudioProgress(null)
        
        const playbackPromise = playAudio(
          audioBuffer,
          data.audioMimeType || 'audio/mpeg'
        )
        currentPlaybackRef.current = playbackPromise
        
        try {
          await playbackPromise
          
          // After greeting finishes, reset state and prepare for listening
          if (!isStoppedRef.current) {
            currentPlaybackRef.current = null
            currentPlayingTurnIdRef.current = null
            setPlayingTurnId(null)
            setAudioProgress(null)
            setIsProcessing(false)
            
            // Reset stopped flag and set state to listening to start listening
            isStoppedRef.current = false
            setAvatarState('listening')
            // onInterrupt will be called by VoiceControl's useEffect when disabled becomes false
          }
        } catch (error) {
          // Audio was interrupted or failed
          if (!isStoppedRef.current) {
            currentPlaybackRef.current = null
            currentPlayingTurnIdRef.current = null
            setPlayingTurnId(null)
            setAudioProgress(null)
            setIsProcessing(false)
            
            // Still start listening even if greeting was interrupted
            isStoppedRef.current = false
            setAvatarState('listening')
          }
        }
      } else {
        console.log('[handleStartTalking] No audio available, using text-only greeting')
        setIsProcessing(false)
        // Start listening even if no audio
        isStoppedRef.current = false
        setAvatarState('listening')
      }
    } catch (error) {
      console.error('Error getting greeting:', error)
      // Show error to user, but still allow them to start talking
      const errorMessage = error instanceof Error ? error.message : 'Failed to get greeting'
      console.error('[handleStartTalking] Error details:', errorMessage)
      
      // Fallback greeting - don't store for latency optimization
      setIsProcessing(false)
      
      // Still start listening even if greeting API failed
      isStoppedRef.current = false
      setAvatarState('listening')
      
      // Show a non-blocking error message
      console.warn('Greeting API failed, using fallback. Error:', errorMessage)
    }
  }

  const handleSpeechStart = () => {
    // Only handle speech start if we're not stopped
    if (isStoppedRef.current || avatarState === 'idle') {
      return // Don't process if we're in stopped/idle state
    }
    
    // Stop Coach Alan immediately when user starts speaking
    stopAudioPlayback()
    
    // Clear highlighting state
    currentPlayingTurnIdRef.current = null
    setPlayingTurnId(null)
    setAudioProgress(null)
    
    // Cancel any ongoing API requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    // Cancel any ongoing playback promise
    currentPlaybackRef.current = null
    
    // Reset processing state so new speech can be handled immediately
    processingLockRef.current = false
    setIsProcessing(false)
    
    setAvatarState('listening')
  }

  const handleSpeechEnd = async (audioBlob: Blob) => {
    // CRITICAL: Don't process if we're in idle/stopped state
    // Check this FIRST before doing anything else
    if (isStoppedRef.current || avatarState === 'idle') {
      return
    }
    
    // Double-check: if avatarState changed to idle while we were waiting, abort
    // This prevents race conditions where state changes after the check above
    if (isStoppedRef.current) {
      return
    }
    
    // IMPORTANT: Allow interruption - if we're processing, cancel it and start new
    // This enables real-time interruption during thinking/speaking
    if (processingLockRef.current) {
      // Cancel the old processing
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
      // Stop any audio playback
      stopAudioPlayback()
      // Reset processing state to allow new processing
      processingLockRef.current = false
      setIsProcessing(false)
      // Continue to process the new speech below
    }

    // Create abort controller for this request
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    processingLockRef.current = true
    setIsProcessing(true)
    setAvatarState('thinking')

    try {
      // Minimal validation - check if empty or too small (Whisper needs at least ~0.25s = ~5000 bytes)
      if (audioBlob.size === 0 || audioBlob.size < 5000) {
        processingLockRef.current = false
        setIsProcessing(false)
        setAvatarState('listening')
        return
      }

      const formData = new FormData()
      formData.append('audio', audioBlob, 'recording.webm')
      formData.append('sessionId', sessionId)

      const response = await fetch('/api/voice-turn', {
        method: 'POST',
        body: formData,
        signal: abortController.signal, // Make request cancellable
      })
      
      // Check if request was aborted
      if (abortController.signal.aborted) {
        // Reset processing state if aborted
        processingLockRef.current = false
        setIsProcessing(false)
        if (!isStoppedRef.current) {
          setAvatarState('listening')
        }
        return
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        
        // Check for errors that should be silently handled
        const errorCode = errorData?.error?.code || errorData?.code || ''
        const errorType = errorData?.error?.type || errorData?.type || ''
        const errorMessage = errorData?.error?.message || errorData?.message || ''
        
        // Silently handle "audio too short" errors - these are common during normal conversation
        if (
          errorCode === 'audio_too_short' ||
          errorType === 'invalid_request_error' && errorMessage.includes('too short') ||
          errorMessage.includes('Minimum audio length') ||
          response.status === 400 && errorMessage.includes('short')
        ) {
          // Silently skip - this happens naturally during conversation
          // BUT reset processing state so new speech can be detected
          processingLockRef.current = false
          setIsProcessing(false)
          setAvatarState('listening')
          return
        }
        
        // Check for specific error types that DO need to be shown
        let userFriendlyMessage = errorMessage || 'Failed to process voice turn'
        
        if (response.status === 402) {
          // Payment Required - quota exceeded
          userFriendlyMessage = `OpenAI API quota exceeded. ${errorMessage} Please check your billing at https://platform.openai.com/account/billing`
        } else if (response.status === 429) {
          // Rate limit
          userFriendlyMessage = `Too many requests. Please wait a moment and try again.`
        } else if (response.status === 401) {
          // Authentication error
          userFriendlyMessage = `Authentication failed. Please check your API configuration.`
        }
        
        // Only show critical errors
        if (response.status === 402 || response.status === 401) {
          throw new Error(userFriendlyMessage)
        }
        
        // For other errors (including 500), silently return BUT reset processing state
        // This prevents infinite loops when AI service fails
        processingLockRef.current = false
        setIsProcessing(false)
        setAvatarState('listening')
        return
      }

      const data = await response.json()

      // Don't store turns - removed for latency optimization

      // Check if request was aborted before playing audio
      if (abortController.signal.aborted) {
        return
      }

      // Clear abort controller since request completed
      abortControllerRef.current = null

      // Check again if request was aborted before playing audio (double check)
      if (abortController.signal.aborted || isStoppedRef.current) {
        // Reset processing state before returning
        processingLockRef.current = false
        setIsProcessing(false)
        return
      }

      // Play coach audio - but it can be interrupted if user speaks
      if (data.audioBase64) {
        setAvatarState('speaking')
        const audioBuffer = base64ToArrayBuffer(data.audioBase64)
        
        // No turn tracking - removed for latency optimization
        currentPlayingTurnIdRef.current = null
        setPlayingTurnId(null)
        setAudioProgress(null)
        
        // Store playback promise so we can check if it was interrupted
        const playbackPromise = playAudio(
          audioBuffer, 
          data.audioMimeType || 'audio/mpeg'
        )
        currentPlaybackRef.current = playbackPromise
        
        // Play audio - if user speaks during this, stopAudioPlayback will be called
        try {
          await playbackPromise
          
          // Check if state changed during playback (interrupted or stopped)
          if (isStoppedRef.current || abortController.signal.aborted) {
            // Was stopped or interrupted - reset processing state
            processingLockRef.current = false
            setIsProcessing(false)
            return
          }
          
          // Verify the promise is still the current one (wasn't replaced by new audio)
          if (currentPlaybackRef.current === playbackPromise) {
            // Audio finished playing normally
            currentPlaybackRef.current = null
            // Clear highlighting state
            currentPlayingTurnIdRef.current = null
            setPlayingTurnId(null)
            setAudioProgress(null)
            // CRITICAL: Always reset processing state after audio completes
            processingLockRef.current = false
            setIsProcessing(false)
            setAvatarState('listening')
          } else {
            // Promise was replaced (interrupted) - still reset processing state
            currentPlaybackRef.current = null
            currentPlayingTurnIdRef.current = null
            setPlayingTurnId(null)
            setAudioProgress(null)
            processingLockRef.current = false
            setIsProcessing(false)
          }
        } catch (error) {
          // Audio was interrupted or failed
          // CRITICAL: Always reset processing state, regardless of what happened
          processingLockRef.current = false
          setIsProcessing(false)
          // Clear highlighting state
          currentPlayingTurnIdRef.current = null
          setPlayingTurnId(null)
          setAudioProgress(null)
          
          // Check if we should update state (only if still in speaking mode and not stopped)
          if (!isStoppedRef.current) {
            currentPlaybackRef.current = null
            setAvatarState('listening')
          }
        }
      } else {
        // Check state before setting to listening
        if (!isStoppedRef.current) {
          // Ensure processing state is reset
          processingLockRef.current = false
          setIsProcessing(false)
          setAvatarState('listening')
        }
      }
    } catch (error) {
      // Check if error is due to abortion
      if (error instanceof Error && error.name === 'AbortError') {
        // Request was cancelled - reset state and return
        processingLockRef.current = false
        setIsProcessing(false)
        if (!isStoppedRef.current) {
          setAvatarState('listening')
        }
        return
      }
      
      // Always reset processing state on error
      processingLockRef.current = false
      setIsProcessing(false)
      setAvatarState('listening') // Return to listening instead of idle
      
      // Only show critical errors (quota, auth) - not common processing errors
      const errorMessage = error instanceof Error ? error.message : ''
      if (errorMessage.includes('quota') || errorMessage.includes('billing') || errorMessage.includes('Authentication')) {
        alert(errorMessage)
      }
    } finally {
      // Always ensure processing state is reset, regardless of abort status
      // This is a safety net to prevent stuck states
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null
      }
      
      // CRITICAL: Always reset processing state in finally block as ultimate safety net
      // This ensures that even if any code path forgets to reset it, we still reset here
      // Only keep it as processing if we're actually stopped
      if (!isStoppedRef.current) {
        // Force reset processing state - don't check if it's already false
        processingLockRef.current = false
        setIsProcessing(false)
        
        // Also ensure we're in listening state if not stopped/thinking
        // (but don't override if we're already in the right state)
        if (avatarState === 'thinking') {
          setAvatarState('listening')
        }
      }
    }
  }

  // Show loading state while checking authentication
  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-white mb-4"></div>
            <h1 className="text-3xl font-bold text-white mb-2">Verifying Access...</h1>
            <p className="text-white/70">Please wait while we verify your authentication</p>
          </div>
        </div>
      </div>
    )
  }

  const handleBackToDashboard = () => {
    const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://95.216.225.37:3000'
    window.location.href = `${dashboardUrl}/coaches`
  }

  const handleCoachSelect = (coach: Coach) => {
    console.log('[CoachSelect] Selecting coach:', coach.name, 'Avatar:', coach.avatar)
    setSelectedCoach(coach)
  }

  // Get the avatar image path for selected coach
  const getCoachAvatarPath = () => {
    if (!selectedCoach) {
      return '/Alan.jpg'
    }

    if (selectedCoach.avatar) {
      // Extract filename from avatar path (e.g., /avatars/Alan-Wozniak-CEC.jpg -> Alan-Wozniak-CEC.jpg)
      let filename = selectedCoach.avatar
      
      // If it's a full URL, extract the filename
      if (filename.includes('/')) {
        filename = filename.split('/').pop() || filename
      }
      
      // Use local path from mycoach public folder
      // All avatars are now in /avatars/ folder in mycoach public directory
      const localPath = `/avatars/${filename}`
      console.log('[Avatar] Using local path:', localPath, 'for coach:', selectedCoach.name, 'from avatar:', selectedCoach.avatar)
      return localPath
    }
    
    // Default to Alan's image
    return '/Alan.jpg'
  }

  return (
    <div className="h-screen w-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="h-full w-full flex gap-6 p-6 relative z-10">
        {/* Left Sidebar - Coach List */}
        <div className="w-72 flex-shrink-0 h-full flex flex-col">
          <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 h-full flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
              <button
                onClick={handleBackToDashboard}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </button>
            </div>

            {/* Coach List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
              <h3 className="text-white/90 font-bold text-xs uppercase tracking-wider mb-4 px-2">Select Your Coach</h3>
              {coaches.length > 0 ? (
                coaches.map((coach) => (
                  <button
                    key={coach.id}
                    onClick={() => handleCoachSelect(coach)}
                    className={`w-full text-left p-4 rounded-xl transition-all duration-300 ${
                      selectedCoach?.id === coach.id
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-[1.02]'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white hover:scale-[1.01]'
                    } border border-white/10 hover:border-white/20`}
                  >
                    <div className="font-semibold text-sm mb-1">{coach.name}</div>
                    {coach.specialty && (
                      <div className="text-xs opacity-80 line-clamp-1">{coach.specialty}</div>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-white/60 text-sm p-4 text-center">Loading coaches...</div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 h-full flex flex-col min-w-0">
          <div className="bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 h-full flex flex-col overflow-hidden">
            {/* Header Section */}
            <div className="p-8 border-b border-white/10 text-center">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent mb-3">
                {selectedCoach?.name || 'Coach Alan'}
              </h1>
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                {selectedCoach?.tagline || selectedCoach?.description || 'Your strategic AI coach'}
              </p>
            </div>

            {/* Main Content - Centered */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 min-h-0 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center space-y-8 max-w-2xl w-full">
                {selectedCoach ? (
                  <CoachAvatar state={avatarState} imagePath={getCoachAvatarPath()} />
                ) : (
                  <div className="flex flex-col items-center space-y-6">
                    <div className="relative">
                      <div className="relative rounded-full border-4 border-gray-300 w-[240px] h-[240px] bg-gray-800/50 animate-pulse"></div>
                    </div>
                    <div className="text-center">
                      <p className="text-white text-xl font-semibold mb-1">Loading coach...</p>
                    </div>
                  </div>
                )}

                <VoiceControl
                  onSpeechStart={handleSpeechStart}
                  onSpeechEnd={handleSpeechEnd}
                  avatarState={avatarState}
                  onStartTalking={handleStartTalking}
                  onStop={() => {
                    stopAudioPlayback()
                    isStoppedRef.current = true
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort()
                      abortControllerRef.current = null
                    }
                    currentPlaybackRef.current = null
                    currentPlayingTurnIdRef.current = null
                    processingLockRef.current = false
                    setIsProcessing(false)
                    setPlayingTurnId(null)
                    setAudioProgress(null)
                    setAvatarState('idle')
                  }}
                  onInterrupt={() => {
                    isStoppedRef.current = false
                    if (avatarState === 'idle') {
                      setAvatarState('listening')
                    }
                  }}
                  disabled={avatarState === 'idle'}
                  isProcessing={isProcessing}
                  isRecording={avatarState === 'listening' || avatarState === 'speaking'}
                />

                {/* End Session Button */}
                {sessionId && (
                  <button
                    onClick={async () => {
                      if (isEndingSession) return
                      
                      if (!confirm('End this coaching session? You will receive an email summary with notes and action steps.')) {
                        return
                      }

                      setIsEndingSession(true)
                      
                      try {
                        stopAudioPlayback()
                        isStoppedRef.current = true
                        
                        if (abortControllerRef.current) {
                          abortControllerRef.current.abort()
                          abortControllerRef.current = null
                        }
                        
                        processingLockRef.current = false
                        setIsProcessing(false)
                        setPlayingTurnId(null)
                        setAudioProgress(null)
                        setAvatarState('idle')

                        const response = await fetch('/api/end-session', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ 
                            sessionId,
                            userEmail: userEmail || undefined
                          })
                        })

                        if (response.ok) {
                          const result = await response.json()
                          alert('Session ended! Check your email for a summary with notes and action steps.')
                          
                          const dashboardUrl = process.env.NEXT_PUBLIC_DASHBOARD_URL || 'https://95.216.225.37:3000'
                          window.location.href = `${dashboardUrl}/coaches`
                        } else {
                          const error = await response.json()
                          throw new Error(error.error || 'Failed to end session')
                        }
                      } catch (error) {
                        console.error('Error ending session:', error)
                        alert('Failed to end session. Please try again.')
                        setIsEndingSession(false)
                      }
                    }}
                    disabled={isEndingSession}
                    className={`
                      px-8 py-4 rounded-xl text-white font-semibold text-base
                      transition-all duration-300 shadow-lg hover:shadow-xl
                      ${isEndingSession 
                        ? 'bg-gray-500/50 cursor-not-allowed' 
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98]'
                      }
                    `}
                  >
                    {isEndingSession ? 'Ending Session...' : '📧 End Session & Get Email Summary'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

