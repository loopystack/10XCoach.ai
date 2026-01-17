import { useEffect, useState } from 'react'
import { StickyNote, Send, Calendar, User, Plus, Edit2, Trash2, X, Search, Filter, Info } from 'lucide-react'
import { api } from '../utils/api'
import { notify } from '../utils/notification'
import './PageStyles.css'

interface Note {
  id: number
  session_date: string
  coach_id: number
  user_id: number
  content: string
  sent: boolean
  coach_name: string
  client_name: string
  client_role?: string
}

interface Coach {
  id: number
  name: string
}

interface User {
  id: number | string
  name: string
  role?: string
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

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([])
  const [filteredNotes, setFilteredNotes] = useState<Note[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Filter states
  const [selectedCoach, setSelectedCoach] = useState<number | null>(null)
  const [selectedUser, setSelectedUser] = useState<number | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const [deletingNote, setDeletingNote] = useState<Note | null>(null)
  
  // Form states
  const [formData, setFormData] = useState({
    coach_id: '',
    user_id: '',
    content: '',
    session_date: new Date().toISOString().split('T')[0],
    sent: false
  })

  // Fetch initial data
  useEffect(() => {
    fetchCoaches()
    fetchNotes()
    fetchAdminUsers() // Try to fetch all admin users from database
  }, [])

  // Extract users from notes as fallback when notes are loaded and users list is still empty
  useEffect(() => {
    if (notes.length > 0 && users.length === 0) {
      console.log('📋 No users from API, extracting from notes as fallback...')
      extractUsersFromNotes()
    }
  }, [notes.length, users.length])

  // Apply filters when they change
  useEffect(() => {
    applyFilters()
  }, [notes, selectedCoach, selectedUser, searchTerm, startDate, endDate])

  const fetchCoaches = async () => {
    try {
      const data = await api.get('/api/coaches')
      if (Array.isArray(data)) {
        setCoaches(data)
      } else {
        console.error('Expected array but got:', data)
        setCoaches([])
      }
    } catch (error) {
      console.error('Error fetching coaches:', error)
      setCoaches([])
    }
  }

  const fetchAdminUsers = async () => {
    try {
      // Fetch all users (not just admins) for the client dropdown
      // This should show actual clients/users, not admin accounts
      console.log('🔍 Fetching users from /api/users...')
      const data = await api.get('/api/users')
      console.log('📥 Response from /api/users:', data)
      if (Array.isArray(data)) {
        // Filter to only show regular users (not admins) - these are the actual clients
        const clientUsers = data
          .filter((user: any) => {
            const role = user.role?.toString().toUpperCase()
            // Only show USER role, exclude ADMIN, COACH_ADMIN, SUPER_ADMIN
            return role === 'USER' || !role
          })
          .map((user: any) => ({
            id: user.id,
            name: user.name,
            role: user.role || 'USER'
          }))
        console.log(`✅ Loaded ${clientUsers.length} client users from database:`, clientUsers.map(u => u.name))
        setUsers(clientUsers)
      } else {
        console.error('❌ Expected array but got:', data)
        // If API fails, will fall back to extracting from notes
      }
    } catch (error: any) {
      console.error('❌ Error fetching users:', error)
      console.log('⚠️ Could not fetch users from API, will extract from notes if available')
      // Don't set users to empty - let extraction handle it as fallback
    }
  }

  const extractUsersFromNotes = () => {
    if (notes.length === 0) {
      return
    }
    
    // Extract unique users from notes - work with what we have
    const userMap = new Map<string, { id: number | string; name: string; role?: string }>()
    // Start from 1000 for temporary IDs
    
    notes.forEach(note => {
      if (note.client_name) {
        const userName = note.client_name.trim()
        if (userName && !userMap.has(userName)) {
          // Use user_id if available, otherwise create temp ID based on name hash
          let userId: number | string
          if (note.user_id) {
            userId = note.user_id
          } else {
            // Create consistent temp ID for same name
            userId = `temp_${userName.toLowerCase().replace(/\s+/g, '_')}`
          }
          userMap.set(userName, {
            id: userId,
            name: userName,
            role: note.client_role || undefined
          })
        }
      }
    })
    
    const extractedUsers = Array.from(userMap.values())
    
    if (extractedUsers.length === 0) {
      return
    }
    
    // If we have role info, filter to admins only
    // If no role info, show all users (fallback)
    const hasRoleInfo = extractedUsers.some(u => u.role)
    
    if (hasRoleInfo) {
      const adminUsers = extractedUsers.filter(user => {
        const role = user.role?.toString().toUpperCase()
        return role === 'ADMIN'
      })
      setUsers(adminUsers)
    } else {
      // No role info - show all users from notes
      setUsers(extractedUsers)
    }
  }

  const fetchNotes = async () => {
    try {
      setLoading(true)
      // Fetch all notes - filtering will be done client-side via applyFilters
      const data = await api.get('/api/notes')
      
      // Ensure data is always an array
      if (Array.isArray(data)) {
        console.log(`✅ Loaded ${data.length} notes`)
        // Debug: Check if client_role is in the data
        if (data.length > 0) {
          console.log('📄 Sample note from API:', {
            id: data[0].id,
            user_id: data[0].user_id,
            client_name: data[0].client_name,
            client_role: data[0].client_role,
            hasClientRole: !!data[0].client_role,
            allKeys: Object.keys(data[0])
          })
        }
        setNotes(data)
      } else {
        console.error('Expected array but got:', data)
        setNotes([])
      }
      setLoading(false)
    } catch (error: any) {
      console.error('Error fetching notes:', error)
      // If it's a 401, the api utility will throw, but we should still set empty array
      setNotes([])
      setLoading(false)
    }
  }

  const applyFilters = () => {
    // Ensure notes is always an array
    if (!Array.isArray(notes)) {
      setFilteredNotes([])
      return
    }

    let filtered = [...notes]

    // Filter by coach - convert both to numbers for comparison
    if (selectedCoach !== null && selectedCoach !== undefined) {
      const coachId = Number(selectedCoach)
      filtered = filtered.filter(note => Number(note.coach_id) === coachId)
    }

    // Filter by client - convert both to numbers for comparison
    if (selectedUser !== null && selectedUser !== undefined) {
      const userId = selectedUser
      filtered = filtered.filter(note => {
        // Match by user_id if available
        if (note.user_id) {
          return Number(note.user_id) === Number(userId)
        }
        // Fallback: match by client_name if user_id is missing
        const selectedUserObj = users.find(u => u.id === userId)
        if (selectedUserObj && note.client_name) {
          return note.client_name === selectedUserObj.name
        }
        return false
      })
    }

    // Filter by date range
    if (startDate) {
      filtered = filtered.filter(note => {
        const noteDate = new Date(note.session_date)
        const start = new Date(startDate)
        return noteDate >= start
      })
    }

    if (endDate) {
      filtered = filtered.filter(note => {
        const noteDate = new Date(note.session_date)
        const end = new Date(endDate)
        end.setHours(23, 59, 59, 999) // Include the entire end date
        return noteDate <= end
      })
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(note => 
        note.content?.toLowerCase().includes(term) ||
        note.coach_name?.toLowerCase().includes(term) ||
        note.client_name?.toLowerCase().includes(term)
      )
    }

    setFilteredNotes(filtered)
  }

  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitting) return // Prevent multiple submissions
    
