'use client'

import { useEffect, useRef, useMemo } from 'react'

interface Turn {
  id: string
  speaker: 'user' | 'coach'
  text: string
  timestamp: Date
}

interface TranscriptPaneProps {
  turns: Turn[]
  playingTurnId?: string | null
  audioProgress?: { currentTime: number; duration: number } | null
}

// Helper function to split text into words while preserving spaces and punctuation
function splitIntoWords(text: string): string[] {
  // Match words and preserve spaces/punctuation
  const words: string[] = []
  const regex = /(\S+)(\s*)/g
  let match
  
  while ((match = regex.exec(text)) !== null) {
    words.push(match[1] + match[2]) // word + trailing spaces
  }
  
  return words.length > 0 ? words : [text]
}

// Count syllables in a word (approximation)
function countSyllables(word: string): number {
  word = word.toLowerCase().trim()
  if (word.length <= 3) return 1
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
  word = word.replace(/^y/, '')
  const matches = word.match(/[aeiouy]{1,2}/g)
  return matches ? Math.max(1, matches.length) : 1
}

// Calculate word timings based on text and audio duration
// Uses realistic speaking rate: ~150-180 words per minute, accounting for syllables and pauses
function calculateWordTimings(text: string, duration: number): number[] {
  const words = splitIntoWords(text)
  if (words.length === 0 || duration === 0 || !isFinite(duration)) return []
  
  // Calculate total "time units" based on syllables and punctuation
  const timeUnits: number[] = []
  let totalUnits = 0
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i].trim()
    // Base time per word (even short words take some time)
    let units = 1
    
    // Add time based on syllables (more syllables = more time)
    const syllables = countSyllables(word.replace(/[^\w]/g, ''))
    units += syllables * 0.5
    
    // Add extra time for punctuation (natural pauses)
    if (/[.!?]/.test(word)) {
      units += 1.5 // Longer pause for sentence endings
    } else if (/[,;:]/.test(word)) {
      units += 0.8 // Medium pause for commas/semicolons
    } else if (/[-–—]/.test(word)) {
      units += 0.5 // Short pause for dashes
    }
    
    timeUnits.push(units)
    totalUnits += units
  }
  
  // Distribute actual duration across time units
  const timings: number[] = []
  let accumulatedTime = 0
  
  for (let i = 0; i < words.length; i++) {
    timings.push(accumulatedTime)
    const wordDuration = (timeUnits[i] / totalUnits) * duration
    accumulatedTime += wordDuration
  }
  
  return timings
}

export default function TranscriptPane({ turns, playingTurnId, audioProgress }: TranscriptPaneProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new turns are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [turns])

  // Render text with word-by-word highlighting for coach turns
  const renderTextWithHighlighting = (turn: Turn) => {
    if (turn.speaker !== 'coach' || !playingTurnId || turn.id !== playingTurnId || !audioProgress) {
      return <div className="text-white">{turn.text}</div>
    }

    // Don't render highlighting if duration is invalid
    if (!audioProgress.duration || !isFinite(audioProgress.duration) || audioProgress.duration <= 0) {
      return <div className="text-white">{turn.text}</div>
    }

    const words = splitIntoWords(turn.text)
    const wordTimings = calculateWordTimings(turn.text, audioProgress.duration)
    const currentTime = audioProgress.currentTime

    // Don't highlight if timings aren't ready
    if (wordTimings.length === 0 || wordTimings.length !== words.length) {
      return <div className="text-white">{turn.text}</div>
    }

    // Find which word should be highlighted
    let highlightedWordIndex = -1
    for (let i = 0; i < wordTimings.length; i++) {
      const wordStart = wordTimings[i]
      const wordEnd = i < wordTimings.length - 1 ? wordTimings[i + 1] : audioProgress.duration
      
      if (currentTime >= wordStart && currentTime < wordEnd) {
        highlightedWordIndex = i
        break
      }
    }
    
    // If we're past all words, highlight the last one
    if (highlightedWordIndex === -1 && wordTimings.length > 0 && currentTime >= wordTimings[wordTimings.length - 1]) {
      highlightedWordIndex = wordTimings.length - 1
    }

    return (
      <div className="text-white">
        {words.map((word, index) => (
          <span
            key={index}
            className={
              index === highlightedWordIndex
                ? 'bg-yellow-400/50 text-yellow-100 font-semibold rounded px-1 transition-all duration-150'
                : ''
            }
          >
            {word}
          </span>
        ))}
      </div>
    )
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="bg-white/10 backdrop-blur-md rounded-lg p-6 max-h-96 overflow-y-auto"
    >
      <h3 className="text-white text-xl font-semibold mb-4">Conversation</h3>
      {turns.length === 0 ? (
        <p className="text-white/70 italic">No conversation yet. Start talking to Coach Alan!</p>
      ) : (
        <div className="space-y-4">
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`p-3 rounded-lg ${
                turn.speaker === 'user'
                  ? 'bg-blue-500/20 ml-8 text-right'
                  : 'bg-green-500/20 mr-8'
              }`}
            >
              <div className="text-xs text-white/60 mb-1">
                {turn.speaker === 'user' ? 'You' : 'Coach Alan'}
              </div>
              {renderTextWithHighlighting(turn)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

