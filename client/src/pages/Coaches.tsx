import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Sparkles, Mic, HelpCircle, X } from 'lucide-react'
import { isAuthenticated, api } from '../utils/api'
import { notify } from '../utils/notification'
import ConversationModal from '../components/ConversationModal'
import './PageStyles.css'

interface Coach {
  id: number
  name: string
  email: string
  role?: string
  specialty?: string
  description?: string
  tagline?: string
  avatar?: string
}

// Discovery Starter Questions by Pillar
const STARTER_QUESTIONS: Record<string, string[]> = {
  STRATEGY: [
    'Can you help me figure out what I should really be focusing on right now?',
    'Where do you think my strategy is unclear or holding me back?',
    'Am I aiming at the right opportunities for where my business is today?',
    'What strategic decisions am I avoiding that I probably need to make?',
    'How do I simplify my strategy without slowing down growth?'
  ],
  SALES: [
    'Where do you see my sales process breaking down?',
    'Why do some deals move forward while others stall out?',
    'What\'s the biggest thing stopping my sales from being more consistent?',
    'How can I improve my close rate without adding more pressure?',
    'What should I fix first if I want more predictable revenue?'
  ],
  MARKETING: [
    'Which of my marketing efforts are actually working right now?',
    'Is my message clear enough for the customers I want to attract?',
    'Where am I wasting time or money on marketing?',
    'How can I better connect my marketing to actual sales?',
    'What marketing change would give me the biggest return the fastest?'
  ],
  OPERATIONS: [
    'What parts of my business feel harder than they should be?',
    'Where am I missing systems or processes that are slowing things down?',
    'What am I personally doing that the business shouldn\'t rely on me for?',
    'How ready is my operation to handle growth?',
    'If I wanted things to run smoother, where should I start?'
  ],
  CULTURE: [
    'How healthy does my team culture look from the outside?',
    'Where do you see misalignment or lack of accountability showing up?',
    'What behaviors am I unintentionally encouraging or allowing?',
    'How can I build a culture where people take more ownership?',
    'What should I focus on to grow stronger leaders on my team?'
  ],
  CUSTOMER_CENTRICITY: [
    'How well do I really understand my customers\' needs?',
    'Where might customers be getting frustrated or confused?',
    'What could I do to keep customers coming back more often?',
    'How well am I actually using customer feedback?',
    'What would my customers say I need to improve the most?'
  ],
  FINANCE: [
    'How healthy are my finances, really?',
    'Which numbers should I be paying closer attention to?',
    'Where am I most exposed financially without realizing it?',
    'What can I do to improve cash flow and profitability?',
    'What financial decisions today will matter most in the long run?'
  ],
  EXIT_STRATEGY: [
    'If I wanted to exit someday, how prepared is my business right now?',
    'What\'s limiting the value of my business today?',
    'How dependent is the business on me personally?',
    'What should I start fixing now to keep exit options open?',
    'What would a realistic exit timeline look like for my situation?'
  ]
}

