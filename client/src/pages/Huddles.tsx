import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UsersRound, CheckCircle2, XCircle, AlertCircle, Target, Plus, Edit2, Trash2, X, Save, Calendar } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { api } from '../utils/api'
import './PageStyles.css'

interface Huddle {
  id: number
  title: string
  date: string
  huddle_date?: string
  coachId?: number
  coach_id?: number
  userId?: number
  user_id?: number
  hasShortAgenda?: boolean
  has_short_agenda?: boolean
  hasNotetaker?: boolean
  has_notetaker?: boolean
  hasActionSteps?: boolean
  has_action_steps?: boolean
  status: string
  coach_name?: string
}

const Huddles = () => {
  const [huddles, setHuddles] = useState<Huddle[]>([])
  const [selectedCoach, setSelectedCoach] = useState<number | null>(null)
  const [coaches, setCoaches] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    huddle_date: new Date().toISOString().split('T')[0],
    coach_id: '',
    has_short_agenda: false,
    has_notetaker: false,
    has_action_steps: false,
    status: 'scheduled'
  })

  // Get current user ID
  useEffect(() => {
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setCurrentUserId(user.id || null)
      } catch (err) {
        console.error('Error parsing user data:', err)
      }
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch coaches
        try {
          const coachesData = await api.get('/api/coaches')
          if (Array.isArray(coachesData)) {
            setCoaches(coachesData)
          }
        } catch (err) {
          console.warn('Failed to fetch coaches:', err)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load huddle data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const fetchHuddles = async () => {
      if (!currentUserId) return

      try {
        setLoading(true)
        const url = selectedCoach ? `/api/huddles?coachId=${selectedCoach}` : '/api/huddles'
        
        try {
          const huddlesData = await api.get(url)
          if (Array.isArray(huddlesData)) {
            // Filter to show only current user's huddles
            const userHuddles = huddlesData.filter((h: any) => {
              const hUserId = h.user_id || h.userId
              return hUserId === currentUserId
            })
            
            // Normalize field names - handle both snake_case and camelCase
            const normalizedHuddles = userHuddles.map((h: any) => ({
              id: h.id,
              title: h.title,
              date: h.huddle_date || h.date || h.huddleDate,
              coachId: h.coach_id || h.coachId,
              userId: h.user_id || h.userId,
              hasShortAgenda: h.has_short_agenda ?? h.hasShortAgenda ?? false,
              hasNotetaker: h.has_notetaker ?? h.hasNotetaker ?? false,
              hasActionSteps: h.has_action_steps ?? h.hasActionSteps ?? false,
              status: h.status || 'scheduled',
              coach_name: h.coach_name || ''
            }))
            setHuddles(normalizedHuddles)
            
            // Calculate user-specific stats
            const total = normalizedHuddles.length
            const compliant = normalizedHuddles.filter(isCompliant).length
            const nonCompliant = total - compliant
            setStats({ total, compliant, nonCompliant })
          }
        } catch (err) {
          console.error('Failed to fetch huddles:', err)
          setError('Failed to load huddles')
        }
      } catch (err) {
        console.error('Error fetching huddles:', err)
        setError('Failed to load huddles')
      } finally {
        setLoading(false)
      }
    }

    fetchHuddles()
  }, [selectedCoach, currentUserId])

  const isCompliant = (huddle: Huddle) => {
    const hasAgenda = huddle.hasShortAgenda ?? huddle.has_short_agenda ?? false
    const hasNotetaker = huddle.hasNotetaker ?? huddle.has_notetaker ?? false
    const hasActions = huddle.hasActionSteps ?? huddle.has_action_steps ?? false
    return hasAgenda && hasNotetaker && hasActions
  }

  const resetForm = () => {
    setFormData({
      title: '',
      huddle_date: new Date().toISOString().split('T')[0],
      coach_id: '',
      has_short_agenda: false,
      has_notetaker: false,
      has_action_steps: false,
      status: 'scheduled'
    })
    setEditingId(null)
    setIsAdding(false)
  }

  const handleAdd = async () => {
    // Check access before allowing add
    try {
      const billingStatus = await api.get('/api/billing/status')
      if (!billingStatus.hasAccess) {
        alert('Your free trial has ended. Please upgrade to continue using this feature.')
        navigate('/plans', { state: { from: 'add-huddle' } })
        return
      }
    } catch (error: any) {
      console.error('Failed to check billing status:', error)
      if (error.requiresUpgrade) {
        alert('Your free trial has ended. Please upgrade to continue.')
        navigate('/plans', { state: { from: 'add-huddle' } })
        return
      }
    }
    
    resetForm()
    setIsAdding(true)
  }

  const handleEdit = (huddle: Huddle) => {
    // Convert status from uppercase enum (database) to lowercase (form)
    const statusValue = huddle.status ? huddle.status.toLowerCase() : 'scheduled'
    
    // Extract just the date part (YYYY-MM-DD) from the date string
    let dateValue = huddle.huddle_date || huddle.date || new Date().toISOString().split('T')[0]
    // If it's a full timestamp, extract just the date part
    if (dateValue.includes('T')) {
      dateValue = dateValue.split('T')[0]
    }
    // If it's a Date object string, convert it
    if (dateValue && dateValue.length > 10) {
      try {
        dateValue = new Date(dateValue).toISOString().split('T')[0]
      } catch (e) {
        dateValue = new Date().toISOString().split('T')[0]
      }
    }
    
    setFormData({
      title: huddle.title,
      huddle_date: dateValue,
      coach_id: String(huddle.coach_id || huddle.coachId || ''),
      has_short_agenda: huddle.has_short_agenda ?? huddle.hasShortAgenda ?? false,
      has_notetaker: huddle.has_notetaker ?? huddle.hasNotetaker ?? false,
      has_action_steps: huddle.has_action_steps ?? huddle.hasActionSteps ?? false,
      status: statusValue
    })
    setEditingId(huddle.id)
    setIsAdding(false)
  }

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert('Title is required')
      return
    }

    if (!currentUserId) {
      alert('User not found. Please log in again.')
      return
    }

    if (!formData.coach_id) {
      alert('Please select a coach')
      return
    }

    try {
      // Status is stored as lowercase string in database (VARCHAR, not enum)
      const statusValue = formData.status.toLowerCase()
      
      const payload = {
        title: formData.title,
        huddle_date: formData.huddle_date,
        coach_id: parseInt(formData.coach_id),
        user_id: currentUserId,
        has_short_agenda: formData.has_short_agenda,
        has_notetaker: formData.has_notetaker,
        has_action_steps: formData.has_action_steps,
        status: statusValue
      }

      if (editingId) {
        // Update existing huddle
        await api.put(`/api/huddles/${editingId}`, payload)
        alert('Huddle updated successfully!')
      } else {
        // Create new huddle
        await api.post('/api/huddles', payload)
        alert('Huddle created successfully!')
      }
      resetForm()
      // Refetch huddles
      window.location.reload()
    } catch (error: any) {
      console.error('Failed to save huddle:', error)
      alert(error.response?.data?.error || error.message || 'Failed to save huddle')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this huddle? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/api/huddles/${id}`)
      alert('Huddle deleted successfully!')
      // Refetch huddles
      window.location.reload()
    } catch (error: any) {
      console.error('Failed to delete huddle:', error)
      alert(error.response?.data?.error || error.message || 'Failed to delete huddle')
    }
  }

  const pieData = stats ? [
    { name: 'Compliant', value: stats.compliant || 0, color: '#22c55e' },
    { name: 'Non-Compliant', value: stats.nonCompliant || 0, color: '#ef4444' }
  ].filter(item => item.value > 0) : []

  // Calculate compliance rate
  const complianceRate = stats && stats.total > 0 
    ? Math.round((stats.compliant / stats.total) * 100) 
    : 0

  // Prepare monthly compliance data
  const monthlyCompliance = huddles.length > 0 ? huddles.reduce((acc: any, huddle) => {
    const dateStr = huddle.date || huddle.huddle_date
    if (!dateStr) return acc
    
    try {
      const month = new Date(dateStr).toLocaleDateString('en-US', { month: 'short' })
      if (!acc[month]) {
        acc[month] = { month, compliant: 0, total: 0 }
      }
      acc[month].total++
      if (isCompliant(huddle)) {
        acc[month].compliant++
      }
    } catch (err) {
      console.warn('Invalid date format for huddle:', huddle.id, dateStr)
    }
    return acc
  }, {}) : {}

  const monthlyData = Object.values(monthlyCompliance).map((m: any) => ({
    ...m,
    rate: m.total > 0 ? Math.round((m.compliant / m.total) * 100) : 0
  })).sort((a: any, b: any) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return months.indexOf(a.month) - months.indexOf(b.month)
  })

  if (loading && huddles.length === 0 && !currentUserId) {
    return (
      <div className="page-container">
        <div className="loading">Loading huddles...</div>
      </div>
    )
  }

  if (error && huddles.length === 0) {
    return (
      <div className="page-container">
        <div className="error-container" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
          <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>Error</h2>
          <p style={{ color: '#6b7280', maxWidth: '400px' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1>10-Minute Huddle Meetings</h1>
          <p className="page-subtitle">Track huddle compliance: Short agenda (3-4 items), Notetaker, Action steps with follow-through</p>
        </div>
        <button
          onClick={handleAdd}
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

      {/* Add/Edit Form */}
      {(isAdding || editingId) && (
        <div className="content-card" style={{ marginBottom: '24px', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ margin: 0 }}>{editingId ? 'Edit Huddle' : 'Add New Huddle'}</h2>
            <button
              onClick={resetForm}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '8px',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Huddle title..."
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Date *
              </label>
              <input
                type="date"
                value={formData.huddle_date}
                onChange={(e) => setFormData({ ...formData, huddle_date: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Coach *
              </label>
              <select
                value={formData.coach_id}
                onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                required
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="">Select Coach</option>
                {coaches.map(coach => (
                  <option key={coach.id} value={coach.id}>
                    {coach.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  background: 'var(--bg-card)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Compliance Criteria
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.has_short_agenda}
                  onChange={(e) => setFormData({ ...formData, has_short_agenda: e.target.checked })}
                />
                <span>Short Agenda (3-4 items)</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.has_notetaker}
                  onChange={(e) => setFormData({ ...formData, has_notetaker: e.target.checked })}
                />
                <span>Notetaker Assigned</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={formData.has_action_steps}
                  onChange={(e) => setFormData({ ...formData, has_action_steps: e.target.checked })}
                />
                <span>Action Steps with Follow-through</span>
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              onClick={resetForm}
              style={{
                padding: '12px 24px',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px'
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Save size={16} />
              <span>{editingId ? 'Update Huddle' : 'Create Huddle'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Stats Cards Row */}
      {stats && (
        <div className="huddle-stats-row">
          <div className="huddle-stat-card">
            <div className="huddle-stat-icon" style={{ backgroundColor: 'rgba(96, 165, 250, 0.1)', color: '#60a5fa' }}>
              <UsersRound size={28} />
            </div>
            <div className="huddle-stat-content">
              <div className="huddle-stat-label">Total Huddles</div>
              <div className="huddle-stat-value">{stats.total}</div>
            </div>
          </div>
          <div className="huddle-stat-card">
            <div className="huddle-stat-icon" style={{ backgroundColor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
              <CheckCircle2 size={28} />
            </div>
            <div className="huddle-stat-content">
              <div className="huddle-stat-label">Compliant</div>
              <div className="huddle-stat-value">{stats.compliant}</div>
            </div>
          </div>
          <div className="huddle-stat-card">
            <div className="huddle-stat-icon" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
              <AlertCircle size={28} />
            </div>
            <div className="huddle-stat-content">
              <div className="huddle-stat-label">Non-Compliant</div>
              <div className="huddle-stat-value">{stats.nonCompliant}</div>
            </div>
          </div>
          <div className="huddle-stat-card highlight">
            <div className="huddle-stat-icon" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#16a34a' }}>
              <Target size={28} />
            </div>
            <div className="huddle-stat-content">
              <div className="huddle-stat-label">Compliance Rate</div>
              <div className="huddle-stat-value-large">{complianceRate}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="section-header">
          <h2>Filter by Coach</h2>
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

        {/* Compliance Metrics Box */}
        {stats && (
          <div className="huddle-compliance-box">
            <div className="compliance-header">
              <h3>Compliance Metrics</h3>
              <div className="compliance-rate-badge">{complianceRate}%</div>
            </div>
            <div className="compliance-progress-section">
              <div className="compliance-progress-item">
                <div className="compliance-label-row">
                  <span className="compliance-label-text">Compliant Huddles</span>
                  <span className="compliance-count">{stats.compliant}</span>
                </div>
                <div className="compliance-progress-bar-wrapper">
                  <div 
                    className="compliance-progress-bar success"
                    style={{ width: `${complianceRate}%` }}
                  ></div>
                </div>
              </div>
              <div className="compliance-progress-item">
                <div className="compliance-label-row">
                  <span className="compliance-label-text">Non-Compliant Huddles</span>
                  <span className="compliance-count">{stats.nonCompliant}</span>
                </div>
                <div className="compliance-progress-bar-wrapper">
                  <div 
                    className="compliance-progress-bar danger"
                    style={{ width: `${100 - complianceRate}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {stats && stats.total > 0 && (
          <div className="huddle-charts-layout">
            <div className="huddle-chart-main">
              <div className="chart-container">
                <h3>
                  <span className="chart-indicator-small"></span>
                  Compliance Overview
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent, value }) => 
                        `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                      }
                      outerRadius={100}
                      innerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                      animationDuration={1500}
                      animationEasing="ease-out"
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{
                        background: '#ffffff',
                        border: '1px solid rgba(229, 231, 235, 0.8)',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                        padding: '12px 16px',
                        fontWeight: 600
                      }}
                      formatter={(value: any, name: string) => [
                        `${value} ${name}`,
                        name
                      ]}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      align="center"
                      iconType="square"
                      formatter={(value) => <span style={{ color: '#374151', fontWeight: 600, marginLeft: '8px' }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {monthlyData.length > 0 && (
              <div className="huddle-chart-side">
                <div className="chart-container">
                  <h3>
                    <span className="chart-indicator-small"></span>
                    Monthly Compliance Trend
                  </h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.5)" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px', fontWeight: 600 }}
                        tick={{ fill: '#6b7280' }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '12px', fontWeight: 600 }}
                        tick={{ fill: '#6b7280' }}
                        label={{ value: 'Rate (%)', angle: -90, position: 'insideLeft', style: { fontSize: '12px', fontWeight: 600, fill: '#6b7280' } }}
                      />
                      <Tooltip 
                        contentStyle={{
                          background: '#ffffff',
                          border: '1px solid rgba(229, 231, 235, 0.8)',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                          padding: '12px 16px',
                          fontWeight: 600
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="rate" 
                        stroke="#22c55e" 
                        strokeWidth={3}
                        dot={{ fill: '#22c55e', r: 4 }}
                        activeDot={{ r: 6 }}
                        animationDuration={1500}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="content-card">
        <h2>My Huddle Meetings</h2>
        {huddles.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '60px 20px',
            color: 'var(--gray-500)'
          }}>
            <UsersRound size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <p style={{ fontSize: '16px', fontWeight: 600 }}>No huddles found</p>
            <p style={{ fontSize: '14px', marginTop: '8px' }}>
              {selectedCoach ? 'Try selecting a different coach or view all coaches.' : 'Create your first huddle to get started.'}
            </p>
          </div>
        ) : (
          <div className="huddles-grid">
            {huddles.map(huddle => (
            <div key={huddle.id} className={`huddle-card ${isCompliant(huddle) ? 'compliant' : 'non-compliant'}`}>
              <div className="huddle-header">
                <h3>{huddle.title}</h3>
                <div className="huddle-header-actions">
                  <span className={`compliance-badge ${isCompliant(huddle) ? 'compliant' : 'non-compliant'}`}>
                    {isCompliant(huddle) ? 'Compliant' : 'Non-Compliant'}
                  </span>
                  <button
                    onClick={() => handleEdit(huddle)}
                    className="huddle-action-btn"
                    title="Edit Huddle"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(huddle.id)}
                    className="huddle-action-btn delete-btn"
                    title="Delete Huddle"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="huddle-card-body">
                <div className="huddle-date">
                  <Calendar size={16} />
                  <span>
                    {(() => {
                      const dateStr = huddle.date || huddle.huddle_date
                      if (!dateStr) return 'Date not available'
                      try {
                        return new Date(dateStr).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })
                      } catch {
                        return dateStr
                      }
                    })()}
                  </span>
                </div>
                {huddle.coach_name && (
                  <div className="huddle-coach-info">
                    <UsersRound size={16} />
                    <span>Coach: {huddle.coach_name}</span>
                  </div>
                )}
                <div className="criteria-list">
                  <div className={`criteria-item ${(huddle.hasShortAgenda ?? huddle.has_short_agenda) ? 'met' : 'not-met'}`}>
                    {(huddle.hasShortAgenda ?? huddle.has_short_agenda) ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    <span>Short Agenda (3-4 items)</span>
                  </div>
                  <div className={`criteria-item ${(huddle.hasNotetaker ?? huddle.has_notetaker) ? 'met' : 'not-met'}`}>
                    {(huddle.hasNotetaker ?? huddle.has_notetaker) ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    <span>Notetaker Assigned</span>
                  </div>
                  <div className={`criteria-item ${(huddle.hasActionSteps ?? huddle.has_action_steps) ? 'met' : 'not-met'}`}>
                    {(huddle.hasActionSteps ?? huddle.has_action_steps) ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                    <span>Action Steps with Follow-through</span>
                  </div>
                </div>
              </div>
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Huddles
