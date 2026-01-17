import { useEffect, useState } from 'react'
import {
  Users,
  TrendingUp,
  Target,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Clock,
  FileText,
  Zap,
  Award,
  LineChart as LineChartIcon
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { api } from '../../utils/api'
import { notify } from '../../utils/notification'
import '../PageStyles.css'
import './AdminPages.css'

interface KPIData {
  // User Metrics
  totalUsers: number
  activeUsers: number
  newUsers: number
  userGrowthTrend: number
  
  // Engagement Metrics
  totalSessions: number
  avgSessionDuration: number
  sessionGrowthTrend: number
  totalQuizzes: number
  totalHuddles: number
  totalNotes: number
  totalTodos: number
  completedTodos: number
  totalActionSteps: number
  completedActionSteps: number
  
  // Business Health
  avgBusinessHealth: number
  pillarScores: { name: string; score: number; trend: number }[]
  
  // Plan Distribution
  planDistribution: { plan: string; count: number; revenue: number }[]
  
  // Coach Performance
  topCoaches: { name: string; sessions: number }[]
  
  // Trends
  userGrowth: { date: string; users: number }[]
  engagementTrend: { date: string; sessions: number; quizzes: number }[]
}

const Analytics = () => {
  const [kpiData, setKpiData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

  useEffect(() => {
    fetchKPIData()
  }, [period])

  const fetchKPIData = async () => {
    try {
      setLoading(true)
      const data = await api.get(`/api/manage-analytics?period=${period}`)
      
      // Transform API data to match frontend interface
      const kpiData: KPIData = {
        totalUsers: data.totalUsers || 0,
        activeUsers: data.activeUsers || 0,
        newUsers: data.newUsers || 0,
        userGrowthTrend: data.userGrowthTrend || 0,
        totalSessions: data.totalSessions || 0,
        avgSessionDuration: data.avgSessionDuration || 0,
        sessionGrowthTrend: data.sessionGrowthTrend || 0,
        totalQuizzes: data.totalQuizzes || 0,
        totalHuddles: data.totalHuddles || 0,
        totalNotes: data.totalNotes || 0,
        totalTodos: data.totalTodos || 0,
        completedTodos: data.completedTodos || 0,
        totalActionSteps: data.totalActionSteps || 0,
        completedActionSteps: data.completedActionSteps || 0,
        avgBusinessHealth: data.avgBusinessHealth || 0,
        pillarScores: data.pillarScores || [],
        planDistribution: data.planDistribution || [],
        topCoaches: data.topCoaches || [],
        userGrowth: data.userGrowth || [],
        engagementTrend: data.engagementTrend || []
      }
      
      setKpiData(kpiData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching KPI data:', error)
      notify.error('Failed to load analytics data')
      setLoading(false)
    }
  }


  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#6366f1']

  if (loading || !kpiData) {
    return (
      <div className="page-container">
        <div className="loading">Loading KPIs...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Analytics & KPIs</h1>
          <p className="page-subtitle">Comprehensive performance metrics and insights</p>
        </div>
        <div className="kpi-period-selector">
          <Calendar size={18} />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as '7d' | '30d' | '90d' | '1y')}
            className="period-select"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="kpi-primary-grid">
        <div className="kpi-primary-card users">
          <div className="kpi-primary-icon">
            <Users size={32} />
          </div>
          <div className="kpi-primary-content">
            <div className="kpi-primary-label">Total Users</div>
            <div className="kpi-primary-value">{kpiData.totalUsers.toLocaleString()}</div>
            <div className={`kpi-primary-trend ${kpiData.userGrowthTrend >= 0 ? 'positive' : 'negative'}`}>
              {kpiData.userGrowthTrend >= 0 ? <TrendingUp size={16} /> : <ArrowDownRight size={16} />}
              <span>{kpiData.userGrowthTrend >= 0 ? '+' : ''}{kpiData.userGrowthTrend.toFixed(1)}% vs last period</span>
            </div>
            <div className="kpi-primary-subtext">{kpiData.newUsers} new this period</div>
          </div>
        </div>

        <div className="kpi-primary-card engagement">
          <div className="kpi-primary-icon">
            <Activity size={32} />
          </div>
          <div className="kpi-primary-content">
            <div className="kpi-primary-label">Total Sessions</div>
            <div className="kpi-primary-value">{kpiData.totalSessions.toLocaleString()}</div>
            <div className={`kpi-primary-trend ${kpiData.sessionGrowthTrend >= 0 ? 'positive' : 'negative'}`}>
              {kpiData.sessionGrowthTrend >= 0 ? <TrendingUp size={16} /> : <ArrowDownRight size={16} />}
              <span>{kpiData.sessionGrowthTrend >= 0 ? '+' : ''}{kpiData.sessionGrowthTrend.toFixed(1)}% vs last period</span>
            </div>
            <div className="kpi-primary-subtext">Avg: {kpiData.avgSessionDuration} min</div>
          </div>
        </div>

        <div className="kpi-primary-card engagement">
          <div className="kpi-primary-icon">
            <UserCheck size={32} />
          </div>
          <div className="kpi-primary-content">
            <div className="kpi-primary-label">Active Users</div>
            <div className="kpi-primary-value">{kpiData.activeUsers.toLocaleString()}</div>
            <div className="kpi-primary-trend positive">
              <TrendingUp size={16} />
              <span>{kpiData.totalUsers > 0 ? ((kpiData.activeUsers / kpiData.totalUsers) * 100).toFixed(1) : 0}% of total</span>
            </div>
            <div className="kpi-primary-subtext">{kpiData.totalSessions.toLocaleString()} sessions</div>
          </div>
        </div>

        <div className="kpi-primary-card health">
          <div className="kpi-primary-icon">
            <Target size={32} />
          </div>
          <div className="kpi-primary-content">
            <div className="kpi-primary-label">Avg Business Health</div>
            <div className="kpi-primary-value">{kpiData.avgBusinessHealth.toFixed(1)}%</div>
            <div className="kpi-primary-trend positive">
              <Target size={16} />
              <span>{kpiData.pillarScores.length} pillars tracked</span>
            </div>
            <div className="kpi-primary-subtext">Based on quiz results</div>
          </div>
        </div>
      </div>

      {/* Secondary Metrics Grid */}
      <div className="kpi-secondary-grid">
        <div className="kpi-secondary-card">
          <div className="kpi-secondary-header">
            <UserCheck size={20} />
            <span>User Metrics</span>
          </div>
          <div className="kpi-secondary-content">
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Total Users</span>
              <span className="kpi-secondary-value">{kpiData.totalUsers.toLocaleString()}</span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">New Users</span>
              <span className="kpi-secondary-value positive">{kpiData.newUsers}</span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Active Users</span>
              <span className="kpi-secondary-value">{kpiData.activeUsers}</span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Growth Trend</span>
              <span className={`kpi-secondary-value ${kpiData.userGrowthTrend >= 0 ? 'positive' : 'negative'}`}>
                {kpiData.userGrowthTrend >= 0 ? '+' : ''}{kpiData.userGrowthTrend.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-secondary-card">
          <div className="kpi-secondary-header">
            <Clock size={20} />
            <span>Session Metrics</span>
          </div>
          <div className="kpi-secondary-content">
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Total Sessions</span>
              <span className="kpi-secondary-value">{kpiData.totalSessions.toLocaleString()}</span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Avg Duration</span>
              <span className="kpi-secondary-value">{kpiData.avgSessionDuration} min</span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Sessions/User</span>
              <span className="kpi-secondary-value">
                {kpiData.activeUsers > 0 ? (kpiData.totalSessions / kpiData.activeUsers).toFixed(1) : '0'}
              </span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Action Steps</span>
              <span className="kpi-secondary-value">
                {kpiData.completedActionSteps}/{kpiData.totalActionSteps}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-secondary-card">
          <div className="kpi-secondary-header">
            <FileText size={20} />
            <span>Content Metrics</span>
          </div>
          <div className="kpi-secondary-content">
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Quizzes Taken</span>
              <span className="kpi-secondary-value">{kpiData.totalQuizzes.toLocaleString()}</span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Huddles</span>
              <span className="kpi-secondary-value">{kpiData.totalHuddles.toLocaleString()}</span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Notes Created</span>
              <span className="kpi-secondary-value">{kpiData.totalNotes.toLocaleString()}</span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Todos Completed</span>
              <span className="kpi-secondary-value">{kpiData.completedTodos.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="kpi-charts-grid">
        <div className="kpi-chart-card">
          <div className="kpi-chart-header">
            <div className="kpi-chart-title">
              <LineChartIcon size={20} />
              <h3>User Growth</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={kpiData.userGrowth}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Area
                type="monotone"
                dataKey="users"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorUsers)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="kpi-chart-card">
          <div className="kpi-chart-header">
            <div className="kpi-chart-title">
              <BarChart3 size={20} />
              <h3>Plan Distribution</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsPieChart>
              <Pie
                data={kpiData.planDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {kpiData.planDistribution.map((_, idx) => (
                  <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </RechartsPieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="kpi-charts-grid">
        <div className="kpi-chart-card">
          <div className="kpi-chart-header">
            <div className="kpi-chart-title">
              <Activity size={20} />
              <h3>Engagement Trends</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={kpiData.engagementTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
              <YAxis stroke="#6b7280" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="sessions" stroke="#3b82f6" strokeWidth={2} name="Sessions" />
              <Line type="monotone" dataKey="quizzes" stroke="#10b981" strokeWidth={2} name="Quizzes" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Business Health Pillars */}
      <div className="content-card">
        <div className="section-header">
          <h2>Business Health Pillars</h2>
          <p className="section-subtitle">Performance across 8 key business areas</p>
        </div>
        <div className="pillars-grid">
          {kpiData.pillarScores.map((pillar, index) => (
            <div key={index} className="pillar-card">
              <div className="pillar-header">
                <span className="pillar-name">{pillar.name}</span>
                <div className="pillar-score-wrapper">
                  <span className="pillar-score">{pillar.score}%</span>
                  {pillar.trend > 0 ? (
                    <span className="pillar-trend positive">
                      <ArrowUpRight size={14} />
                      {pillar.trend}%
                    </span>
                  ) : (
                    <span className="pillar-trend negative">
                      <ArrowDownRight size={14} />
                      {Math.abs(pillar.trend)}%
                    </span>
                  )}
                </div>
              </div>
              <div className="pillar-progress">
                <div
                  className="pillar-progress-bar"
                  style={{
                    width: `${pillar.score}%`,
                    backgroundColor: COLORS[index % COLORS.length]
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Coaches */}
      <div className="content-card">
        <div className="section-header">
          <h2>Top Performing Coaches</h2>
          <p className="section-subtitle">Most active coaches by session count</p>
        </div>
        <div className="coaches-performance-list">
          {kpiData.topCoaches.map((coach, index) => (
            <div key={index} className="coach-performance-item">
              <div className="coach-performance-rank">
                <Award size={20} style={{ color: index < 3 ? '#f59e0b' : '#6b7280' }} />
                <span className="rank-number">{index + 1}</span>
              </div>
              <div className="coach-performance-info">
                <span className="coach-performance-name">{coach.name}</span>
                <span className="coach-performance-sessions">{coach.sessions} sessions</span>
              </div>
              <div className="coach-performance-rating">
                <Zap size={16} />
                <span>{coach.sessions}</span>
              </div>
              <div className="coach-performance-bar">
                <div
                  className="coach-performance-fill"
                  style={{
                    width: `${(coach.sessions / kpiData.topCoaches[0].sessions) * 100}%`
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Analytics
