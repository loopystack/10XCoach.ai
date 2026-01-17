import { useState, useEffect } from 'react'
import { 
  Search, 
  Eye, 
  Clock, 
  User, 
  MessageSquare, 
  Calendar,
  Filter,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  PauseCircle,
  Trash2,
  RefreshCw,
  GraduationCap,
  History
} from 'lucide-react'
import { api } from '../../utils/api'
import { notify } from '../../utils/notification'
import '../PageStyles.css'
import './AdminPages.css'

interface Session {
  id: number
  startTime: string
  endTime: string | null
  duration: number | null
  status: string
  summary: string | null
  user: {
    id: number
    name: string
    email: string
  }
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

interface Coach {
  id: number
  name: string
  role: string
}

// Component to highlight search terms in text
const HighlightedText = ({ text, searchTerm }: { text: string; searchTerm: string }) => {
  if (!searchTerm || !text) {
    return <span>{text}</span>
  }

  const escapedSearchTerm = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const parts = text.split(new RegExp(`(${escapedSearchTerm})`, 'gi'))
  
  return (
    <span>
      {parts.map((part, index) =>
        part.toLowerCase() === searchTerm.toLowerCase() ? (
          <mark
            key={index}
            style={{
              backgroundColor: '#fef08a',
              color: '#713f12',
              padding: '2px 4px',
              borderRadius: '3px',
              fontWeight: 600
            }}
          >
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  )
}

const Sessions = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [filteredSessions, setFilteredSessions] = useState<Session[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showTranscriptModal, setShowTranscriptModal] = useState(false)
  const [selectedTranscript, setSelectedTranscript] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCoach, setFilterCoach] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null)

  useEffect(() => {
    loadSessions()
    loadCoaches()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [searchTerm, filterCoach, filterStatus, filterDateFrom, filterDateTo, sessions])

  const loadSessions = async () => {
    try {
      setLoading(true)
      const data = await api.get('/api/manage-sessions')
      setSessions(Array.isArray(data) ? data : [])
      setLoading(false)
    } catch (error) {
      console.error('Failed to load sessions:', error)
      setLoading(false)
      setSessions([])
    }
  }

  const loadCoaches = async () => {
    try {
      const data = await api.get('/api/manage-coaches')
      if (Array.isArray(data)) {
        setCoaches(data)
      }
    } catch (error) {
      console.error('Failed to load coaches:', error)
    }
  }

  const applyFilters = () => {
    let filtered = sessions.filter(session => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        session.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        session.coach.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (session.summary && session.summary.toLowerCase().includes(searchTerm.toLowerCase()))

      // Coach filter
      const matchesCoach = filterCoach === 'all' || 
        session.coach.id.toString() === filterCoach

      // Status filter
      const matchesStatus = filterStatus === 'all' || 
        session.status.toLowerCase() === filterStatus.toLowerCase()

      // Date filters
      let matchesDate = true
      if (filterDateFrom) {
        const sessionDate = new Date(session.startTime)
        const fromDate = new Date(filterDateFrom)
        matchesDate = matchesDate && sessionDate >= fromDate
      }
      if (filterDateTo) {
        const sessionDate = new Date(session.startTime)
        const toDate = new Date(filterDateTo)
        toDate.setHours(23, 59, 59, 999) // End of day
        matchesDate = matchesDate && sessionDate <= toDate
      }

      return matchesSearch && matchesCoach && matchesStatus && matchesDate
    })

    setFilteredSessions(filtered)
  }

  const handleViewSession = async (session: Session) => {
    try {
      // Fetch full session details including notes and action steps
      const fullSession = await api.get(`/api/sessions/${session.id}`)
      // Ensure _count exists with actionSteps
      const sessionWithCount = {
        ...fullSession,
        _count: {
          actionSteps: fullSession.actionSteps?.length || fullSession._count?.actionSteps || 0
        }
      }
      setSelectedSession(sessionWithCount)
      setShowModal(true)
    } catch (error) {
      console.error('Failed to load session details:', error)
      // Use the session from the list which already has _count
      setSelectedSession(session)
      setShowModal(true)
    }
  }

  const handleViewHistory = async (session: Session) => {
    try {
      // Fetch full session details to get transcript
      const fullSession = await api.get(`/api/sessions/${session.id}`)
      let transcript = fullSession.transcript
      
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

  const handleDeleteSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return
    }

    try {
      setDeletingSessionId(sessionId)
      await api.delete(`/api/sessions/${sessionId}`)
      await loadSessions()
      setDeletingSessionId(null)
      if (selectedSession?.id === sessionId) {
        setShowModal(false)
        setSelectedSession(null)
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
      notify.error('Failed to delete session. Please try again.')
      setDeletingSessionId(null)
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}m ${secs}s`
  }

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase()
    if (statusLower === 'completed') {
      return <span className="status-badge status-completed"><CheckCircle2 size={14} /> Completed</span>
    } else if (statusLower === 'active' || statusLower === 'in_progress') {
      return <span className="status-badge status-active"><PlayCircle size={14} /> Active</span>
    } else if (statusLower === 'paused') {
      return <span className="status-badge status-paused"><PauseCircle size={14} /> Paused</span>
    } else {
      return <span className="status-badge status-other"><AlertCircle size={14} /> {status}</span>
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterCoach('all')
    setFilterStatus('all')
    setFilterDateFrom('')
    setFilterDateTo('')
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
              Sessions & Notes
            </h1>
            <p className="page-subtitle" style={{ fontSize: '1.1rem', color: 'var(--gray-600)' }}>
              View and manage coaching sessions, notes, action steps, and handoffs
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filters-card">
        <div className="filters-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={20} />
            <h3>Filters</h3>
          </div>
          {(searchTerm || filterCoach !== 'all' || filterStatus !== 'all' || filterDateFrom || filterDateTo) && (
            <button onClick={clearFilters} className="clear-filters-btn">
              <X size={16} />
              Clear Filters
            </button>
          )}
        </div>
        <div className="filters-grid">
          <div className="filter-group">
            <label>Search</label>
            <div className="search-input-wrapper">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by user, coach, or summary..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="filter-group">
            <label>Coach</label>
            <select value={filterCoach} onChange={(e) => setFilterCoach(e.target.value)}>
              <option value="all">All Coaches</option>
              {coaches.map(coach => (
                <option key={coach.id} value={coach.id.toString()}>{coach.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="paused">Paused</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="filter-group">
            <label>From Date</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>To Date</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="admin-stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <MessageSquare size={24} />
          </div>
          <div>
            <div className="admin-stat-value">{filteredSessions.length}</div>
            <div className="admin-stat-label">Total Sessions</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div className="admin-stat-value">
              {filteredSessions.filter(s => s.status.toLowerCase() === 'completed').length}
            </div>
            <div className="admin-stat-label">Completed</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <PlayCircle size={24} />
          </div>
          <div>
            <div className="admin-stat-value">
              {filteredSessions.filter(s => s.status.toLowerCase() === 'active' || s.status.toLowerCase() === 'in_progress').length}
            </div>
            <div className="admin-stat-label">Active</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <Clock size={24} />
          </div>
          <div>
            <div className="admin-stat-value">
              {filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0) > 0 
                ? Math.round(filteredSessions.reduce((acc, s) => acc + (s.duration || 0), 0) / 60)
                : 0}m
            </div>
            <div className="admin-stat-label">Total Duration</div>
          </div>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="admin-table-card">
        <div className="table-header">
          <h3>Sessions ({filteredSessions.length})</h3>
          <button onClick={loadSessions} className="refresh-btn" title="Refresh">
            <RefreshCw size={18} />
          </button>
        </div>
        {filteredSessions.length === 0 ? (
          <div className="admin-empty-state">
            <MessageSquare size={48} />
            <h3>No sessions found</h3>
            {sessions.length === 0 && <p>No sessions have been created yet.</p>}
          </div>
        ) : (
          <div className="table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date & Time</th>
                  <th>User</th>
                  <th>Coach</th>
                  <th>Duration</th>
                  <th>Status</th>
                  <th>Action Steps</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map(session => (
                  <tr key={session.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 500 }}>
                          {new Date(session.startTime).toLocaleDateString()}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                          {new Date(session.startTime).toLocaleTimeString()}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <span style={{ fontWeight: 500 }}>
                          {searchTerm ? (
                            <HighlightedText text={session.user.name} searchTerm={searchTerm} />
                          ) : (
                            session.user.name
                          )}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>
                          {searchTerm ? (
                            <HighlightedText text={session.user.email} searchTerm={searchTerm} />
                          ) : (
                            session.user.email
                          )}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 500 }}>
                          {searchTerm ? (
                            <HighlightedText text={session.coach.name} searchTerm={searchTerm} />
                          ) : (
                            session.coach.name
                          )}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--gray-500)', padding: '2px 8px', background: 'var(--gray-100)', borderRadius: '4px' }}>
                          {session.coach.role}
                        </span>
                      </div>
                    </td>
                    <td>{formatDuration(session.duration)}</td>
                    <td>{getStatusBadge(session.status)}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileText size={16} />
                        <span>{session._count?.actionSteps ?? 0}</span>
                      </div>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          onClick={() => handleViewHistory(session)}
                          className="action-btn history-btn"
                          title="View Conversation History"
                          style={{ 
                            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                            color: 'white'
                          }}
                        >
                          <History size={16} />
                        </button>
                        <button
                          onClick={() => handleViewSession(session)}
                          className="action-btn view-btn"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session.id)}
                          className="action-btn delete-btn"
                          title="Delete Session"
                          disabled={deletingSessionId === session.id}
                        >
                          {deletingSessionId === session.id ? (
                            <RefreshCw size={16} className="spinning" />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Session Details Modal */}
      {showModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="session-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Beautiful Header */}
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
              {/* Info Cards Grid */}
              <div className="session-info-grid">
                {/* User Card */}
                <div className="session-info-card">
                  <div className="session-info-card-header">
                    <div className="session-info-icon" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))' }}>
                      <User size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <h3>User</h3>
                  </div>
                  <div className="session-info-card-body">
                    <div className="session-info-row">
                      <span className="session-info-label">Name</span>
                      <span className="session-info-value">{selectedSession.user.name}</span>
                    </div>
                    <div className="session-info-row">
                      <span className="session-info-label">Email</span>
                      <span className="session-info-value">{selectedSession.user.email}</span>
                    </div>
                  </div>
                </div>

                {/* Coach Card */}
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

                {/* Session Stats Card */}
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

                {/* Time Card */}
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

              {/* Summary Section */}
              {selectedSession.summary && (
                <div className="session-summary-card">
                  <div className="session-summary-header">
                    <div className="session-info-icon" style={{ background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.2), rgba(219, 39, 119, 0.1))' }}>
                      <FileText size={20} style={{ color: '#ec4899' }} />
                    </div>
                    <h3>Session Summary & Notes</h3>
                  </div>
                  <div className="session-summary-content">
                    {searchTerm && selectedSession.summary ? (
                      <HighlightedText text={selectedSession.summary} searchTerm={searchTerm} />
                    ) : (
                      selectedSession.summary
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="session-modal-footer">
              <button className="session-modal-btn-secondary" onClick={() => setShowModal(false)}>
                Close
              </button>
              <button 
                className="session-modal-btn-danger" 
                onClick={() => {
                  if (selectedSession) {
                    handleDeleteSession(selectedSession.id)
                  }
                }}
                disabled={deletingSessionId === selectedSession.id}
              >
                {deletingSessionId === selectedSession.id ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Session
                  </>
                )}
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
                    Full transcript of the coaching session
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
