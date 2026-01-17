import { useState, useEffect } from 'react'
import { Bot, AlertCircle, TrendingUp, Users, MessageCircle, Target, Activity, Sparkles } from 'lucide-react'
import { api } from '../../utils/api'
import { notify } from '../../utils/notification'
import './MorganOversight.css'

interface OversightData {
  totalUsers: number
  totalCoaches: number
  activeSessions: number
  pendingHuddles: number
  alerts: Alert[]
  recommendations: Recommendation[]
  coachUserActivity: CoachUserActivity[]
  summary: string
}

interface Alert {
  id: number
  type: 'warning' | 'error' | 'info' | 'success'
  title: string
  message: string
  timestamp: string
  relatedUser?: string
  relatedCoach?: string
}

interface Recommendation {
  id: number
  type: 'coach_assignment' | 'huddle_schedule' | 'engagement' | 'performance'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  userId?: number
  coachId?: number
}

interface CoachUserActivity {
  coachId: number
  coachName: string
  userId: number
  userName: string
  sessions: number
  lastSession?: string
  engagement: number
}

const MorganOversight = () => {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<OversightData | null>(null)
  const [selectedTab, setSelectedTab] = useState<'overview' | 'alerts' | 'recommendations' | 'activity'>('overview')

  useEffect(() => {
    fetchOversightData()
  }, [])

  const fetchOversightData = async () => {
    try {
      setLoading(true)
      const response = await api.get('/api/manage-morgan-oversight')
      setData(response)
    } catch (error: any) {
      console.error('Error fetching Morgan oversight data:', error)
      notify.error('Failed to load Morgan oversight data')
      // Set default data structure
      setData({
        totalUsers: 0,
        totalCoaches: 0,
        activeSessions: 0,
        pendingHuddles: 0,
        alerts: [],
        recommendations: [],
        coachUserActivity: [],
        summary: 'No data available at this time.'
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="morgan-oversight-page">
        <div className="morgan-oversight-loading">
          <Bot size={48} className="loading-icon" />
          <p>Morgan is analyzing the data...</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="morgan-oversight-page">
        <div className="morgan-oversight-error">
          <AlertCircle size={48} />
          <p>Unable to load Morgan oversight data. Please try again later.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="morgan-oversight-page">
      <div className="morgan-oversight-header">
        <div className="morgan-oversight-header-left">
          <div className="morgan-avatar-large">
            <img src="/avatars/Morgan.png" alt="Morgan" onError={(e) => {
              const target = e.target as HTMLImageElement
              target.style.display = 'none'
            }} />
            <div className="morgan-avatar-fallback">
              <Bot size={40} />
            </div>
          </div>
          <div>
            <h1>Morgan Oversight Dashboard</h1>
            <p>AI Chief of Staff - Coach & User Management</p>
          </div>
        </div>
        <div className="morgan-oversight-header-badge">
          <Sparkles size={20} />
          <span>Active</span>
        </div>
      </div>

      {/* Summary Card */}
      <div className="morgan-summary-card">
        <div className="morgan-summary-content">
          <Bot size={24} className="morgan-icon" />
          <div>
            <h3>Morgan's Summary</h3>
            <p>{data.summary || 'System is operating normally. All coaches and users are synchronized.'}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="morgan-stats-grid">
        <div className="morgan-stat-card">
          <Users size={24} />
          <div>
            <div className="stat-value">{data.totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
        </div>
        <div className="morgan-stat-card">
          <Bot size={24} />
          <div>
            <div className="stat-value">{data.totalCoaches}</div>
            <div className="stat-label">Active Coaches</div>
          </div>
        </div>
        <div className="morgan-stat-card">
          <MessageCircle size={24} />
          <div>
            <div className="stat-value">{data.activeSessions}</div>
            <div className="stat-label">Active Sessions</div>
          </div>
        </div>
        <div className="morgan-stat-card">
          <Target size={24} />
          <div>
            <div className="stat-value">{data.pendingHuddles}</div>
            <div className="stat-label">Pending Huddles</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="morgan-tabs">
        <button
          className={`morgan-tab ${selectedTab === 'overview' ? 'active' : ''}`}
          onClick={() => setSelectedTab('overview')}
        >
          <Activity size={18} />
          Overview
        </button>
        <button
          className={`morgan-tab ${selectedTab === 'alerts' ? 'active' : ''}`}
          onClick={() => setSelectedTab('alerts')}
        >
          <AlertCircle size={18} />
          Alerts ({data.alerts.length})
        </button>
        <button
          className={`morgan-tab ${selectedTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setSelectedTab('recommendations')}
        >
          <TrendingUp size={18} />
          Recommendations ({data.recommendations.length})
        </button>
        <button
          className={`morgan-tab ${selectedTab === 'activity' ? 'active' : ''}`}
          onClick={() => setSelectedTab('activity')}
        >
          <Users size={18} />
          Coach-User Activity
        </button>
      </div>

      {/* Tab Content */}
      <div className="morgan-tab-content">
        {selectedTab === 'overview' && (
          <div className="morgan-overview">
            <p>Morgan provides continuous oversight of all coach-user interactions, ensuring optimal engagement and performance across the platform.</p>
            {data.coachUserActivity.length > 0 && (
              <div className="morgan-activity-preview">
                <h3>Recent Activity</h3>
                <div className="morgan-activity-list">
                  {data.coachUserActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} className="morgan-activity-item">
                      <div className="activity-info">
                        <strong>{activity.coachName}</strong> ↔ <strong>{activity.userName}</strong>
                      </div>
                      <div className="activity-stats">
                        <span>{activity.sessions} sessions</span>
                        <span className="activity-engagement">{activity.engagement}% engagement</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {selectedTab === 'alerts' && (
          <div className="morgan-alerts">
            {data.alerts.length === 0 ? (
              <div className="morgan-empty-state">
                <AlertCircle size={48} />
                <p>No alerts at this time. Everything looks good!</p>
              </div>
            ) : (
              <div className="morgan-alerts-list">
                {data.alerts.map((alert) => (
                  <div key={alert.id} className={`morgan-alert morgan-alert-${alert.type}`}>
                    <div className="alert-icon">
                      <AlertCircle size={20} />
                    </div>
                    <div className="alert-content">
                      <h4>{alert.title}</h4>
                      <p>{alert.message}</p>
                      {(alert.relatedUser || alert.relatedCoach) && (
                        <div className="alert-related">
                          {alert.relatedUser && <span>User: {alert.relatedUser}</span>}
                          {alert.relatedCoach && <span>Coach: {alert.relatedCoach}</span>}
                        </div>
                      )}
                      <div className="alert-timestamp">{new Date(alert.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'recommendations' && (
          <div className="morgan-recommendations">
            {data.recommendations.length === 0 ? (
              <div className="morgan-empty-state">
                <TrendingUp size={48} />
                <p>No recommendations at this time.</p>
              </div>
            ) : (
              <div className="morgan-recommendations-list">
                {data.recommendations.map((rec) => (
                  <div key={rec.id} className={`morgan-recommendation morgan-recommendation-${rec.priority}`}>
                    <div className="recommendation-icon">
                      <TrendingUp size={20} />
                    </div>
                    <div className="recommendation-content">
                      <div className="recommendation-header">
                        <h4>{rec.title}</h4>
                        <span className={`recommendation-priority priority-${rec.priority}`}>
                          {rec.priority.toUpperCase()}
                        </span>
                      </div>
                      <p>{rec.description}</p>
                      {(rec.userId || rec.coachId) && (
                        <div className="recommendation-actions">
                          {rec.userId && <span>User ID: {rec.userId}</span>}
                          {rec.coachId && <span>Coach ID: {rec.coachId}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedTab === 'activity' && (
          <div className="morgan-activity">
            {data.coachUserActivity.length === 0 ? (
              <div className="morgan-empty-state">
                <Users size={48} />
                <p>No activity data available.</p>
              </div>
            ) : (
              <div className="morgan-activity-table">
                <table>
                  <thead>
                    <tr>
                      <th>Coach</th>
                      <th>User</th>
                      <th>Sessions</th>
                      <th>Last Session</th>
                      <th>Engagement</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.coachUserActivity.map((activity, index) => (
                      <tr key={index}>
                        <td>{activity.coachName}</td>
                        <td>{activity.userName}</td>
                        <td>{activity.sessions}</td>
                        <td>{activity.lastSession ? new Date(activity.lastSession).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`engagement-badge engagement-${activity.engagement >= 70 ? 'high' : activity.engagement >= 40 ? 'medium' : 'low'}`}>
                            {activity.engagement}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default MorganOversight