const Coaches = () => {
  const navigate = useNavigate()
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedCoach, setSelectedCoach] = useState<number | null>(null)
  const [conversationModalOpen, setConversationModalOpen] = useState(false)
  const [selectedCoachForConversation, setSelectedCoachForConversation] = useState<Coach | null>(null)
  const [conversationApiType, setConversationApiType] = useState<'openai' | 'elevenlabs'>('openai')
  const [starterQuestionsModalOpen, setStarterQuestionsModalOpen] = useState(false)
  const [selectedCoachForQuestions, setSelectedCoachForQuestions] = useState<Coach | null>(null)

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const data = await api.get('/api/coaches')
        if (Array.isArray(data)) {
          setCoaches(data)
          if (data.length === 0) {
            console.warn('⚠️ No coaches returned from API. Check if coaches are set to active=true in database.')
          }
        } else {
          console.error('❌ Invalid coaches data format:', data)
          setCoaches([])
        }
      } catch (err: any) {
        console.error('❌ Error fetching coaches:', err)
        setCoaches([])
      }
    }
    fetchCoaches()
  }, [])

  // Handle page restoration from bfcache (back/forward cache)
  // This ensures the component works correctly when user navigates back
  useEffect(() => {
    const handlePageshow = async (event: PageTransitionEvent) => {
      // If page was restored from bfcache, refresh the coaches data
      if (event.persisted) {
        try {
          const data = await api.get('/api/coaches')
          if (Array.isArray(data)) {
            setCoaches(data)
          } else {
            console.error('❌ Invalid coaches data format:', data)
            setCoaches([])
          }
        } catch (err) {
          console.error('Error refreshing coaches:', err)
        }
      }
    }

    window.addEventListener('pageshow', handlePageshow)
    return () => window.removeEventListener('pageshow', handlePageshow)
  }, [])

  const handleStarterQuestions = (coach: Coach) => {
    setSelectedCoachForQuestions(coach)
    setStarterQuestionsModalOpen(true)
  }

  const getStarterQuestions = (coach: Coach): string[] => {
    if (!coach.role) return []
    const role = coach.role.toUpperCase()
    return STARTER_QUESTIONS[role] || []
  }

  const handleTalkToCoach = async (coachId: number) => {
    // Force fresh token retrieval to avoid stale state issues
    const token = localStorage.getItem('token') || sessionStorage.getItem('token')
    
    if (!token || !isAuthenticated()) {
      // Redirect to login if not authenticated
      navigate('/login', { state: { from: `/coaches?coach=${coachId}` } })
      return
    }
    
    // Check user access before allowing conversation
    try {
      const billingStatus = await api.get('/api/billing/status')
      if (!billingStatus.hasAccess) {
        notify.warning('Your free trial has ended. Please upgrade to continue using this feature.')
        navigate('/plans', { state: { from: 'talk-to-coach', coachId } })
        return
      }
    } catch (error: any) {
      // If access check fails, still allow but log the error
      console.error('Failed to check billing status:', error)
      if (error.requiresUpgrade) {
        notify.warning('Your free trial has ended. Please upgrade to continue.')
        navigate('/plans', { state: { from: 'talk-to-coach', coachId } })
        return
      }
    }
    
    // Find the coach to get their name
    const coach = coaches.find(c => c.id === coachId)
    if (!coach) {
      console.error('Coach not found')
      notify.error('Coach not found. Please try again.')
      return
    }
    
    // Open conversation modal instead of redirecting
    setSelectedCoachForConversation(coach)
    setConversationApiType('openai')
    setConversationModalOpen(true)
  }

  const filteredCoaches = selectedCoach 
    ? coaches.filter(coach => coach.id === selectedCoach)
    : coaches

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>10X Coaches</h1>
        <p className="page-subtitle">Meet your elite team of AI-powered business coaches</p>
      </div>

      <div className="content-card">
        <div className="section-header">
          <h2>Our Expert Coaches</h2>
          <select 
            className="coach-select"
            value={selectedCoach || ''}
            onChange={(e) => setSelectedCoach(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">All Coaches</option>
            {coaches.map(coach => (
              <option key={coach.id} value={coach.id}>
                {coach.name}
              </option>
            ))}
          </select>
        </div>

        {filteredCoaches.length === 0 ? (
          <div className="coaches-empty-state">
            <Sparkles size={48} />
            <h3>No Coaches Available</h3>
            <p>
              No coaches are currently available. This may be because:
            </p>
            <ul>
              <li>Coaches are not set to active in the database</li>
              <li>The database connection is not working</li>
              <li>The API endpoint is not responding correctly</li>
            </ul>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem', color: '#666' }}>
              Please check the server logs or contact support if this issue persists.
            </p>
          </div>
        ) : (
          <div className="coaches-grid">
            {filteredCoaches.map(coach => (
            <div key={coach.id} className="coach-card">
              <div className="coach-avatar-wrapper">
                {coach.avatar ? (
                  <img 
                    src={coach.avatar} 
                    alt={coach.name}
                    className="coach-avatar-image"
                    onError={(e) => {
                      // Fallback if image fails to load
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const fallback = target.nextElementSibling as HTMLElement;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className="coach-avatar-fallback" style={{ display: coach.avatar ? 'none' : 'flex' }}>
                  <Sparkles size={80} />
                </div>
              </div>
              <div className="coach-card-content">
                <h3>{coach.name}</h3>
                {coach.specialty && (
                  <div className="coach-specialty">{coach.specialty}</div>
                )}
                {coach.description && (
                  <p className="coach-description">{coach.description}</p>
                )}
                {coach.tagline && (
                  <div className="coach-tagline">"{coach.tagline}"</div>
                )}
                <div className="coach-email">
                  <Mail size={16} />
                  <span>{coach.email}</span>
                </div>
                <button
                  className="coach-talk-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTalkToCoach(coach.id)
                  }}
                >
                  <Mic size={18} />
                  <span>Talk to {coach.name.split(' ')[0]}</span>
                </button>
                {getStarterQuestions(coach).length > 0 && (
                  <button
                    className="coach-talk-button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStarterQuestions(coach)
                    }}
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      marginTop: '8px'
                    }}
                  >
                    <HelpCircle size={18} />
                    <span>STARTER QUESTIONS</span>
                  </button>
                )}
              </div>
            </div>
          ))}
          </div>
        )}
      </div>

      {/* Conversation Modal */}
      {selectedCoachForConversation && (
        <ConversationModal
          coach={selectedCoachForConversation}
          isOpen={conversationModalOpen}
          onClose={() => {
            setConversationModalOpen(false)
            setSelectedCoachForConversation(null)
          }}
          apiType={conversationApiType}
        />
      )}

      {/* Starter Questions Modal */}
      {starterQuestionsModalOpen && selectedCoachForQuestions && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}
          onClick={() => {
            setStarterQuestionsModalOpen(false)
            setSelectedCoachForQuestions(null)
          }}
        >
          <div
            style={{
              background: 'var(--bg-primary, #ffffff)',
              color: 'var(--text-primary, #1f2937)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '600px',
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-color, #e5e7eb)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary, #1f2937)' }}>
                Starter Questions for {selectedCoachForQuestions.name}
              </h2>
              <button
                onClick={() => {
                  setStarterQuestionsModalOpen(false)
                  setSelectedCoachForQuestions(null)
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary, #6b7280)',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--gray-100, #f3f4f6)'
                  e.currentTarget.style.color = 'var(--text-primary, #1f2937)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-secondary, #6b7280)'
                }}
              >
                <X size={24} />
              </button>
            </div>
            
            <p style={{ marginBottom: '24px', color: 'var(--text-secondary, #6b7280)', fontSize: '14px' }}>
              Use these starter questions to begin your conversation with {selectedCoachForQuestions.name.split(' ')[0]}:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {getStarterQuestions(selectedCoachForQuestions).map((question, index) => (
                <div
                  key={index}
                  style={{
                    padding: '16px',
                    background: 'var(--gray-50, #f9fafb)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color, #e5e7eb)'
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <div style={{
                      minWidth: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '14px',
                      flexShrink: 0
                    }}>
                      {index + 1}
                    </div>
                    <p style={{ margin: 0, fontSize: '15px', lineHeight: '1.6', color: 'var(--text-primary, #1f2937)' }}>
                      "{question}"
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setStarterQuestionsModalOpen(false)
                  setSelectedCoachForQuestions(null)
                }}
                style={{
                  padding: '10px 20px',
                  background: 'var(--gray-200, #e5e7eb)',
                  color: 'var(--text-primary, #1f2937)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'var(--gray-300, #d1d5db)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'var(--gray-200, #e5e7eb)'
                }}
              >
                Close
              </button>
              <button
                onClick={() => {
                  setStarterQuestionsModalOpen(false)
                  handleTalkToCoach(selectedCoachForQuestions.id)
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                <Mic size={18} />
                Start Conversation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Coaches