    try {
      setSubmitting(true)
      await api.post('/api/notes', {
        coach_id: parseInt(formData.coach_id),
        user_id: parseInt(formData.user_id),
        content: formData.content,
        session_date: formData.session_date,
        sent: formData.sent
      })
      
      // Fetch updated notes with joined data
      await fetchNotes()
      resetForm()
      setShowCreateModal(false)
    } catch (error: any) {
      console.error('Error creating note:', error)
      notify.error('Failed to create note: ' + (error.message || 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingNote || submitting) return // Prevent multiple submissions

    try {
      setSubmitting(true)
      await api.put(`/api/notes/${editingNote.id}`, {
        coach_id: parseInt(formData.coach_id),
        user_id: parseInt(formData.user_id),
        content: formData.content,
        session_date: formData.session_date,
        sent: formData.sent
      })
      
      await fetchNotes()
      resetForm()
      setShowEditModal(false)
      setEditingNote(null)
    } catch (error: any) {
      console.error('Error updating note:', error)
      notify.error('Failed to update note: ' + (error.message || 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteNote = async () => {
    if (!deletingNote || deleting) return // Prevent multiple clicks

    try {
      setDeleting(true)
      await api.delete(`/api/notes/${deletingNote.id}`)
      await fetchNotes()
      setShowDeleteModal(false)
      setDeletingNote(null)
    } catch (error: any) {
      console.error('Error deleting note:', error)
      notify.error('Failed to delete note: ' + (error.message || 'Unknown error'))
    } finally {
      setDeleting(false)
    }
  }

  const handleSendNote = async (note: Note) => {
    try {
      await api.put(`/api/notes/${note.id}`, { sent: true })
      await fetchNotes()
    } catch (error: any) {
      console.error('Error sending note:', error)
      notify.error('Failed to send note: ' + (error.message || 'Unknown error'))
    }
  }

  const openEditModal = (note: Note) => {
    setEditingNote(note)
    setFormData({
      coach_id: note.coach_id.toString(),
      user_id: note.user_id.toString(),
      content: note.content || '',
      session_date: note.session_date ? new Date(note.session_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      sent: note.sent
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (note: Note) => {
    setDeletingNote(note)
    setShowDeleteModal(true)
  }

  const resetForm = () => {
    setFormData({
      coach_id: '',
      user_id: '',
      content: '',
      session_date: new Date().toISOString().split('T')[0],
      sent: false
    })
    setSubmitting(false)
    setDeleting(false)
  }

  const handleFilterChange = () => {
    // Filters are applied client-side via applyFilters() useEffect
    // No need to refetch from backend
  }

  const clearFilters = () => {
    setSelectedCoach(null)
    setSelectedUser(null)
    setSearchTerm('')
    setStartDate('')
    setEndDate('')
    // Refetch all notes when clearing filters
    fetchNotes()
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>10X Coach Notetaking</h1>
        <p className="page-subtitle">Session notes for coaches and subscribers</p>
      </div>

      <div className="content-card">
        {/* Action Bar */}
        <div className="section-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
            <button 
              className="btn-primary"
              onClick={() => {
                resetForm()
                setShowCreateModal(true)
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} />
              Create Note
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="filters-section">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Filter size={18} />
            <h3>Filters</h3>
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div>
              <label>Search</label>
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setTimeout(handleFilterChange, 300)
                  }}
                />
              </div>
            </div>

            <div>
              <label>Coach</label>
              <select
                value={selectedCoach || ''}
                onChange={(e) => {
                  setSelectedCoach(e.target.value ? parseInt(e.target.value) : null)
                  handleFilterChange()
                }}
              >
                <option value="">All Coaches</option>
                {coaches.map(coach => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Client</label>
              <select
                value={selectedUser || ''}
                onChange={(e) => {
                  const value = e.target.value
                  setSelectedUser(value ? Number(value) : null)
                  handleFilterChange()
                }}
              >
                <option value="">All Clients</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value)
                  handleFilterChange()
                }}
              />
            </div>

            <div>
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value)
                  handleFilterChange()
                }}
              />
            </div>
          </div>

          {(selectedCoach || selectedUser || searchTerm || startDate || endDate) && (
            <button
              onClick={clearFilters}
              className="clear-filters-btn"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Notes Grid */}
        {loading ? (
          <div className="empty-state">
            <p>Loading notes...</p>
          </div>
        ) : !Array.isArray(filteredNotes) || filteredNotes.length === 0 ? (
          <div className="empty-state">
            <StickyNote size={48} />
            <p>No notes found</p>
          </div>
        ) : (
          <div className="notes-grid">
            {filteredNotes.map(note => (
              <div key={note.id} className="note-card">
                <div className="note-header">
                  <div className="note-icon">
                    <StickyNote size={24} />
                  </div>
                  <div className="note-meta">
                    <div className="note-date">
                      <Calendar size={16} />
                      <span>{new Date(note.session_date).toLocaleDateString()}</span>
                    </div>
                    <div className="note-participants">
                      <div className="participant">
                        <User size={16} />
                        <span>
                          <strong>Coach:</strong>{' '}
                          {searchTerm ? (
                            <HighlightedText text={note.coach_name || 'N/A'} searchTerm={searchTerm} />
                          ) : (
                            note.coach_name || 'N/A'
                          )}
                        </span>
                      </div>
                      <div className="participant">
                        <User size={16} />
                        <span>
                          <strong>Client:</strong>{' '}
                          {searchTerm ? (
                            <HighlightedText text={note.client_name || 'N/A'} searchTerm={searchTerm} />
                          ) : (
                            note.client_name || 'N/A'
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="note-content">
                  {searchTerm ? (
                    <p><HighlightedText text={note.content || 'No content'} searchTerm={searchTerm} /></p>
                  ) : (
                    <p>{note.content || 'No content'}</p>
                  )}
                </div>
                <div className="note-footer" style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-color, #e5e7eb)'
                }}>
                  <div>
                    {note.sent ? (
                      <span className="sent-badge" style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.25rem',
                        padding: '0.25rem 0.75rem',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        color: '#22c55e',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 500
                      }}>
                        <Send size={14} />
                        Sent to Subscriber
                      </span>
                    ) : (
                      <button
                        onClick={() => handleSendNote(note)}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          padding: '0.25rem 0.75rem',
                          backgroundColor: 'transparent',
                          border: '1px solid var(--border-color, #e5e7eb)',
                          borderRadius: '6px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          color: 'var(--text-secondary, #6b7280)'
                        }}
                      >
                        <Send size={14} />
                        Send to Subscriber
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => openEditModal(note)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary, #6b7280)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Edit note"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => openDeleteModal(note)}
                      style={{
                        padding: '0.5rem',
                        backgroundColor: 'transparent',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        color: '#ef4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Delete note"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Note Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Create New Note</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowCreateModal(false)
                  resetForm()
                }}
                disabled={submitting}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateNote}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Coach *</label>
                  <select
                    value={formData.coach_id}
                    onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                    required
                    disabled={submitting}
                  >
                    <option value="">Select a coach</option>
                    {coaches.map(coach => (
                      <option key={coach.id} value={coach.id}>
                        {coach.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Client *</label>
                  <select
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    required
                    disabled={submitting}
                  >
                    <option value="">Select a client</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Session Date *</label>
                  <input
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Note Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    rows={6}
                    placeholder="Enter session notes..."
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.sent}
                      onChange={(e) => setFormData({ ...formData, sent: e.target.checked })}
                      disabled={submitting}
                    />
                    <span>Mark as sent to subscriber</span>
                    <div 
                      className="info-tooltip-wrapper"
                      style={{ position: 'relative', display: 'inline-flex', marginLeft: '4px' }}
                      title="When checked, this note will be marked as sent to the subscriber/client. This helps track which notes have been shared with the client."
                    >
                      <Info 
                        size={16} 
                        className="info-icon"
                        style={{ 
                          color: 'var(--text-secondary)', 
                          cursor: 'help',
                          flexShrink: 0
                        }}
                      />
                      <div className="info-tooltip">
                        When checked, this note will be marked as sent to the subscriber/client. 
                        This helps track which notes have been shared with the client via email or other communication channels.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Creating...' : 'Create Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {showEditModal && editingNote && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Edit Note</h2>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowEditModal(false)
                  resetForm()
                }}
                disabled={submitting}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateNote}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Coach *</label>
                  <select
                    value={formData.coach_id}
                    onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                    required
                    disabled={submitting}
                  >
                    <option value="">Select a coach</option>
                    {coaches.map(coach => (
                      <option key={coach.id} value={coach.id}>
                        {coach.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Client *</label>
                  <select
                    value={formData.user_id}
                    onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                    required
                    disabled={submitting}
                  >
                    <option value="">Select a client</option>
                    {users.map(user => (
                      <option key={user.id} value={user.id}>
                        {user.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Session Date *</label>
                  <input
                    type="date"
                    value={formData.session_date}
                    onChange={(e) => setFormData({ ...formData, session_date: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Note Content *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                    rows={6}
                    placeholder="Enter session notes..."
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.sent}
                      onChange={(e) => setFormData({ ...formData, sent: e.target.checked })}
                      disabled={submitting}
                    />
                    <span>Mark as sent to subscriber</span>
                    <div 
                      className="info-tooltip-wrapper"
                      style={{ position: 'relative', display: 'inline-flex', marginLeft: '4px' }}
                      title="When checked, this note will be marked as sent to the subscriber/client. This helps track which notes have been shared with the client."
                    >
                      <Info 
                        size={16} 
                        className="info-icon"
                        style={{ 
                          color: 'var(--text-secondary)', 
                          cursor: 'help',
                          flexShrink: 0
                        }}
                      />
                      <div className="info-tooltip">
                        When checked, this note will be marked as sent to the subscriber/client. 
                        This helps track which notes have been shared with the client via email or other communication channels.
                      </div>
                    </div>
                  </label>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => {
                    setShowEditModal(false)
                    resetForm()
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Updating...' : 'Update Note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingNote && (
        <div 
          className="modal-overlay" 
          onClick={() => !deleting && setShowDeleteModal(false)}
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Delete Note</h2>
              <button 
                className="modal-close" 
                onClick={() => !deleting && setShowDeleteModal(false)}
                disabled={deleting}
              >
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p>Are you sure you want to delete this note?</p>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary, #6b7280)', marginTop: '0.5rem' }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-danger" 
                onClick={handleDeleteNote}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Notes
