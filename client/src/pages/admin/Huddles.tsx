/**
 * Admin: Huddles
 * Manages ALL users' 10-minute huddles across the platform.
 * Uses /api/manage-huddles (admin-only). Not the same as the dashboard /huddles page.
 */
import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, UsersRound, CheckCircle2, XCircle, AlertCircle, Search, Filter } from 'lucide-react'
import { api } from '../../utils/api'
import { notify } from '../../utils/notification'
import '../PageStyles.css'
import './AdminPages.css'

interface HuddleRow {
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
  compliance_line_item_1?: string
  compliance_line_item_2?: string
  compliance_line_item_3?: string
  compliance_line_item_4?: string
  status: string
  coach_name?: string
  user_name?: string
  user_email?: string
}

interface Coach { id: number; name: string }
interface UserOpt { id: number; name: string; email: string }

const AdminHuddles = () => {
  const [list, setList] = useState<HuddleRow[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [users, setUsers] = useState<UserOpt[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
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
  const [stats, setStats] = useState<{ total: number; compliant: number; nonCompliant: number } | null>(null)
  const [filters, setFilters] = useState({
    search: '',
    userId: '',
    coachId: '',
    status: '',
    compliance: '',
    startDate: '',
    endDate: ''
  })

  const load = () => {
    const q = new URLSearchParams()
    if (filters.search) q.set('search', filters.search)
    if (filters.userId) q.set('userId', filters.userId)
    if (filters.coachId) q.set('coachId', filters.coachId)
    if (filters.status) q.set('status', filters.status)
    if (filters.compliance) q.set('compliance', filters.compliance)
    if (filters.startDate) q.set('startDate', filters.startDate)
    if (filters.endDate) q.set('endDate', filters.endDate)
    setLoading(true)
    api.get(`/api/manage-huddles${q.toString() ? '?' + q.toString() : ''}`)
      .then((d: any) => Array.isArray(d) && setList(d))
      .catch(() => notify.error('Failed to load huddles'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(); }, [filters])
  useEffect(() => {
    api.get('/api/manage-huddles/stats').then((d: any) => setStats({
      total: d?.total ?? 0,
      compliant: d?.compliant ?? 0,
      nonCompliant: d?.non_compliant ?? d?.nonCompliant ?? 0
    })).catch(() => {})
    api.get('/api/coaches').then((d: any) => Array.isArray(d) && setCoaches(d)).catch(() => {})
    api.get('/api/users').then((d: any) => {
      if (!Array.isArray(d)) return
      const u = d.filter((x: any) => !x.role || String(x.role).toUpperCase() === 'USER')
      setUsers(u.map((x: any) => ({ id: x.id, name: x.name, email: x.email })))
    }).catch(() => {})
  }, [])

  const resetForm = () => {
    setForm({
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
    setShowForm(false)
  }

  const onEdit = (h: HuddleRow) => {
    setForm({
      title: h.title,
      huddle_date: h.huddle_date || h.date || new Date().toISOString().split('T')[0],
      coach_id: String(h.coach_id ?? h.coachId ?? ''),
      user_id: String(h.user_id ?? h.userId ?? ''),
      has_short_agenda: !!(h.has_short_agenda ?? h.hasShortAgenda),
      has_notetaker: !!(h.has_notetaker ?? h.hasNotetaker),
      has_action_steps: !!(h.has_action_steps ?? h.hasActionSteps),
      compliance_line_item_1: h.compliance_line_item_1 ?? '',
      compliance_line_item_2: h.compliance_line_item_2 ?? '',
      compliance_line_item_3: h.compliance_line_item_3 ?? '',
      compliance_line_item_4: h.compliance_line_item_4 ?? '',
      status: (h.status || 'scheduled').toLowerCase()
    })
    setEditingId(h.id)
    setShowForm(true)
  }

  const onSave = async () => {
    if (!form.title.trim()) { notify.warning('Title is required'); return }
    if (!form.user_id) { notify.warning('User is required'); return }
    if (!form.coach_id) { notify.warning('Coach is required'); return }
    const payload = {
      title: form.title,
      huddle_date: form.huddle_date,
      coach_id: parseInt(form.coach_id),
      user_id: parseInt(form.user_id),
      has_short_agenda: form.has_short_agenda,
      has_notetaker: form.has_notetaker,
      has_action_steps: form.has_action_steps,
      compliance_line_item_1: form.compliance_line_item_1,
      compliance_line_item_2: form.compliance_line_item_2,
      compliance_line_item_3: form.compliance_line_item_3,
      compliance_line_item_4: form.compliance_line_item_4,
      status: form.status.toLowerCase()
    }
    try {
      if (editingId) {
        await api.put(`/api/manage-huddles/${editingId}`, payload)
        notify.success('Huddle updated')
      } else {
        await api.post('/api/manage-huddles', payload)
        notify.success('Huddle created')
      }
      resetForm()
      load()
      api.get('/api/manage-huddles/stats').then((d: any) => setStats({
        total: d?.total ?? 0,
        compliant: d?.compliant ?? 0,
        nonCompliant: d?.non_compliant ?? d?.nonCompliant ?? 0
      })).catch(() => {})
    } catch (e: any) {
      notify.error(e?.response?.data?.error || e?.message || 'Failed to save')
    }
  }

  const onDelete = async (id: number) => {
    if (!confirm('Delete this huddle? This cannot be undone.')) return
    try {
      await api.delete(`/api/manage-huddles/${id}`)
      notify.success('Huddle deleted')
      load()
      api.get('/api/manage-huddles/stats').then((d: any) => setStats({
        total: d?.total ?? 0,
        compliant: d?.compliant ?? 0,
        nonCompliant: d?.non_compliant ?? d?.nonCompliant ?? 0
      })).catch(() => {})
    } catch (e: any) {
      notify.error(e?.response?.data?.error || e?.message || 'Failed to delete')
    }
  }

  const isCompliant = (h: HuddleRow) =>
    !!(h.has_short_agenda ?? h.hasShortAgenda) &&
    !!(h.has_notetaker ?? h.hasNotetaker) &&
    !!(h.has_action_steps ?? h.hasActionSteps)

  const complianceRate = stats && stats.total > 0 ? Math.round((stats.compliant / stats.total) * 100) : 0

  return (
    <div className="page-container">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '24px' }}>
        <div>
          <h1>Huddles</h1>
          <p className="page-subtitle">Manage all users' 10-minute huddles</p>
        </div>
        <button
          className="admin-add-button"
          onClick={() => { resetForm(); setShowForm(true); }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)' }}
        >
          <Plus size={18} />
          Add Huddle
        </button>
      </div>

      {stats && (
        <div className="admin-stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="admin-stat-card">
            <div className="admin-stat-icon"><UsersRound size={28} /></div>
            <div className="admin-stat-content">
              <div className="admin-stat-label">Total</div>
              <div className="admin-stat-value">{stats.total}</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon"><CheckCircle2 size={28} /></div>
            <div className="admin-stat-content">
              <div className="admin-stat-label">Compliant</div>
              <div className="admin-stat-value">{stats.compliant}</div>
            </div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-icon"><AlertCircle size={28} /></div>
            <div className="admin-stat-content">
              <div className="admin-stat-label">Non-Compliant</div>
              <div className="admin-stat-value">{stats.nonCompliant}</div>
            </div>
          </div>
          <div className="admin-stat-card primary">
            <div className="admin-stat-content">
              <div className="admin-stat-label">Compliance</div>
              <div className="admin-stat-value">{complianceRate}%</div>
            </div>
          </div>
        </div>
      )}

      <div className="content-card" style={{ marginBottom: '16px' }}>
        <div className="section-header" style={{ marginBottom: '12px' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Filter size={18} /> Filters</h2>
        </div>
        <div className="admin-filters" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
          <div className="admin-search" style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 220px' }}>
            <Search size={16} />
            <input type="text" placeholder="Search title, user, coach…" value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text)' }} />
          </div>
          <select className="admin-filter-select" value={filters.userId} onChange={e => setFilters(f => ({ ...f, userId: e.target.value }))} style={{ minWidth: '140px' }}>
            <option value="">All users</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="admin-filter-select" value={filters.coachId} onChange={e => setFilters(f => ({ ...f, coachId: e.target.value }))} style={{ minWidth: '140px' }}>
            <option value="">All coaches</option>
            {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="admin-filter-select" value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))} style={{ minWidth: '120px' }}>
            <option value="">All status</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select className="admin-filter-select" value={filters.compliance} onChange={e => setFilters(f => ({ ...f, compliance: e.target.value }))} style={{ minWidth: '130px' }}>
            <option value="">All compliance</option>
            <option value="compliant">Compliant</option>
            <option value="non-compliant">Non-Compliant</option>
          </select>
          <input type="date" className="admin-filter-select" value={filters.startDate} onChange={e => setFilters(f => ({ ...f, startDate: e.target.value }))} style={{ minWidth: '140px' }} />
          <input type="date" className="admin-filter-select" value={filters.endDate} onChange={e => setFilters(f => ({ ...f, endDate: e.target.value }))} style={{ minWidth: '140px' }} />
          <button type="button" onClick={() => setFilters({ search: '', userId: '', coachId: '', status: '', compliance: '', startDate: '', endDate: '' })} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '13px' }}>Clear</button>
        </div>
      </div>

      {showForm && (
        <div className="admin-form-card" style={{ marginBottom: '24px', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>{editingId ? 'Edit Huddle' : 'New Huddle'}</h3>
            <button type="button" onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Title *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Huddle title" required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Date *</label>
              <input type="date" value={form.huddle_date} onChange={e => setForm(f => ({ ...f, huddle_date: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>User *</label>
              <select value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <option value="">Select</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Coach *</label>
              <select value={form.coach_id} onChange={e => setForm(f => ({ ...f, coach_id: e.target.value }))} required style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <option value="">Select</option>
                {coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500 }}>Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>Compliance</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px', marginBottom: '6px' }}>
              <input type="checkbox" checked={form.has_short_agenda} onChange={e => setForm(f => ({ ...f, has_short_agenda: e.target.checked }))} />
              <span>Short agenda</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px', marginBottom: '6px' }}>
              <input type="checkbox" checked={form.has_notetaker} onChange={e => setForm(f => ({ ...f, has_notetaker: e.target.checked }))} />
              <span>Notetaker</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <input type="checkbox" checked={form.has_action_steps} onChange={e => setForm(f => ({ ...f, has_action_steps: e.target.checked }))} />
              <span>Action steps</span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginTop: '12px' }}>
              <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Line 1</label><input type="text" value={form.compliance_line_item_1} onChange={e => setForm(f => ({ ...f, compliance_line_item_1: e.target.value }))} placeholder="Line item 1" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Line 2</label><input type="text" value={form.compliance_line_item_2} onChange={e => setForm(f => ({ ...f, compliance_line_item_2: e.target.value }))} placeholder="Line item 2" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Line 3</label><input type="text" value={form.compliance_line_item_3} onChange={e => setForm(f => ({ ...f, compliance_line_item_3: e.target.value }))} placeholder="Line item 3" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }} /></div>
              <div><label style={{ display: 'block', marginBottom: '4px', fontSize: '13px' }}>Line 4</label><input type="text" value={form.compliance_line_item_4} onChange={e => setForm(f => ({ ...f, compliance_line_item_4: e.target.value }))} placeholder="Line item 4" style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border-color)' }} /></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onSave} className="admin-form-btn admin-form-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Save size={16} />{editingId ? 'Update' : 'Create'}
            </button>
            <button type="button" onClick={resetForm} className="admin-form-btn"><X size={16} /> Cancel</button>
          </div>
        </div>
      )}

      <div className="content-card">
        <div className="section-header" style={{ marginBottom: '16px' }}>
          <h2>All huddles ({list.length})</h2>
        </div>

        {loading && list.length === 0 ? (
          <div className="loading">Loading…</div>
        ) : list.length === 0 ? (
          <div className="admin-empty-state">
            <UsersRound size={40} />
            <h3>No huddles</h3>
            <p>{Object.values(filters).some(Boolean) ? 'Try changing filters' : 'Create one to get started'}</p>
            {!Object.values(filters).some(Boolean) && (
              <button className="admin-add-button" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} /> Add Huddle</button>
            )}
          </div>
        ) : (
          <div className="admin-table-container" style={{ overflowX: 'auto' }}>
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
                {list.map(h => {
                  const ok = isCompliant(h)
                  const d = h.huddle_date || h.date
                  return (
                    <tr key={h.id}>
                      <td><strong>{h.title}</strong></td>
                      <td>
                        <div>
                          <div style={{ fontWeight: 600 }}>{h.user_name || '—'}</div>
                          {h.user_email && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{h.user_email}</div>}
                        </div>
                      </td>
                      <td>{d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</td>
                      <td>{h.coach_name || '—'}</td>
                      <td>
                        <span className={`compliance-badge ${ok ? 'compliant' : 'non-compliant'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                          {ok ? <><CheckCircle2 size={12} /> Compliant</> : <><XCircle size={12} /> Non-compliant</>}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge status-${h.status || 'scheduled'}`} style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '12px', textTransform: 'capitalize' }}>{h.status || 'scheduled'}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" className="action-btn view-btn" onClick={() => onEdit(h)} title="Edit"><Edit2 size={14} /></button>
                          <button type="button" className="action-btn delete-btn" onClick={() => onDelete(h.id)} title="Delete"><Trash2 size={14} /></button>
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

export default AdminHuddles
