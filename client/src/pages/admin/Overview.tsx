import { useEffect, useState } from 'react'
import { Users, TrendingUp, Activity, AlertTriangle, UserCheck, Clock, Target } from 'lucide-react'
import { api } from '../../utils/api'
import '../PageStyles.css'
import './AdminPages.css'

interface PillarScore {
  name: string
  score: number
}

interface CoachUsage {
  name: string
  sessions: number
  percentage: number
}

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
  pillarScores: PillarScore[]
  coachUsage: CoachUsage[]
}

const Overview = () => {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/api/manage-overview')
      .then(data => {
        if (data && typeof data.totalUsers === 'number') {
          setStats({
            activeSubscribers: data.totalUsers || 0,
            foundationPlan: data.usersByPlan?.FOUNDATION || 0,
            momentumPlan: data.usersByPlan?.MOMENTUM || 0,
            elitePlan: data.usersByPlan?.ELITE || 0,
            newSignups7d: data.recentSignups7d || 0,
            newSignups30d: data.recentSignups30d || 0,
            avgBusinessHealth: data.avgBusinessHealth || 0,
            healthTrend: data.healthTrend || 0,
            sessionsPerUser: data.sessionsPerUser || 0,
            avgSessionLength: data.avgSessionDuration || 0,
            activeUsers7d: data.activeUsers7d || 0,
            redFlagUsers: data.redFlagUsers || 0,
            inactiveUsers30d: data.inactiveUsers30d || 0,
            pillarScores: data.pillarScores || [],
            coachUsage: data.coachUsage || []
          })
        } else {
          setStats({
            activeSubscribers: 0,
            foundationPlan: 0,
            momentumPlan: 0,
            elitePlan: 0,
            newSignups7d: 0,
            newSignups30d: 0,
            avgBusinessHealth: 0,
            healthTrend: 0,
            sessionsPerUser: 0,
            avgSessionLength: 0,
            activeUsers7d: 0,
            redFlagUsers: 0,
            inactiveUsers30d: 0,
            pillarScores: [],
            coachUsage: []
          })
        }
        setLoading(false)
      })
      .catch((error) => {
        console.error('Failed to fetch overview:', error)
        setStats({
          activeSubscribers: 0,
          foundationPlan: 0,
          momentumPlan: 0,
          elitePlan: 0,
          newSignups7d: 0,
          newSignups30d: 0,
          avgBusinessHealth: 0,
          healthTrend: 0,
          sessionsPerUser: 0,
          avgSessionLength: 0,
          activeUsers7d: 0,
          redFlagUsers: 0,
          inactiveUsers30d: 0,
          pillarScores: [],
          coachUsage: []
        })
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

  // Color mapping for pillars
  const pillarColors: { [key: string]: string } = {
    'Strategy': '#3b82f6',
    'Sales': '#8b5cf6',
    'Marketing': '#ec4899',
    'CX': '#f59e0b',
    'Customer Centricity': '#f59e0b',
    'Operations': '#10b981',
    'Culture': '#06b6d4',
    'Finance': '#ef4444',
    'Exit': '#6366f1',
    'Exit Strategy': '#6366f1'
  }

  const getPillarColor = (pillarName: string): string => {
    return pillarColors[pillarName] || '#6b7280'
  }

  // Format pillar name for display
  const formatPillarName = (name: string): string => {
    return name
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

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
            <div className="admin-stat-value">{stats.avgBusinessHealth.toFixed(1)}%</div>
            {stats.healthTrend !== 0 && (
              <div className={`admin-stat-trend ${stats.healthTrend >= 0 ? 'positive' : 'negative'}`}>
                <TrendingUp size={16} />
                <span>{stats.healthTrend >= 0 ? '+' : ''}{stats.healthTrend.toFixed(1)}% vs last month</span>
              </div>
            )}
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon">
            <Activity size={32} />
          </div>
          <div className="admin-stat-content">
            <div className="admin-stat-label">Active Users</div>
            <div className="admin-stat-value">{stats.activeUsers7d}</div>
            <div className="admin-stat-subtext">Logged in last 7 days</div>
          </div>
        </div>
      </div>

      {/* Business Health Snapshot */}
      {stats.pillarScores && stats.pillarScores.length > 0 && (
        <div className="content-card">
          <div className="section-header">
            <h2>Business Health Snapshot</h2>
          </div>
          <div className="pillars-grid">
            {stats.pillarScores.map((pillar, index) => {
              const displayName = formatPillarName(pillar.name)
              const color = getPillarColor(pillar.name)
              return (
                <div key={index} className="pillar-card">
                  <div className="pillar-header">
                    <span className="pillar-name">{displayName}</span>
                    <span className="pillar-score">{pillar.score.toFixed(1)}%</span>
                  </div>
                  <div className="pillar-progress">
                    <div 
                      className="pillar-progress-bar"
                      style={{ 
                        width: `${Math.min(pillar.score, 100)}%`,
                        backgroundColor: color
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                <div className="metric-value">{stats.sessionsPerUser.toFixed(1)}</div>
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
                <div className="metric-value">{stats.activeUsers7d}</div>
                <div className="metric-subtext">At least 1 session (7d)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Coach Usage */}
        {stats.coachUsage && stats.coachUsage.length > 0 && (
          <div className="content-card">
            <div className="section-header">
              <h2>Coach Usage</h2>
            </div>
            <div className="coach-usage-list">
              {stats.coachUsage.map((coach, index) => (
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
        )}
      </div>

      {/* Red Flags Panel */}
      {(stats.redFlagUsers > 0 || stats.inactiveUsers30d > 0) && (
        <div className="content-card red-flags-card">
          <div className="section-header">
            <h2>
              <AlertTriangle size={24} style={{ color: '#ef4444', marginRight: '8px' }} />
              Red Flags Panel
            </h2>
          </div>
          <div className="red-flags-grid">
            {stats.redFlagUsers > 0 && (
              <div className="red-flag-item">
                <div className="red-flag-icon">
                  <AlertTriangle size={32} />
                </div>
                <div className="red-flag-content">
                  <div className="red-flag-label">Low Business Health</div>
                  <div className="red-flag-value">{stats.redFlagUsers} users</div>
                  <div className="red-flag-subtext">Average score &lt; 50%</div>
                </div>
              </div>
            )}
            {stats.inactiveUsers30d > 0 && (
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
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Overview
