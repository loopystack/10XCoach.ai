import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, UsersRound, CheckCircle2, XCircle, Calendar, AlertCircle, Search, Filter, User } from 'lucide-react'
import { api } from '../../utils/api'
import { notify } from '../../utils/notification'
import '../PageStyles.css'
import './AdminPages.css'

interface Huddle {
  id: number
  title: string
  huddle_date: string
  date?: string
  coach_id?: number
  coachId?: number
  user_id?: number
  userId?: number
  has_short_agenda?: boolean
  hasShortAgenda?: boolean
  has_notetaker?: boolean
  hasNotetaker?: boolean
  has_action_steps?: boolean
  hasActionSteps?: boolean
  complianceLineItem1?: string
  compliance_line_item_1?: string
  complianceLineItem2?: string
  compliance_line_item_2?: string
  complianceLineItem3?: string
  compliance_line_item_3?: string
  complianceLineItem4?: string
  compliance_line_item_4?: string
  status: string
  coach_name?: string
  user_name?: string
  user_email?: string
}

interface Coach {
  id: number
  name: string
}

interface User {
  id: number
  name: string
  email: string
}

const Huddles = () => {
  const [huddles, setHuddles] = useState<Huddle[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    huddle_date: new Date().toISOString().split('T')[0],
    coach_id: '',
    user_id: '',
    has_short_agenda: false,
    has_notetaker: false,
    has_action_steps: false,
    compliance_line_item_1: '',
    compliance_line_item_2: '',
    compliance_line_item_3: '',
    compliance_line_item_4: '',
    status: 'scheduled'
  })
  const [stats, setStats] = useState<any>(null)
  
  // Filter states
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    coachId: '',
    status: '',
    compliance: '',
    startDate: '',
    endDate: ''
  })

  useEffect(() => {
    fetchHuddles()
    fetchCoaches()
    fetchUsers()
    fetchStats()
  }, [])

  useEffect(() => {
    fetchHuddles()
  }, [filters])

  const fetchHuddles = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (filters.search) params.append('search', filters.search)
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.coachId) params.append('coachId', filters.coachId)
      if (filters.status) params.append('status', filters.status)
      if (filters.startDate) params.append('startDate', filters.startDate)
      if (filters.endDate) params.append('endDate', filters.endDate)
      
      const url = `/api/huddles${params.toString() ? '?' + params.toString() : ''}`
      const data = await api.get(url)
      if (Array.isArray(data)) {
        let filteredData = data
        
        // Client-side compliance filter
        if (filters.compliance === 'compliant') {
          filteredData = data.filter(h => isCompliant(h))
        } else if (filters.compliance === 'non-compliant') {
          filteredData = data.filter(h => !isCompliant(h))
        }
        
        setHuddles(filteredData)
      }
    } catch (error) {
      console.error('Failed to fetch huddles:', error)
      notify.error('Failed to load huddles')
    } finally {
      setLoading(false)
    }
  }

  const fetchCoaches = async () => {
    try {
      const data = await api.get('/api/coaches')
      if (Array.isArray(data)) {
        setCoaches(data)
      }
    } catch (error) {
      console.error('Failed to fetch coaches:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      const data = await api.get('/api/users')
      if (Array.isArray(data)) {
        // Filter to only show regular users (not admins)
        const clientUsers = data
          .filter((user: any) => {
            const role = user.role?.toString().toUpperCase()
            return role === 'USER' || !role
          })
          .map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email
          }))
        setUsers(clientUsers)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const fetchStats = async () => {
    try {
      const data = await api.get('/api/huddles/stats')
      if (data) {
        setStats({
          total: data.total || 0,
          compliant: data.compliant || 0,
          nonCompliant: data.non_compliant || data.nonCompliant || 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      huddle_date: new Date().toISOString().split('T')[0],
      coach_id: '',
      user_id: '',
      has_short_agenda: false,
      has_notetaker: false,
      has_action_steps: false,
      compliance_line_item_1: '',
      compliance_line_item_2: '',
      compliance_line_item_3: '',
      compliance_line_item_4: '',
      status: 'scheduled'
    })
    setEditingId(null)
    setIsAdding(false)
  }

  const handleEdit = (huddle: Huddle) => {
    setFormData({
      title: huddle.title,
      huddle_date: huddle.huddle_date || huddle.date || new Date().toISOString().split('T')[0],
      coach_id: String(huddle.coach_id || huddle.coachId || ''),
      user_id: String(huddle.user_id || huddle.userId || ''),
      has_short_agenda: huddle.has_short_agenda ?? huddle.hasShortAgenda ?? false,
      has_notetaker: huddle.has_notetaker ?? huddle.hasNotetaker ?? false,
      has_action_steps: huddle.has_action_steps ?? huddle.hasActionSteps ?? false,
      status: (huddle.status || 'scheduled').toLowerCase()
    })
    setEditingId(huddle.id)
    setIsAdding(false)
  }

  const handleAdd = () => {
    resetForm()
    setIsAdding(true)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      notify.warning('Title is required')
      return
    }
    if (!formData.user_id) {
      notify.warning('User is required')
      return
    }
    if (!formData.coach_id) {
      notify.warning('Coach is required')
      return
    }

    try {
      const payload = {
        title: formData.title,
        huddle_date: formData.huddle_date,
        coach_id: parseInt(formData.coach_id),
        user_id: parseInt(formData.user_id),
        has_short_agenda: formData.has_short_agenda,
        has_notetaker: formData.has_notetaker,
        has_action_steps: formData.has_action_steps,
        status: formData.status.toLowerCase()
      }

      if (editingId) {
        await api.put(`/api/huddles/${editingId}`, payload)
        notify.success('Huddle updated successfully!')
      } else {
        await api.post('/api/huddles', payload)
        notify.success('Huddle created successfully!')
      }
      resetForm()
      fetchHuddles()
      fetchStats()
    } catch (error: any) {
      console.error('Failed to save huddle:', error)
      notify.error(error.response?.data?.error || error.message || 'Failed to save huddle')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this huddle? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/api/huddles/${id}`)
      notify.success('Huddle deleted successfully!')
      fetchHuddles()
      fetchStats()
    } catch (error: any) {
      console.error('Failed to delete huddle:', error)
      notify.error(error.response?.data?.error || error.message || 'Failed to delete huddle')
    }
  }

  const isCompliant = (huddle: Huddle) => {
    const hasAgenda = huddle.has_short_agenda ?? huddle.hasShortAgenda ?? false
    const hasNotetaker = huddle.has_notetaker ?? huddle.hasNotetaker ?? false
    const hasActions = huddle.has_action_steps ?? huddle.hasActionSteps ?? false
    return hasAgenda && hasNotetaker && hasActions
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      userId: '',
      coachId: '',
      status: '',
      compliance: '',
      startDate: '',
      endDate: ''
    })
  }

  const complianceRate = stats && stats.total > 0 
    ? Math.round((stats.compliant / stats.total) * 100) 
    : 0

  if (loading && huddles.length === 0) {
    return (
      <div className="page-container">
        <div className="loading">Loading huddles...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>Ops - 10-Minute Huddles</h1>
          <p className="page-subtitle">Manage all users' huddle meetings across the platform</p>
        </div>
        <button
          className="admin-add-button"
          onClick={handleAdd}
          title="Add New Huddle"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '12px 24px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)'
          }}
        >
          <Plus size={18} />
          <span>Add Huddle</span>
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <UsersRound size={32} />
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-label">Total Huddles</div>
              <div className="admin-stat-value">{stats.total}</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <CheckCircle2 size={32} />
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-label">Compliant</div>
              <div className="admin-stat-value">{stats.compliant}</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon">
              <AlertCircle size={32} />
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-label">Non-Compliant</div>
              <div className="admin-stat-value">{stats.nonCompliant}</div>
            </div>
          </div>
          <div className="admin-stat-card primary">
            <div className="admin-stat-icon">
              <CheckCircle2 size={32} />
            </div>
            <div className="admin-stat-content">
              <div className="admin-stat-label">Compliance Rate</div>
              <div className="admin-stat-value">{complianceRate}%</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Section */}
      <div className="content-card" style={{ marginBottom: '24px' }}>
        <div className="section-header" style={{ marginBottom: '20px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={20} />
            Filters & Search
          </h2>
        </div>
        <div className="admin-filters">
          <div className="admin-filter-group">
            <div className="admin-search">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search by title, user, or coach..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
          </div>
          <div className="admin-filter-group">
            <select
              className="admin-filter-select"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-filter-group">
            <select
              className="admin-filter-select"
              value={filters.coachId}
              onChange={(e) => setFilters({ ...filters, coachId: e.target.value })}
            >
              <option value="">All Coaches</option>
              {coaches.map(coach => (
                <option key={coach.id} value={coach.id}>
                  {coach.name}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-filter-group">
            <select
              className="admin-filter-select"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="admin-filter-group">
            <select
              className="admin-filter-select"
              value={filters.compliance}
              onChange={(e) => setFilters({ ...filters, compliance: e.target.value })}
            >
              <option value="">All Compliance</option>
              <option value="compliant">Compliant</option>
              <option value="non-compliant">Non-Compliant</option>
            </select>
          </div>
          <div className="admin-filter-group">
            <input
              type="date"
              className="admin-filter-select"
              placeholder="Start Date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            />
          </div>
          <div className="admin-filter-group">
            <input
              type="date"
              className="admin-filter-select"
              placeholder="End Date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            />
          </div>
          <div className="admin-filter-group">
            <button
              className="clear-filters-btn"
              onClick={clearFilters}
              style={{
                padding: '10px 20px',
                background: 'transparent',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s ease'
              }}
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="admin-form-card">
          <div className="admin-form-header">
            <h3>{editingId ? 'Edit Huddle' : 'Add New Huddle'}</h3>
            <button className="admin-form-close" onClick={resetForm}>
              <X size={20} />
            </button>
          </div>
          <div className="admin-form-body">
            <div className="admin-form-grid">
              <div className="admin-form-group full-width">
                <label>
                  <UsersRound size={16} />
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Huddle title..."
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>
                  <Calendar size={16} />
                  Date *
                </label>
                <input
                  type="date"
                  value={formData.huddle_date}
                  onChange={(e) => setFormData({ ...formData, huddle_date: e.target.value })}
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>
                  <User size={16} />
                  User *
                </label>
                <select
                  value={formData.user_id}
                  onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                  required
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label>
                  <UsersRound size={16} />
                  Coach *
                </label>
                <select
                  value={formData.coach_id}
                  onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                  required
                >
                  <option value="">Select Coach</option>
                  {coaches.map(coach => (
                    <option key={coach.id} value={coach.id}>
                      {coach.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label>
                  <UsersRound size={16} />
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="admin-form-group full-width">
                <label>Compliance Criteria</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.has_short_agenda}
                      onChange={(e) => setFormData({ ...formData, has_short_agenda: e.target.checked })}
                    />
                    <span>Short Agenda (3-4 items)</span>
                  </label>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.has_notetaker}
                      onChange={(e) => setFormData({ ...formData, has_notetaker: e.target.checked })}
                    />
                    <span>Notetaker Assigned</span>
                  </label>
                  <label className="admin-checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.has_action_steps}
                      onChange={(e) => setFormData({ ...formData, has_action_steps: e.target.checked })}
                    />
                    <span>Action Steps with Follow-through</span>
                  </label>
                </div>
                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
                      Line Item 1
                    </label>
                    <input
                      type="text"
                      value={formData.compliance_line_item_1}
                      onChange={(e) => setFormData({ ...formData, compliance_line_item_1: e.target.value })}
                      placeholder="Enter line item 1"
                      className="admin-form-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
                      Line Item 2
                    </label>
                    <input
                      type="text"
                      value={formData.compliance_line_item_2}
                      onChange={(e) => setFormData({ ...formData, compliance_line_item_2: e.target.value })}
                      placeholder="Enter line item 2"
                      className="admin-form-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
                      Line Item 3
                    </label>
                    <input
                      type="text"
                      value={formData.compliance_line_item_3}
                      onChange={(e) => setFormData({ ...formData, compliance_line_item_3: e.target.value })}
                      placeholder="Enter line item 3"
                      className="admin-form-input"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '14px' }}>
                      Line Item 4
                    </label>
                    <input
                      type="text"
                      value={formData.compliance_line_item_4}
                      onChange={(e) => setFormData({ ...formData, compliance_line_item_4: e.target.value })}
                      placeholder="Enter line item 4"
                      className="admin-form-input"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="admin-form-footer">
            <button
              className="admin-form-btn admin-form-btn-primary"
              onClick={handleSave}
            >
              <Save size={16} />
              <span>{editingId ? 'Update Huddle' : 'Create Huddle'}</span>
            </button>
            <button
              className="admin-form-btn"
              onClick={resetForm}
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}

      {/* Huddles Table */}
      <div className="content-card">
        <div className="section-header" style={{ marginBottom: '20px' }}>
          <h2>All Huddles ({huddles.length})</h2>
        </div>

        {huddles.length === 0 ? (
          <div className="admin-empty-state">
            <UsersRound size={48} />
            <h3>No Huddles Found</h3>
            <p>{Object.values(filters).some(f => f) ? 'Try adjusting your filters' : 'Create your first huddle to get started'}</p>
            {!Object.values(filters).some(f => f) && (
              <button className="admin-add-button" onClick={handleAdd}>
                <Plus size={16} />
                <span>Add First Huddle</span>
              </button>
            )}
          </div>
        ) : (
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Coach</th>
                  <th>Compliance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {huddles.map(huddle => {
                  const compliant = isCompliant(huddle)
                  const dateStr = huddle.huddle_date || huddle.date
                  return (
                    <tr key={huddle.id}>
                      <td>
                        <strong>{huddle.title}</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: 600 }}>{huddle.user_name || 'N/A'}</span>
                          {huddle.user_email && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {huddle.user_email}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {dateStr ? new Date(dateStr).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        }) : 'N/A'}
                      </td>
                      <td>{huddle.coach_name || 'N/A'}</td>
                      <td>
                        <span className={`compliance-badge ${compliant ? 'compliant' : 'non-compliant'}`}>
                          {compliant ? (
                            <>
                              <CheckCircle2 size={14} />
                              Compliant
                            </>
                          ) : (
                            <>
                              <XCircle size={14} />
                              Non-Compliant
                            </>
                          )}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${huddle.status || 'scheduled'}`}>
                          {(huddle.status || 'scheduled').charAt(0).toUpperCase() + (huddle.status || 'scheduled').slice(1)}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="action-btn view-btn"
                            onClick={() => handleEdit(huddle)}
                            title="Edit Huddle"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            className="action-btn delete-btn"
                            onClick={() => handleDelete(huddle.id)}
                            title="Delete Huddle"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Huddles
