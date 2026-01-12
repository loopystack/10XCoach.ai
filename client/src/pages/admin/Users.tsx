import { useState, useEffect } from 'react'
import { Search, Eye, Shield, User as UserIcon, Trash2, X as XIcon, Mail, Building2, Calendar, Clock, Briefcase, Award, Activity } from 'lucide-react'
import { api } from '../../utils/api'
import '../PageStyles.css'
import './AdminPages.css'

interface User {
  id: number
  name: string
  email: string
  role: 'USER' | 'ADMIN' | 'COACH_ADMIN' | 'SUPER_ADMIN'
  businessName: string
  industry: string
  plan: 'Foundation' | 'Momentum' | 'Elite'
  status: 'Active' | 'Trial' | 'Canceled' | 'Past Due'
  lastLogin: string
  lastSession: string
  primaryCoach: string
}

const Users = () => {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlan, setFilterPlan] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [updatingRole, setUpdatingRole] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string>('USER')

  useEffect(() => {
    // Get current user role
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        const userRole = (user.role || 'USER').toUpperCase()
        const userEmail = (user.email || '').toLowerCase()
        // Daniel Rosario is always super admin
        if (userEmail === 'danrosario0604@gmail.com') {
          setCurrentUserRole('SUPER_ADMIN')
        } else {
          setCurrentUserRole(userRole)
        }
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }

    // Fetch users
    api.get('/api/manage-users')
      .then(data => {
        // Ensure data is an array
        if (Array.isArray(data)) {
          // Map API response to expected format
          const mappedUsers: User[] = data.map((user: any) => {
            // Daniel Rosario should always show as ADMIN
            const userEmail = (user.email || '').toLowerCase()
            const isDanielRosario = userEmail === 'danrosario0604@gmail.com'
            const userRole = (user.role || 'USER').toUpperCase() as 'USER' | 'ADMIN' | 'COACH_ADMIN' | 'SUPER_ADMIN'
            
            return {
              id: user.id,
              name: user.name || '',
              email: user.email || '',
              role: isDanielRosario ? 'SUPER_ADMIN' : userRole,
              businessName: user.businessName || '',
              industry: user.industry || '',
              plan: user.plan === 'FOUNDATION' ? 'Foundation' : user.plan === 'MOMENTUM' ? 'Momentum' : 'Elite',
              status: user.status === 'ACTIVE' ? 'Active' : user.status === 'TRIAL' ? 'Trial' : user.status === 'CANCELED' ? 'Canceled' : 'Past Due',
              lastLogin: user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never',
              lastSession: user.lastSession ? new Date(user.lastSession).toLocaleDateString() : 'Never',
              primaryCoach: user.primaryCoach?.name || 'None'
            }
          })
          setUsers(mappedUsers)
          setFilteredUsers(mappedUsers)
        } else {
          throw new Error('Invalid response format')
        }
        setLoading(false)
      })
      .catch((error: any) => {
        console.error('Failed to fetch users:', error)
        setLoading(false)
        setError(error.message || 'Failed to load users. Please check your authentication and try again.')
        setUsers([])
        setFilteredUsers([])
      })
  }, [])

  useEffect(() => {
    let filtered = users.filter(user => {
      const name = (user.name || '').toLowerCase()
      const email = (user.email || '').toLowerCase()
      const businessName = (user.businessName || '').toLowerCase()
      const searchLower = searchTerm.toLowerCase()
      
      const matchesSearch = name.includes(searchLower) ||
                           email.includes(searchLower) ||
                           businessName.includes(searchLower)
      const matchesPlan = filterPlan === 'all' || user.plan === filterPlan
      const matchesStatus = filterStatus === 'all' || user.status === filterStatus
      const matchesRole = filterRole === 'all' || user.role === filterRole
      return matchesSearch && matchesPlan && matchesStatus && matchesRole
    })
    setFilteredUsers(filtered)
  }, [searchTerm, filterPlan, filterStatus, filterRole, users])

  const handleRoleChange = async (userId: number, newRole: 'USER' | 'ADMIN' | 'COACH_ADMIN' | 'SUPER_ADMIN') => {
    // Only super admins can change roles
    if (currentUserRole !== 'SUPER_ADMIN') {
      alert('Only Super Admins can change user roles.')
      return
    }

    setUpdatingRole(userId)
    try {
      const user = users.find(u => u.id === userId)
      const userEmail = (user?.email || '').toLowerCase()
      const isDanielRosario = userEmail === 'danrosario0604@gmail.com'
      
      // Don't allow changing Daniel Rosario's role
      if (isDanielRosario) {
        alert('Cannot change role for Daniel Rosario. This user always has super admin access.')
        setUpdatingRole(null)
        return
      }
      
      const response = await api.put(`/api/manage-users/${userId}/role`, { role: newRole })
      
      // Update local state with response data
      setUsers(prevUsers => 
        prevUsers.map(user => {
          if (user.id === userId) {
            const updatedUser = {
              ...user,
              role: (response.role || newRole).toUpperCase() as 'USER' | 'ADMIN' | 'COACH_ADMIN' | 'SUPER_ADMIN'
            }
            // Apply Daniel Rosario override if needed
            const userEmail = (updatedUser.email || '').toLowerCase()
            if (userEmail === 'danrosario0604@gmail.com') {
              updatedUser.role = 'SUPER_ADMIN'
            }
            return updatedUser
          }
          return user
        })
      )
      
      // Force filtered users to update (they will auto-update via useEffect)
    } catch (error: any) {
      console.error('Failed to update user role:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to update user role. Please try again.'
      alert(errorMessage)
    } finally {
      setUpdatingRole(null)
    }
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setShowUserModal(true)
  }

  const handleDeleteUser = async (userId: number) => {
    const user = users.find(u => u.id === userId)
    const userEmail = (user?.email || '').toLowerCase()
    const isDanielRosario = userEmail === 'danrosario0604@gmail.com'
    
    // Don't allow deleting Daniel Rosario
    if (isDanielRosario) {
      alert('Cannot delete Daniel Rosario. This user always has admin access.')
      return
    }

    if (!window.confirm(`Are you sure you want to delete user "${user?.name}"? This action cannot be undone.`)) {
      return
    }

    setDeletingUserId(userId)
    try {
      await api.delete(`/api/manage-users/${userId}`)
      
      // Remove user from state
      setUsers(prevUsers => prevUsers.filter(u => u.id !== userId))
      setFilteredUsers(prevUsers => prevUsers.filter(u => u.id !== userId))
    } catch (error: any) {
      console.error('Failed to delete user:', error)
      const errorMessage = error?.response?.data?.error || error?.message || 'Failed to delete user. Please try again.'
      alert(errorMessage)
    } finally {
      setDeletingUserId(null)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Users & Subscriptions</h1>
        <p className="page-subtitle">Manage users, subscriptions, and access</p>
      </div>

      {error && (
        <div className="content-card" style={{ marginBottom: '1rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '8px', color: '#dc2626' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="content-card">
        <div className="admin-filters">
          <div className="admin-search">
            <Search size={20} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-search-input"
            />
          </div>
          <div className="admin-filter-group">
            <select
              value={filterPlan}
              onChange={(e) => setFilterPlan(e.target.value)}
              className="admin-filter-select"
            >
              <option value="all">All Plans</option>
              <option value="Foundation">Foundation</option>
              <option value="Momentum">Momentum</option>
              <option value="Elite">Elite</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="admin-filter-select"
            >
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Trial">Trial</option>
              <option value="Canceled">Canceled</option>
              <option value="Past Due">Past Due</option>
            </select>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="admin-filter-select"
            >
              <option value="all">All Roles</option>
              <option value="USER">User</option>
              <option value="COACH_ADMIN">Coach Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin (Legacy)</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Business</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Last Session</th>
                <th>Permissions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td className="user-cell">
                    <strong>{user.name}</strong>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`role-badge role-${(user.role || 'USER').toLowerCase().replace('_', '-')}`}>
                      {user.role === 'SUPER_ADMIN' ? (
                        <>
                          <Shield size={14} />
                          Super Admin
                        </>
                      ) : user.role === 'COACH_ADMIN' ? (
                        <>
                          <Shield size={14} />
                          Coach Admin
                        </>
                      ) : user.role === 'ADMIN' ? (
                        <>
                          <Shield size={14} />
                          Admin
                        </>
                      ) : (
                        <>
                          <UserIcon size={14} />
                          User
                        </>
                      )}
                    </span>
                  </td>
                  <td>
                    <div>
                      <div>{user.businessName}</div>
                      <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>{user.industry}</div>
                    </div>
                  </td>
                  <td>
                    <span className={`plan-badge plan-${(user.plan || 'Foundation').toLowerCase()}`}>
                      {user.plan || 'Foundation'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge status-${(user.status || 'Active').toLowerCase().replace(' ', '-')}`}>
                      {user.status || 'Active'}
                    </span>
                  </td>
                  <td>{user.lastLogin}</td>
                  <td>{user.lastSession}</td>
                  <td>
                    <div className="action-buttons">
                      {currentUserRole === 'SUPER_ADMIN' && (
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as 'USER' | 'ADMIN' | 'COACH_ADMIN' | 'SUPER_ADMIN')}
                          disabled={updatingRole === user.id || (user.email || '').toLowerCase() === 'danrosario0604@gmail.com'}
                          className="role-select-dropdown"
                          title={(user.email || '').toLowerCase() === 'danrosario0604@gmail.com' ? 'Cannot change - Always Super Admin' : 'Change user role'}
                        >
                          <option value="USER">User</option>
                          <option value="COACH_ADMIN">Coach Admin</option>
                          <option value="SUPER_ADMIN">Super Admin</option>
                          <option value="ADMIN">Admin (Legacy)</option>
                        </select>
                      )}
                      {currentUserRole !== 'SUPER_ADMIN' && (
                        <span className="role-display-only" style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                          {user.role === 'SUPER_ADMIN' ? 'Super Admin' : 
                           user.role === 'COACH_ADMIN' ? 'Coach Admin' : 
                           user.role === 'ADMIN' ? 'Admin' : 'User'}
                        </span>
                      )}
                      <button 
                        className="action-btn" 
                        title="View Profile"
                        onClick={() => handleViewUser(user)}
                      >
                        <Eye size={16} />
                      </button>
                      {currentUserRole === 'SUPER_ADMIN' && (
                        <button 
                          className="action-btn action-btn-danger" 
                          title="Delete User"
                          onClick={() => handleDeleteUser(user.id)}
                          disabled={deletingUserId === user.id || (user.email || '').toLowerCase() === 'danrosario0604@gmail.com'}
                          style={{
                            opacity: (user.email || '').toLowerCase() === 'danrosario0604@gmail.com' ? 0.5 : 1,
                            cursor: (user.email || '').toLowerCase() === 'danrosario0604@gmail.com' ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {deletingUserId === user.id ? (
                            <div className="spinner-small"></div>
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Info Modal */}
      {showUserModal && selectedUser && (
        <div className="user-modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="user-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="user-modal-header">
              <h2>User Information</h2>
              <button 
                className="user-modal-close"
                onClick={() => setShowUserModal(false)}
              >
                <XIcon size={20} />
              </button>
            </div>
            <div className="user-modal-body">
              {/* Profile Header */}
              <div className="user-profile-header">
                <div className="user-avatar">
                  {selectedUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="user-profile-info">
                  <h3 className="user-profile-name">{selectedUser.name}</h3>
                  <div className="user-profile-role">
                    <span className={`role-badge role-${(selectedUser.role || 'USER').toLowerCase().replace('_', '-')}`}>
                      {selectedUser.role === 'SUPER_ADMIN' ? (
                        <>
                          <Shield size={14} />
                          Super Admin
                        </>
                      ) : selectedUser.role === 'COACH_ADMIN' ? (
                        <>
                          <Shield size={14} />
                          Coach Admin
                        </>
                      ) : selectedUser.role === 'ADMIN' ? (
                        <>
                          <Shield size={14} />
                          Admin
                        </>
                      ) : (
                        <>
                          <UserIcon size={14} />
                          User
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Information Cards Grid */}
              <div className="user-info-grid">
                {/* Personal Information Card */}
                <div className="user-info-card">
                  <div className="user-info-card-header">
                    <UserIcon size={18} className="user-info-card-icon" />
                    <h4 className="user-info-card-title">Personal Information</h4>
                  </div>
                  <div className="user-info-card-content">
                    <div className="user-info-row">
                      <Mail size={16} className="user-info-row-icon" />
                      <div className="user-info-row-content">
                        <span className="user-info-row-label">Email</span>
                        <span className="user-info-row-value">{selectedUser.email}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Information Card */}
                <div className="user-info-card">
                  <div className="user-info-card-header">
                    <Building2 size={18} className="user-info-card-icon" />
                    <h4 className="user-info-card-title">Business Information</h4>
                  </div>
                  <div className="user-info-card-content">
                    <div className="user-info-row">
                      <Briefcase size={16} className="user-info-row-icon" />
                      <div className="user-info-row-content">
                        <span className="user-info-row-label">Business Name</span>
                        <span className="user-info-row-value">{selectedUser.businessName || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="user-info-row">
                      <Award size={16} className="user-info-row-icon" />
                      <div className="user-info-row-content">
                        <span className="user-info-row-label">Industry</span>
                        <span className="user-info-row-value">{selectedUser.industry || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Account Information Card */}
                <div className="user-info-card">
                  <div className="user-info-card-header">
                    <Shield size={18} className="user-info-card-icon" />
                    <h4 className="user-info-card-title">Account Details</h4>
                  </div>
                  <div className="user-info-card-content">
                    <div className="user-info-row">
                      <Award size={16} className="user-info-row-icon" />
                      <div className="user-info-row-content">
                        <span className="user-info-row-label">Plan</span>
                        <span className={`plan-badge plan-${(selectedUser.plan || 'Foundation').toLowerCase()}`}>
                          {selectedUser.plan || 'Foundation'}
                        </span>
                      </div>
                    </div>
                    <div className="user-info-row">
                      <Activity size={16} className="user-info-row-icon" />
                      <div className="user-info-row-content">
                        <span className="user-info-row-label">Status</span>
                        <span className={`status-badge status-${(selectedUser.status || 'Active').toLowerCase().replace(' ', '-')}`}>
                          {selectedUser.status || 'Active'}
                        </span>
                      </div>
                    </div>
                    <div className="user-info-row">
                      <UserIcon size={16} className="user-info-row-icon" />
                      <div className="user-info-row-content">
                        <span className="user-info-row-label">Primary Coach</span>
                        <span className="user-info-row-value">{selectedUser.primaryCoach || 'None'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Activity Information Card */}
                <div className="user-info-card">
                  <div className="user-info-card-header">
                    <Clock size={18} className="user-info-card-icon" />
                    <h4 className="user-info-card-title">Activity</h4>
                  </div>
                  <div className="user-info-card-content">
                    <div className="user-info-row">
                      <Calendar size={16} className="user-info-row-icon" />
                      <div className="user-info-row-content">
                        <span className="user-info-row-label">Last Login</span>
                        <span className="user-info-row-value">{selectedUser.lastLogin}</span>
                      </div>
                    </div>
                    <div className="user-info-row">
                      <Clock size={16} className="user-info-row-icon" />
                      <div className="user-info-row-content">
                        <span className="user-info-row-label">Last Session</span>
                        <span className="user-info-row-value">{selectedUser.lastSession}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="user-modal-footer">
              <button 
                className="user-modal-btn user-modal-btn-primary"
                onClick={() => setShowUserModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Users

