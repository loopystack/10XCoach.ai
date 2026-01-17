import { useState, useEffect } from 'react'
import { X, Clock, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import ConversationModal from './ConversationModal'
import './QuickTryOut.css'

interface Coach {
  id: number
  name: string
  specialty?: string
  tagline?: string
  avatar?: string
}

const QuickTryOut = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState(120) // 2 minutes in seconds
  const [isActive, setIsActive] = useState(false)
  const navigate = useNavigate()

  // Default coach for Quick Try (can be randomized or use Morgan)
  const defaultCoach: Coach = {
    id: 1,
    name: 'Morgan',
    specialty: 'Chief of Staff & Coordination',
    tagline: 'Your personal guide, coordinator, and accountability partner',
    avatar: '/avatars/Morgan.png'
  }

  useEffect(() => {
    if (isOpen && isActive && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            setIsActive(false)
            return 0
          }
          return prev - 1
        })
      }, 1000)

      return () => clearInterval(timer)
    }
  }, [isOpen, isActive, timeRemaining])

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleStart = () => {
    setIsOpen(true)
    setTimeRemaining(120)
    setIsActive(true)
  }

  const handleClose = () => {
    setIsOpen(false)
    setIsActive(false)
    setTimeRemaining(120)
  }

  const handleTimeUp = () => {
    setIsActive(false)
    // Optionally show a message encouraging signup
    setTimeout(() => {
      handleClose()
      navigate('/signup', { state: { message: 'Sign up now to continue your coaching journey!' } })
    }, 3000)
  }

  useEffect(() => {
    if (timeRemaining === 0 && isActive) {
      handleTimeUp()
    }
  }, [timeRemaining])

  return (
    <>
      <div className="quick-try-out-widget">
        <button
          className="quick-try-button"
          onClick={handleStart}
          aria-label="Start 2-minute Quick Try"
        >
          <Sparkles size={20} />
          <span className="quick-try-text">
            <strong>Quick Try Out</strong>
            <small>2 minutes free</small>
          </span>
          <Clock size={18} />
        </button>
      </div>

      {isOpen && (
        <div className="quick-try-modal-overlay" onClick={handleClose}>
          <div className="quick-try-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="quick-try-header">
              <div className="quick-try-header-left">
                <div className="quick-try-badge">
                  <Sparkles size={16} />
                  <span>Quick Try Out</span>
                </div>
                <h2>Experience 10XCoach.ai in 2 Minutes</h2>
                <p>Have a conversation with {defaultCoach.name} to see how AI coaching works</p>
              </div>
              <button
                className="quick-try-close"
                onClick={handleClose}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="quick-try-timer-section">
              <div className="quick-try-timer">
                <Clock size={20} />
                <span className="timer-label">Time Remaining:</span>
                <span className={`timer-value ${timeRemaining <= 30 ? 'timer-warning' : ''}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
              {timeRemaining === 0 && (
                <div className="time-up-message">
                  <p>Your 2-minute trial has ended!</p>
                  <p>Sign up now to continue your coaching journey.</p>
                </div>
              )}
            </div>

            <div className="quick-try-conversation-wrapper">
              <ConversationModal
                coach={defaultCoach}
                isOpen={true}
                onClose={handleClose}
                apiType="openai"
              />
            </div>

            <div className="quick-try-footer">
              <p className="quick-try-footer-text">
                After your trial, <strong>sign up for free</strong> to continue with full access to all coaches and features.
              </p>
              <button
                className="quick-try-signup-btn"
                onClick={() => {
                  handleClose()
                  navigate('/signup')
                }}
              >
                Sign Up Free
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default QuickTryOut

