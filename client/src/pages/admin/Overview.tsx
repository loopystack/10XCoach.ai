import { useEffect, useState } from 'react'
import { Users, TrendingUp, Activity, AlertTriangle, UserCheck, Clock, Target } from 'lucide-react'
import { api } from '../../utils/api'
import '../PageStyles.css'
import './AdminPages.css'

interface OverviewStats {
  activeSubscribers: number
  foundationPlan: number
  momentumPlan: number
  elitePlan: number
  newSignups7d: number
  newSignups30d: number
  avgBusinessHealth: number
  healthTrend: number
  sessionsPerUser: number
  avgSessionLength: number
  activeUsers7d: number
  redFlagUsers: number
  inactiveUsers30d: number
}

const Overview = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const mockData: OverviewStats = {
      activeSubscribers: 1247,
      foundationPlan: 523,
      momentumPlan: 612,
      elitePlan: 112,
      newSignups7d: 47,
      newSignups30d: 189,
      avgBusinessHealth: 68.5,
      healthTrend: 4.2,
      sessionsPerUser: 3.2,
      avgSessionLength: 18,
      activeUsers7d: 72,
      redFlagUsers: 23,
      inactiveUsers30d: 89
    }

    // Fetch overview stats
    api.get('/api/admin/manage-overview')
      .then(data => {
        // Validate that data has required properties, otherwise use mock data
        if (data && typeof data.totalUsers === 'number') {
          // Map API response to expected format
          setStats({
            activeSubscribers: data.totalUsers || 0,
            foundationPlan: data.usersByPlan?.FOUNDATION || 0,
            momentumPlan: data.usersByPlan?.MOMENTUM || 0,
            elitePlan: data.usersByPlan?.ELITE || 0,
            newSignups7d: data.recentSignups || 0,
            newSignups30d: data.recentSignups || 0,
            avgBusinessHealth: data.avgBusinessHealth || 68.5,
            healthTrend: data.healthTrend || 4.2,
            sessionsPerUser: data.sessionsPerUser || 0,
            avgSessionLength: data.avgSessionDuration || 0,
            activeUsers7d: data.activeUsers || 0,
            redFlagUsers: data.redFlagUsers || 0,
            inactiveUsers30d: data.inactiveUsers30d || 0
          })
        } else {
          setStats(mockData)
        }
        setLoading(false)
      })
      .catch(() => {
        // Use mock data if API fails
        setStats(mockData)
        setLoading(false)
      })
  }, [])

  if (loading || !stats) {
    return (
      <div className="page-container">
        <div className="loading">Loading overview...</div>
      </div>
    )
  }

  const pillars = [
    { name: 'Strategy', score: 72, color: '#3b82f6' },
    { name: 'Sales', score: 65, color: '#8b5cf6' },
    { name: 'Marketing', score: 70, color: '#ec4899' },
    { name: 'CX', score: 68, color: '#f59e0b' },
    { name: 'Operations', score: 71, color: '#10b981' },
    { name: 'Culture', score: 69, color: '#06b6d4' },
    { name: 'Finance', score: 66, color: '#ef4444' },
    { name: 'Exit', score: 64, color: '#6366f1' }
  ]

  const coachUsage = [
    { name: 'Alan Wozniak', sessions: 342, percentage: 28 },
    { name: 'Rob Mercer', sessions: 298, percentage: 24 },
    { name: 'Teresa Lane', sessions: 267, percentage: 22 },
    { name: 'Camille Quinn', sessions: 156, percentage: 13 },
    { name: 'Jeffrey Wells', sessions: 98, percentage: 8 },
    { name: 'Chelsea Fox', sessions: 45, percentage: 4 },
    { name: 'Hudson Jaxon', sessions: 32, percentage: 3 },
    { name: 'Tanner Chase', sessions: 11, percentage: 1 }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Executive Overview</h1>
        <p className="page-subtitle">High-level business & coaching performance snapshot</p>
      </div>

      {/* Key Metrics Row */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card primary">
          <div className="admin-stat-icon">
            <Users size={32} />
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-label">Active Subscribers</div>
            <div className="admin-stat-value">{(stats.activeSubscribers ?? 0).toLocaleString()}</div>
            <div className="admin-stat-breakdown">
              <span>Foundation: {stats.foundationPlan}</span>
              <span>Momentum: {stats.momentumPlan}</span>
              <span>Elite: {stats.elitePlan}</span>
            </div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <TrendingUp size={32} />
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-label">New Signups</div>
            <div className="admin-stat-value">{stats.newSignups7d}</div>
            <div className="admin-stat-subtext">Last 7 days • {stats.newSignups30d} this month</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <Target size={32} />
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-label">Avg Business Health</div>
            <div className="admin-stat-value">{stats.avgBusinessHealth}%</div>
            <div className="admin-stat-trend positive">
              <TrendingUp size={16} />
              <span>+{stats.healthTrend}% vs last month</span>
            </div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <Activity size={32} />
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-label">Engagement Rate</div>
            <div className="admin-stat-value">{stats.activeUsers7d}%</div>
            <div className="admin-stat-subtext">Active in last 7 days</div>
          </div>
        </div>
      </div>

      {/* Business Health Snapshot */}
      <div className="content-card">
        <div className="section-header">
          <h2>Business Health Snapshot</h2>
        </div>
        <div className="pillars-grid">
          {pillars.map((pillar, index) => (
            <div key={index} className="pillar-card">
              <div className="pillar-header">
                <span className="pillar-name">{pillar.name}</span>
                <span className="pillar-score">{pillar.score}%</span>
              </div>
              <div className="pillar-progress">
                <div 
                  className="pillar-progress-bar"
                  style={{ 
                    width: `${pillar.score}%`,
                    backgroundColor: pillar.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="admin-metrics-row">
        <div className="content-card">
          <div className="section-header">
            <h2>Engagement Metrics</h2>
          </div>
          <div className="engagement-metrics">
            <div className="engagement-metric">
              <div className="metric-icon">
                <UserCheck size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-label">Sessions per Active User</div>
                <div className="metric-value">{stats.sessionsPerUser}</div>
                <div className="metric-subtext">Last 30 days</div>
              </div>
            </div>
            <div className="engagement-metric">
              <div className="metric-icon">
                <Clock size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-label">Avg Session Length</div>
                <div className="metric-value">{stats.avgSessionLength} min</div>
                <div className="metric-subtext">Average duration</div>
              </div>
            </div>
            <div className="engagement-metric">
              <div className="metric-icon">
                <Activity size={24} />
              </div>
              <div className="metric-content">
                <div className="metric-label">Active Users</div>
                <div className="metric-value">{stats.activeUsers7d}%</div>
                <div className="metric-subtext">At least 1 session (7d)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Coach Usage */}
        <div className="content-card">
          <div className="section-header">
            <h2>Coach Usage</h2>
          </div>
          <div className="coach-usage-list">
            {coachUsage.map((coach, index) => (
              <div key={index} className="coach-usage-item">
                <div className="coach-usage-info">
                  <span className="coach-usage-name">{coach.name}</span>
                  <span className="coach-usage-sessions">{coach.sessions} sessions</span>
                </div>
                <div className="coach-usage-bar">
                  <div 
                    className="coach-usage-fill"
                    style={{ width: `${coach.percentage}%` }}
                  />
                </div>
                <span className="coach-usage-percentage">{coach.percentage}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Red Flags Panel */}
      <div className="content-card red-flags-card">
        <div className="section-header">
          <h2>
            <AlertTriangle size={24} style={{ color: '#ef4444', marginRight: '8px' }} />
            Red Flags Panel
          </h2>
        </div>
        <div className="red-flags-grid">
          <div className="red-flag-item">
            <div className="red-flag-icon">
              <AlertTriangle size={32} />
            </div>
            <div className="red-flag-content">
              <div className="red-flag-label">Low Pillar Scores</div>
              <div className="red-flag-value">{stats.redFlagUsers} users</div>
              <div className="red-flag-subtext">Any pillar &lt; 50%</div>
            </div>
          </div>
          <div className="red-flag-item">
            <div className="red-flag-icon">
              <Users size={32} />
            </div>
            <div className="red-flag-content">
              <div className="red-flag-label">Inactive Users</div>
              <div className="red-flag-value">{stats.inactiveUsers30d} users</div>
              <div className="red-flag-subtext">No activity &gt; 30 days</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Overview

