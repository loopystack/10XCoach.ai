import { useState } from 'react'
import { Clock, Sparkles } from 'lucide-react'
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

  // Default coach for Quick Try (can be randomized or use Morgan)
  const defaultCoach: Coach = {
    id: 1,
    name: 'Morgan',
    specialty: 'Chief of Staff & Coordination',
    tagline: 'Your personal guide, coordinator, and accountability partner',
    avatar: '/avatars/Morgan.png'
  }

  const handleClose = () => {
    setIsOpen(false)
  }

  return (
    <>
      <div className="quick-try-out-widget">
        <button
          className="quick-try-button"
          onClick={() => setIsOpen(true)}
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
        <ConversationModal
          coach={defaultCoach}
          isOpen={true}
          onClose={handleClose}
          apiType="openai"
        />
      )}
    </>
  )
}

export default QuickTryOut

