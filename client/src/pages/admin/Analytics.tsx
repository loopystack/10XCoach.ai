import { useEffect, useState } from 'react'
import {
  Users,
  TrendingUp,
  DollarSign,
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
import '../PageStyles.css'
import './AdminPages.css'

interface KPIData {
  // User Metrics
  totalUsers: number
  activeUsers: number
  newUsers: number
  churnedUsers: number
  retentionRate: number
  
  // Subscription Metrics
  mrr: number
  arr: number
  planDistribution: { plan: string; count: number; revenue: number }[]
  
  // Engagement Metrics
  totalSessions: number
  avgSessionDuration: number
  totalQuizzes: number
  totalHuddles: number
  totalNotes: number
  totalTodos: number
  completedTodos: number
  
  // Business Health
  avgBusinessHealth: number
  pillarScores: { name: string; score: number; trend: number }[]
  
  // Coach Performance
  topCoaches: { name: string; sessions: number; rating: number }[]
  
  // Trends
  userGrowth: { date: string; users: number }[]
  revenueTrend: { date: string; revenue: number }[]
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
      // Try to fetch from API
      await api.get(`/api/admin/analytics?period=${period}`).catch(() => null)
      
      // Use mock data for now (replace with real API data when available)
      const mockData: KPIData = {
        totalUsers: 1247,
        activeUsers: 892,
        newUsers: 47,
        churnedUsers: 12,
        retentionRate: 94.2,
        mrr: 124700,
        arr: 1496400,
        planDistribution: [
          { plan: 'Foundation', count: 523, revenue: 52300 },
          { plan: 'Momentum', count: 612, revenue: 122400 },
          { plan: 'Elite', count: 112, revenue: 44800 }
        ],
        totalSessions: 3421,
        avgSessionDuration: 18,
        totalQuizzes: 892,
        totalHuddles: 1247,
        totalNotes: 2341,
        totalTodos: 3421,
        completedTodos: 2891,
        avgBusinessHealth: 68.5,
        pillarScores: [
          { name: 'Strategy', score: 72, trend: 4.2 },
          { name: 'Sales', score: 65, trend: -1.3 },
          { name: 'Marketing', score: 70, trend: 3.1 },
          { name: 'CX', score: 68, trend: 2.5 },
          { name: 'Operations', score: 71, trend: 5.1 },
          { name: 'Culture', score: 69, trend: 1.8 },
          { name: 'Finance', score: 66, trend: -0.5 },
          { name: 'Exit', score: 64, trend: 2.2 }
        ],
        topCoaches: [
          { name: 'Alan Wozniak', sessions: 342, rating: 4.9 },
          { name: 'Rob Mercer', sessions: 298, rating: 4.8 },
          { name: 'Teresa Lane', sessions: 267, rating: 4.9 },
          { name: 'Camille Quinn', sessions: 156, rating: 4.7 },
          { name: 'Jeffrey Wells', sessions: 98, rating: 4.6 }
        ],
        userGrowth: generateDateRange(period).map((date, i) => ({
          date,
          users: 1000 + i * 15 + Math.random() * 50
        })),
        revenueTrend: generateDateRange(period).map((date, i) => ({
          date,
          revenue: 100000 + i * 2000 + Math.random() * 5000
        })),
        engagementTrend: generateDateRange(period).map((date, i) => ({
          date,
          sessions: 50 + i * 2 + Math.random() * 20,
          quizzes: 30 + i * 1 + Math.random() * 10
        }))
      }
      
      setKpiData(mockData)
      setLoading(false)
    } catch (error) {
      console.error('Error fetching KPI data:', error)
      setLoading(false)
    }
  }

  const generateDateRange = (period: string): string[] => {
    const dates: string[] = []
    const now = new Date()
    let days = 30
    
    if (period === '7d') days = 7
    else if (period === '30d') days = 30
    else if (period === '90d') days = 90
    else days = 365
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
    }
    
    return dates
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
        <div className="kpi-primary-card revenue">
          <div className="kpi-primary-icon">
            <DollarSign size={32} />
          </div>
          <div className="kpi-primary-content">
            <div className="kpi-primary-label">Monthly Recurring Revenue</div>
            <div className="kpi-primary-value">${(kpiData.mrr / 1000).toFixed(1)}K</div>
            <div className="kpi-primary-trend positive">
              <TrendingUp size={16} />
              <span>+12.5% vs last month</span>
            </div>
            <div className="kpi-primary-subtext">ARR: ${(kpiData.arr / 1000000).toFixed(2)}M</div>
          </div>
        </div>

        <div className="kpi-primary-card users">
          <div className="kpi-primary-icon">
            <Users size={32} />
          </div>
          <div className="kpi-primary-content">
            <div className="kpi-primary-label">Active Users</div>
            <div className="kpi-primary-value">{kpiData.activeUsers.toLocaleString()}</div>
            <div className="kpi-primary-trend positive">
              <TrendingUp size={16} />
              <span>+{kpiData.newUsers} new this period</span>
            </div>
            <div className="kpi-primary-subtext">Retention: {kpiData.retentionRate}%</div>
          </div>
        </div>

        <div className="kpi-primary-card engagement">
          <div className="kpi-primary-icon">
            <Activity size={32} />
          </div>
          <div className="kpi-primary-content">
            <div className="kpi-primary-label">Engagement Rate</div>
            <div className="kpi-primary-value">{((kpiData.activeUsers / kpiData.totalUsers) * 100).toFixed(1)}%</div>
            <div className="kpi-primary-trend positive">
              <TrendingUp size={16} />
              <span>+3.2% vs last period</span>
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
            <div className="kpi-primary-value">{kpiData.avgBusinessHealth}%</div>
            <div className="kpi-primary-trend positive">
              <TrendingUp size={16} />
              <span>+4.2% vs last month</span>
            </div>
            <div className="kpi-primary-subtext">8 pillars tracked</div>
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
              <span className="kpi-secondary-label">Churned</span>
              <span className="kpi-secondary-value negative">{kpiData.churnedUsers}</span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Retention</span>
              <span className="kpi-secondary-value">{kpiData.retentionRate}%</span>
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
              <span className="kpi-secondary-value">{(kpiData.totalSessions / kpiData.activeUsers).toFixed(1)}</span>
            </div>
            <div className="kpi-secondary-item">
              <span className="kpi-secondary-label">Completion Rate</span>
              <span className="kpi-secondary-value">{((kpiData.completedTodos / kpiData.totalTodos) * 100).toFixed(1)}%</span>
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
              <h3>Revenue Trend</h3>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kpiData.revenueTrend}>
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
                formatter={(value: number) => `$${(value / 1000).toFixed(1)}K`}
              />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="kpi-charts-grid">
        <div className="kpi-chart-card">
          <div className="kpi-chart-header">
            <div className="kpi-chart-title">
              <PieChart size={20} />
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
                <span>{coach.rating}</span>
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
