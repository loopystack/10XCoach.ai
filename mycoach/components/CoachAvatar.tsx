'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'

type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking'

interface CoachAvatarProps {
  state: AvatarState
  imagePath?: string
}

export default function CoachAvatar({ state, imagePath = '/Alan.jpg' }: CoachAvatarProps) {
  const [pulse, setPulse] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [currentImagePath, setCurrentImagePath] = useState(imagePath)

  useEffect(() => {
    if (state === 'listening' || state === 'speaking') {
      const interval = setInterval(() => setPulse((p) => !p), 1000)
      return () => clearInterval(interval)
    }
  }, [state])

  // Update image path and reset error when imagePath prop changes
  useEffect(() => {
    if (imagePath) {
      console.log('[CoachAvatar] Image path changed to:', imagePath)
      setCurrentImagePath(imagePath)
      setImageError(false)
    }
  }, [imagePath])

  const getStateText = () => {
    switch (state) {
      case 'listening':
        return 'Listening...'
      case 'thinking':
        return 'Thinking...'
      case 'speaking':
        return 'Speaking...'
      default:
        return 'Ready to talk'
    }
  }

  const getStateColor = () => {
    switch (state) {
      case 'listening':
        return 'border-blue-400'
      case 'thinking':
        return 'border-yellow-400'
      case 'speaking':
        return 'border-green-400'
      default:
        return 'border-gray-300'
    }
  }

  // All images are now local (from mycoach public folder), so use Next.js Image component
  // Fallback image path - only use if we have an error
  const fallbackImage = '/Alan.jpg'
  const displayImage = imageError ? fallbackImage : currentImagePath

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative">
        <div
          className={`relative rounded-full border-4 transition-all duration-500 ${
            pulse && (state === 'listening' || state === 'speaking')
              ? `${getStateColor()} scale-105 shadow-2xl`
              : `${getStateColor()} scale-100 shadow-xl`
          }`}
          style={{
            boxShadow: state === 'listening' 
              ? '0 0 30px rgba(59, 130, 246, 0.5)' 
              : state === 'speaking'
              ? '0 0 30px rgba(34, 197, 94, 0.5)'
              : '0 0 20px rgba(255, 255, 255, 0.1)'
          }}
        >
          <Image
            key={currentImagePath}
            src={displayImage}
            alt="Coach"
            width={240}
            height={240}
            className="rounded-full object-cover"
            priority
            onError={() => {
              if (!imageError) {
                console.error('[CoachAvatar] Image load error for:', displayImage, 'falling back to default')
                setImageError(true)
              }
            }}
            onLoad={() => {
              if (imageError) {
                setImageError(false)
              }
            }}
          />
          {(state === 'listening' || state === 'speaking') && (
            <>
              <div
                className={`absolute inset-0 rounded-full animate-ping ${
                  state === 'listening' ? 'bg-blue-400' : 'bg-green-400'
                } opacity-30`}
              />
              <div
                className={`absolute -inset-2 rounded-full ${
                  state === 'listening' ? 'bg-blue-400/20' : 'bg-green-400/20'
                } animate-pulse`}
              />
            </>
          )}
        </div>
      </div>
      <div className="text-center">
        <p className="text-white text-xl font-semibold mb-1">{getStateText()}</p>
        {state === 'idle' && (
          <p className="text-white/60 text-sm">Click "Start Talking" to begin</p>
        )}
      </div>
    </div>
  )
}

