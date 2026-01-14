import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, Sparkles, Mic } from 'lucide-react'
import { isAuthenticated, api } from '../utils/api'
import ConversationModal from '../components/ConversationModal'
import './PageStyles.css'

interface Coach {
  id: number
  name: string
  email: string
  specialty?: string
  description?: string
  tagline?: string
  avatar?: string
}

const Coaches = () => {
  const navigate = useNavigate()
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedCoach, setSelectedCoach] = useState<number | null>(null)
  const [conversationModalOpen, setConversationModalOpen] = useState(false)
  const [selectedCoachForConversation, setSelectedCoachForConversation] = useState<Coach | null>(null)
  const [conversationApiType, setConversationApiType] = useState<'openai' | 'elevenlabs'>('openai')

  useEffect(() => {
    fetch('/api/coaches')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch coaches: ${res.status} ${res.statusText}`)
        }
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setCoaches(data)
          if (data.length === 0) {
            console.warn('⚠️ No coaches returned from API. Check if coaches are set to active=true in database.')
          }
        } else {
          console.error('❌ Invalid coaches data format:', data)
          setCoaches([])
        }
      })
      .catch(err => {
        console.error('❌ Error fetching coaches:', err)
        setCoaches([])
      })
  }, [])

  // Handle page restoration from bfcache (back/forward cache)
  // This ensures the component works correctly when user navigates back
  useEffect(() => {
    const handlePageshow = (event: PageTransitionEvent) => {
      // If page was restored from bfcache, refresh the coaches data
      if (event.persisted) {
        fetch('/api/coaches')
          .then(res => {
            if (!res.ok) {
              throw new Error(`Failed to fetch coaches: ${res.status} ${res.statusText}`)
            }
            return res.json()
          })
          .then(data => {
            if (Array.isArray(data)) {
              setCoaches(data)
            } else {
              console.error('❌ Invalid coaches data format:', data)
              setCoaches([])
            }
          })
          .catch(err => console.error('Error refreshing coaches:', err))
      }
    }

    window.addEventListener('pageshow', handlePageshow)
    return () => window.removeEventListener('pageshow', handlePageshow)
  }, [])

  const handleTalkToCoach = async (coachId: number, useElevenLabs: boolean = false) => {
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
        alert('Your free trial has ended. Please upgrade to continue using this feature.')
        navigate('/plans', { state: { from: 'talk-to-coach', coachId } })
        return
      }
    } catch (error: any) {
      // If access check fails, still allow but log the error
      console.error('Failed to check billing status:', error)
      if (error.requiresUpgrade) {
        alert('Your free trial has ended. Please upgrade to continue.')
        navigate('/plans', { state: { from: 'talk-to-coach', coachId } })
        return
      }
    }
    
    // Find the coach to get their name
    const coach = coaches.find(c => c.id === coachId)
    if (!coach) {
      console.error('Coach not found')
      alert('Coach not found. Please try again.')
      return
    }
    
    // Open conversation modal instead of redirecting
    setSelectedCoachForConversation(coach)
    setConversationApiType(useElevenLabs ? 'elevenlabs' : 'openai')
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
                    handleTalkToCoach(coach.id, false)
                  }}
                >
                  <Mic size={18} />
                  <span>Talk to {coach.name.split(' ')[0]} (OpenAI)</span>
                </button>
                <button
                  className="coach-talk-button coach-talk-button-elevenlabs"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleTalkToCoach(coach.id, true)
                  }}
                >
                  <Mic size={18} />
                  <span>Talk to {coach.name.split(' ')[0]} (ElevenLabs)</span>
                </button>
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
    </div>
  )
}

export default Coaches

