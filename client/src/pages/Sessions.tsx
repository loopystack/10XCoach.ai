import { useState, useEffect } from 'react'
import {
  MessageSquare,
  Clock,
  Calendar,
  Eye,
  FileText,
  CheckCircle2,
  PlayCircle,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  X,
  History
} from 'lucide-react'
import { api } from '../utils/api'
import './PageStyles.css'
import './admin/AdminPages.css'

interface Session {
  id: number
  startTime: string
  endTime: string | null
  duration: number | null
  status: string
  summary: string | null
  coach: {
    id: number
    name: string
    role: string
  }
  _count?: {
    actionSteps: number
  }
  actionSteps?: any[]
}

const Sessions = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showTranscriptModal, setShowTranscriptModal] = useState(false)
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const data = await api.get('/api/sessions')
      setSessions(Array.isArray(data) ? data : [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      setLoading(false)
      setSessions([])
    }
  }

  const handleViewSession = async (session: Session) => {
    try {
      // Fetch full session details including action steps
      const fullSession = await api.get(`/api/sessions/${session.id}`)
      setSelectedSession(fullSession)
      setShowModal(true)
    } catch (error) {
      console.error('Failed to load session details:', error)
      // Use the session from the list
      setSelectedSession(session)
      setShowModal(true)
    }
  }

  const handleViewHistory = async (session: Session) => {
    try {
      // Fetch full session details to get transcript
      const fullSession = await api.get(`/api/sessions/${session.id}`)
      // Support both backend shapes: raw SQL (transcript) and Prisma (transcriptRef)
      let transcript = fullSession.transcript ?? fullSession.transcriptRef
      
      console.log('📖 Fetching transcript for session:', session.id, {
        hasTranscript: !!transcript,
        transcriptType: typeof transcript,
        transcriptLength: transcript ? transcript.length : 0
      })
      
      // Parse transcript if it's a JSON string
      if (typeof transcript === 'string') {
        try {
          const parsed = JSON.parse(transcript)
          console.log('📖 Parsed transcript:', {
            isArray: Array.isArray(parsed),
            length: Array.isArray(parsed) ? parsed.length : 'N/A',
            sample: Array.isArray(parsed) ? parsed.slice(0, 2) : parsed
          })
          
          // Format transcript for display
          if (Array.isArray(parsed)) {
            transcript = parsed.map((msg: any) => {
              const role = msg.role || msg.type || 'unknown'
              const content = msg.content || msg.text || msg.message || JSON.stringify(msg)
              const speaker = role === 'user' ? 'You' : role === 'assistant' || role === 'coach' ? (fullSession.coach?.name || 'Coach') : role
              return `${speaker}: ${content}`
            }).join('\n\n')
          } else {
            transcript = JSON.stringify(parsed, null, 2)
          }
        } catch (parseError) {
          console.error('❌ Failed to parse transcript:', parseError)
          // If parsing fails, try to use as plain text
          transcript = transcript || 'No conversation transcript available.'
        }
      } else if (!transcript) {
        transcript = 'No conversation transcript available.'
      }
      
      setSelectedTranscript(transcript)
      setShowTranscriptModal(true)
    } catch (error) {
      console.error('❌ Failed to load conversation history:', error)
      setSelectedTranscript('Failed to load conversation history. Please try again.')
      setShowTranscriptModal(true)
    }
  }

  const formatDuration = (minutes: number | null | undefined) => {
    // Handle null, undefined, or 0
    if (!minutes || minutes === 0) {
      return 'N/A'
    }
    // Ensure it's a number
    const mins = typeof minutes === 'number' ? minutes : parseFloat(minutes)
    if (isNaN(mins) || mins <= 0) {
      return 'N/A'
    }
    // If less than 1 minute, show in seconds
    if (mins < 1) {
      const seconds = Math.round(mins * 60)
      return `${seconds}s`
    }
    // If less than 60 minutes, show minutes (with decimal if less than 1 minute)
    if (mins < 60) {
      if (mins < 1) {
        return `${Math.round(mins * 60)}s`
      }
      return `${Math.round(mins)}m`
    }
    // If 60 minutes or more, show hours and minutes
    const hours = Math.floor(mins / 60)
    const remainingMins = Math.round(mins % 60)
    return `${hours}h ${remainingMins}m`
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === 'completed') {
      return <span className="status-badge status-completed"><CheckCircle2 size={14} /> Completed</span>
    } else if (statusLower === 'active' || statusLower === 'in_progress') {
      return <span className="status-badge status-active"><PlayCircle size={14} /> Active</span>
    } else {
      return <span className="status-badge status-other"><AlertCircle size={14} /> {status}</span>
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading sessions...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              My Coaching Sessions
            </h1>
            <p className="page-subtitle" style={{ fontSize: '1.1rem', color: 'var(--gray-600)' }}>
              View your saved coaching conversations, summaries, and action steps
            </p>
          </div>
          <button onClick={loadSessions} className="refresh-btn" title="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="admin-stat-value">{sessions.length}</div>
            <div className="admin-stat-label">Total Sessions</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="admin-stat-value">
              {sessions.filter(s => s.status.toLowerCase() === 'completed').length}
            </div>
            <div className="admin-stat-label">Completed</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <Clock size={24} />
          </div>
          <div>
            <div className="admin-stat-value">
              {sessions.reduce((acc, s) => acc + (s.duration || 0), 0) > 0 
                ? Math.round(sessions.reduce((acc, s) => acc + (s.duration || 0), 0))
                : 0}m
            </div>
            <div className="admin-stat-label">Total Duration</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <FileText size={24} />
          </div>
          <div>
            <div className="admin-stat-value">
              {sessions.reduce((acc, s) => acc + (s._count?.actionSteps || 0), 0)}
            </div>
            <div className="admin-stat-label">Action Steps</div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      <div className="content-card">
        <div className="section-header">
          <h2>Recent Sessions</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="admin-empty-state">
            <MessageSquare size={48} />
            <h3>No sessions yet</h3>
            <p>Your saved coaching conversations will appear here.</p>
            <p style={{ fontSize: '0.9rem', color: 'var(--gray-500)', marginTop: '0.5rem' }}>
              Click "Save Conversation" after talking to a coach to save your session.
            </p>
          </div>
        ) : (
          <div className="sessions-list">
            {sessions.map(session => (
              <div key={session.id} className="session-card">
                <div className="session-card-header">
                  <div className="session-card-main">
                    <div className="session-card-icon">
                      <GraduationCap size={20} />
                    </div>
                    <div className="session-card-info">
                      <h3>{session.coach.name}</h3>
                      <p className="session-card-meta">
                        <Calendar size={14} />
                        {new Date(session.startTime).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                        <span style={{ margin: '0 8px' }}>•</span>
                        <Clock size={14} />
                        {new Date(session.startTime).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="session-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    {getStatusBadge(session.status)}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewHistory(session);
                      }}
                      className="session-action-btn"
                      title="View Conversation History"
                      style={{ 
                        background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        padding: '0',
                        borderRadius: '8px',
                        border: 'none',
                        cursor: 'pointer',
                        visibility: 'visible',
                        opacity: 1,
                        zIndex: 10
                      }}
                    >
                      <History size={18} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewSession(session);
                      }}
                      className="session-action-btn"
                      title="View Details"
                      style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '36px',
                        height: '36px',
                        padding: '0',
                        borderRadius: '8px',
                        background: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer',
                        visibility: 'visible',
                        opacity: 1,
                        zIndex: 10
                      }}
                    >
                      <Eye size={18} />
                    </button>
                  </div>
                </div>
                {session.summary && (
                  <div className="session-card-summary">
                    <p>{session.summary.substring(0, 200)}{session.summary.length > 200 ? '...' : ''}</p>
                  </div>
                )}
                <div className="session-card-footer">
                  <div className="session-card-stats">
                    <span>
                      <Clock size={14} />
                      {formatDuration(session.duration)}
                    </span>
                    <span>
                      <FileText size={14} />
                      {session._count?.actionSteps || 0} action steps
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {showModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="session-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="session-modal-header">
              <div className="session-modal-header-content">
                <div className="session-modal-icon-wrapper">
                  <MessageSquare size={24} />
                </div>
                <div>
                  <h2>Session Details</h2>
                  <p className="session-modal-subtitle">
                    {new Date(selectedSession.startTime).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </p>
                </div>
              </div>
              <button className="session-modal-close" onClick={() => setShowModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="session-modal-body">
              <div className="session-info-grid">
                <div className="session-info-card">
                  <div className="session-info-card-header">
                    <div className="session-info-icon" style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.1))' }}>
                      <GraduationCap size={20} style={{ color: '#8b5cf6' }} />
                    </div>
                    <h3>Coach</h3>
                  </div>
                  <div className="session-info-card-body">
                    <div className="session-info-row">
                      <span className="session-info-label">Name</span>
                      <span className="session-info-value">{selectedSession.coach.name}</span>
                    </div>
                    <div className="session-info-row">
                      <span className="session-info-label">Role</span>
                      <span className="session-info-value">{selectedSession.coach.role}</span>
                    </div>
                  </div>
                </div>

                <div className="session-info-card">
                  <div className="session-info-card-header">
                    <div className="session-info-icon" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(22, 163, 74, 0.1))' }}>
                      <Clock size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <h3>Session Info</h3>
                  </div>
                  <div className="session-info-card-body">
                    <div className="session-info-row">
                      <span className="session-info-label">Duration</span>
                      <span className="session-info-value">{formatDuration(selectedSession.duration)}</span>
                    </div>
                    <div className="session-info-row">
                      <span className="session-info-label">Status</span>
                      <span className="session-info-value">{getStatusBadge(selectedSession.status)}</span>
                    </div>
                    <div className="session-info-row">
                      <span className="session-info-label">Action Steps</span>
                      <span className="session-info-value">
                        {selectedSession._count?.actionSteps ?? selectedSession.actionSteps?.length ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="session-info-card">
                  <div className="session-info-card-header">
                    <div className="session-info-icon" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.1))' }}>
                      <Calendar size={20} style={{ color: '#f59e0b' }} />
                    </div>
                    <h3>Timeline</h3>
                  </div>
                  <div className="session-info-card-body">
                    <div className="session-info-row">
                      <span className="session-info-label">Start Time</span>
                      <span className="session-info-value">
                        {new Date(selectedSession.startTime).toLocaleString()}
                      </span>
                    </div>
                    {selectedSession.endTime && (
                      <div className="session-info-row">
                        <span className="session-info-label">End Time</span>
                        <span className="session-info-value">
                          {new Date(selectedSession.endTime).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {selectedSession.summary && (
                <div className="session-summary-card">
                  <div className="session-summary-header">
                    <div className="session-info-icon" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(219, 39, 119, 0.1))' }}>
                      <FileText size={20} style={{ color: '#ec4899' }} />
                    </div>
                    <h3>Session Summary & Notes</h3>
                  </div>
                  <div className="session-summary-content">
                    {selectedSession.summary}
                  </div>
                </div>
              )}

              {selectedSession.actionSteps && selectedSession.actionSteps.length > 0 && (
                <div className="session-action-steps-card">
                  <div className="session-summary-header">
                    <div className="session-info-icon" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))' }}>
                      <CheckCircle2 size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <h3>Action Steps</h3>
                  </div>
                  <div className="action-steps-list">
                    {selectedSession.actionSteps.map((step: any, index: number) => (
                      <div key={step.id || index} className="action-step-item">
                        <CheckCircle2 size={16} />
                        <span>{step.description || step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="session-modal-footer">
              <button className="session-modal-btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation History/Transcript Modal */}
      {showTranscriptModal && (
        <div className="modal-overlay" onClick={() => setShowTranscriptModal(false)}>
          <div className="session-modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
            <div className="session-modal-header">
              <div className="session-modal-header-content">
                <div className="session-modal-icon-wrapper">
                  <History size={24} />
                </div>
                <div>
                  <h2>Conversation History</h2>
                  <p className="session-modal-subtitle">
                    Full transcript of your coaching session
                  </p>
                </div>
              </div>
              <button className="session-modal-close" onClick={() => setShowTranscriptModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="session-modal-body">
              <div style={{ 
                background: 'var(--bg-secondary)', 
                padding: '1.5rem', 
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                maxHeight: '60vh',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                color: 'var(--text-primary)'
              }}>
                {selectedTranscript || 'No conversation transcript available.'}
              </div>
            </div>

            <div className="session-modal-footer">
              <button className="session-modal-btn-secondary" onClick={() => setShowTranscriptModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sessions

