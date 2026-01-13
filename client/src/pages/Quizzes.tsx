import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, TrendingUp, User, Award, Zap, Play, CheckCircle2, ArrowRight } from 'lucide-react'
import { Area, AreaChart, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts'
import { api } from '../utils/api'
import './PageStyles.css'
import './Dashboard.css'

const PILLAR_INFO = {
  STRATEGY: { name: 'Strategy', color: '#3b82f6', icon: '🎯', coachRole: 'STRATEGY' },
  FINANCE: { name: 'Finance', color: '#10b981', icon: '💰', coachRole: 'FINANCE' },
  MARKETING: { name: 'Marketing', color: '#f59e0b', icon: '📢', coachRole: 'MARKETING' },
  SALES: { name: 'Sales', color: '#ef4444', icon: '💼', coachRole: 'SALES' },
  OPERATIONS: { name: 'Operations', color: '#8b5cf6', icon: '⚙️', coachRole: 'OPERATIONS' },
  CULTURE: { name: 'Culture', color: '#ec4899', icon: '👥', coachRole: 'CULTURE' },
  CUSTOMER_CENTRICITY: { name: 'Customer Experience', color: '#06b6d4', icon: '❤️', coachRole: 'CUSTOMER_CENTRICITY' },
  EXIT_STRATEGY: { name: 'Exit Strategy', color: '#6366f1', icon: '🚀', coachRole: 'EXIT_STRATEGY' }
}

interface Quiz {
  id: number
  userId: number
  userName: string
  coachId: number
  coachName: string
  score: number
  date: string
  completed: boolean
}

interface QuizResult {
  id: number
  userId: number
  quizId: number
  scoresJson: { [key: string]: number }
  totalScore: number
  answersJson: any
  createdAt: string
}

const Quizzes = () => {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [quizResults, setQuizResults] = useState<QuizResult[]>([])
  const [selectedCoach, setSelectedCoach] = useState<number | null>(null)
  const [coaches, setCoaches] = useState<any[]>([])
  const [stats, setStats] = useState<any>(null)

  const fetchStats = async () => {
    try {
      const data = await api.get('/api/quizzes/stats')
      setStats(data)
    } catch (err) {
      console.error('Failed to fetch quiz stats:', err)
      setStats({ total: 0, averageScore: 0, thisMonth: 0 })
    }
  }

  const fetchQuizResults = async () => {
    try {
      const data = await api.get('/api/quiz/results')
      if (Array.isArray(data)) {
        setQuizResults(data)
      }
    } catch (err: any) {
      console.error('Failed to fetch quiz results:', err)
      // If unauthorized, clear results and don't spam errors
      if (err.message && (err.message.includes('401') || err.message.includes('Unauthorized'))) {
        setQuizResults([])
        // Don't show alert for 401 - user might not be logged in yet
        return
      }
      setQuizResults([])
    }
  }

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const data = await api.get('/api/coaches')
        if (Array.isArray(data)) {
          setCoaches(data)
        }
      } catch (err) {
        console.error('Failed to fetch coaches:', err)
      }
    }
    
    fetchCoaches()
    fetchStats()
    fetchQuizResults()
    
    // Refresh stats every 30 seconds to show new submissions
    const interval = setInterval(() => {
      fetchStats()
      fetchQuizResults()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const url = selectedCoach ? `/api/quizzes?coachId=${selectedCoach}` : '/api/quizzes'
        const data = await api.get(url)
        // Ensure data is always an array
        if (Array.isArray(data)) {
          setQuizzes(data)
        } else {
          console.warn('Quizzes data is not an array:', data)
          setQuizzes([])
        }
      } catch (err) {
        console.error('Failed to fetch quizzes:', err)
        setQuizzes([])
      }
    }
    fetchQuizzes()
  }, [selectedCoach])

  // Ensure quizzes is always an array before using reduce
  const chartData = (Array.isArray(quizzes) ? quizzes : []).reduce((acc: any, quiz) => {
    const date = quiz.date
    if (!acc[date]) {
      acc[date] = { date, count: 0, avgScore: 0, scores: [] }
    }
    acc[date].count++
    acc[date].scores.push(quiz.score)
    acc[date].avgScore = Math.round(acc[date].scores.reduce((a: number, b: number) => a + b, 0) / acc[date].scores.length)
    return acc
  }, {})

  const chartDataArray = Object.values(chartData).sort((a: any, b: any) => a.date.localeCompare(b.date))

  // Calculate score distribution from QuizResult data (user's quiz scores)
  // Ensure quizResults is always an array before using reduce
  const safeQuizResults = Array.isArray(quizResults) ? quizResults : []
  const scoreDistribution = safeQuizResults.length > 0 ? safeQuizResults.reduce((acc: any, result) => {
    const score = result.totalScore
    let category = ''
    if (score >= 80) category = 'High (80-100%)'
    else if (score >= 60) category = 'Medium (60-79%)'
    else category = 'Low (0-59%)'
    
    if (!acc[category]) acc[category] = { name: category, value: 0 }
    acc[category].value++
    return acc
  }, {}) : {}
  
  const scoreDistributionArray = Object.values(scoreDistribution)
  const scoreColors: { [key: string]: string } = {
    'High (80-100%)': '#22c55e',
    'Medium (60-79%)': '#f59e0b',
    'Low (0-59%)': '#ef4444'
  }


  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>10X Business Success Quiz</h1>
          <p className="page-subtitle">History of all business success quizzes</p>
        </div>
      </div>

      {/* Quiz Machine Section */}
      <div className="quiz-machine-section">
        <div className="quiz-machine-card">
          <div className="quiz-machine-content">
            <div className="quiz-machine-header">
              <div className="quiz-machine-icon-wrapper">
                <Zap className="quiz-machine-icon" size={32} />
                <div className="quiz-machine-icon-glow"></div>
              </div>
              <div className="quiz-machine-title-section">
                <h2 className="quiz-machine-title">
                  10X Business Success <span className="quiz-machine-title-highlight">Quiz Machine</span>
                </h2>
                <p className="quiz-machine-subtitle">
                  Assess your business across 8 key pillars and discover your growth opportunities
                </p>
              </div>
            </div>

            <div className="quiz-machine-stats">
              {stats && (
                <>
                  <div className="quiz-stat-item">
                    <div className="quiz-stat-icon">
                      <FileText size={20} />
                    </div>
                    <div className="quiz-stat-content">
                      <div className="quiz-stat-value">{stats.total || 0}</div>
                      <div className="quiz-stat-label">Total Quizzes</div>
                    </div>
                  </div>
                  <div className="quiz-stat-divider"></div>
                  <div className="quiz-stat-item">
                    <div className="quiz-stat-icon">
                      <Award size={20} />
                    </div>
                    <div className="quiz-stat-content">
                      <div className="quiz-stat-value">{stats.averageScore || 0}%</div>
                      <div className="quiz-stat-label">Average Score</div>
                    </div>
                  </div>
                  <div className="quiz-stat-divider"></div>
                  <div className="quiz-stat-item">
                    <div className="quiz-stat-icon">
                      <TrendingUp size={20} />
                    </div>
                    <div className="quiz-stat-content">
                      <div className="quiz-stat-value">{stats.thisMonth || 0}</div>
                      <div className="quiz-stat-label">This Month</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="quiz-machine-features">
              <div className="quiz-feature-item">
                <CheckCircle2 size={18} />
                <span>8 Business Pillars Assessment</span>
              </div>
              <div className="quiz-feature-item">
                <CheckCircle2 size={18} />
                <span>Personalized Insights</span>
              </div>
              <div className="quiz-feature-item">
                <CheckCircle2 size={18} />
                <span>Actionable Recommendations</span>
              </div>
            </div>

            <div className="quiz-machine-buttons">
              <button
                onClick={() => navigate('/quiz/take')}
                className="quiz-machine-start-btn primary"
              >
                <span className="quiz-btn-bg"></span>
                <span className="quiz-btn-content">
                  <Play size={24} className="quiz-btn-icon" />
                  <span className="quiz-btn-text">Full Assessment (All 8 Pillars)</span>
                  <ArrowRight size={20} className="quiz-btn-arrow" />
                </span>
                <div className="quiz-btn-shine"></div>
                <div className="quiz-btn-particles">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </button>
            </div>
          </div>
          <div className="quiz-machine-decoration">
            <div className="quiz-decoration-circle circle-1"></div>
            <div className="quiz-decoration-circle circle-2"></div>
            <div className="quiz-decoration-circle circle-3"></div>
          </div>
        </div>
      </div>

      {/* Individual Pillar Quizzes Section */}
      <div className="content-card quiz-pillars-section">
        <div className="quiz-pillars-header">
          <h2 className="quiz-pillars-title">Individual Pillar Assessments</h2>
          <p className="quiz-pillars-subtitle">
            Focus on specific areas of your business with targeted pillar quizzes
          </p>
        </div>
        
        <div className="quiz-pillars-grid">
          {Object.entries(PILLAR_INFO).map(([pillarTag, info]) => {
            // Find coach for this pillar
            const coach = coaches.find(c => c.role === info.coachRole && c.active)
            
            return (
              <div key={pillarTag} className="quiz-pillar-card">
                <div className="quiz-pillar-coach-section">
                  {coach && coach.avatar ? (
                    <>
                      <div className="quiz-pillar-coach-avatar">
                        <img 
                          src={coach.avatar} 
                          alt={coach.name}
                          className="quiz-pillar-coach-photo"
                        />
                      </div>
                      <p className="quiz-pillar-coach-name">{coach.name}</p>
                    </>
                  ) : (
                    <>
                      <div className="quiz-pillar-coach-avatar placeholder">
                        <span className="quiz-pillar-icon-fallback">{info.icon}</span>
                      </div>
                      <p className="quiz-pillar-coach-name">Coach TBA</p>
                    </>
                  )}
                </div>
                <h3 className="quiz-pillar-name">{info.name}</h3>
                <p className="quiz-pillar-description">
                  Deep dive into your {info.name.toLowerCase()} performance
                </p>
                <button
                  onClick={() => navigate(`/quiz/take?pillar=${pillarTag}`)}
                  className="quiz-pillar-btn"
                  style={{ '--pillar-color': info.color } as React.CSSProperties}
                >
                  <Play size={18} />
                  <span>Start {info.name} Quiz</span>
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Charts Section with Different Layout */}
      {stats && (
        <div className="quiz-charts-layout">
          <div className="quiz-chart-left">
            <div className="chart-container quiz-chart-full quiz-score-distribution-card">
              <div className="quiz-distribution-header">
                <h3>
                  <span className="chart-indicator-small"></span>
                  Score Distribution
                </h3>
                <div className="quiz-distribution-summary">
                  <div className="quiz-distribution-total">
                    <span className="quiz-distribution-total-label">Total Quizzes</span>
                    <span className="quiz-distribution-total-value">{safeQuizResults.length}</span>
                  </div>
                </div>
              </div>
              <div className="quiz-pie-chart-wrapper">
                <ResponsiveContainer width="100%" height={360}>
                  <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <defs>
                      <linearGradient id="highGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity={1} />
                        <stop offset="100%" stopColor="#16a34a" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="mediumGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={1} />
                      </linearGradient>
                      <linearGradient id="lowGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity={1} />
                        <stop offset="100%" stopColor="#dc2626" stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <Pie
                      data={scoreDistributionArray}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      startAngle={90}
                      endAngle={-270}
                      animationBegin={0}
                      animationDuration={1000}
                      animationEasing="ease-out"
                    >
                      {scoreDistributionArray.map((entry: any, index) => {
                        let fillColor = scoreColors[entry.name]
                        if (entry.name === 'High (80-100%)') fillColor = 'url(#highGradient)'
                        else if (entry.name === 'Medium (60-79%)') fillColor = 'url(#mediumGradient)'
                        else fillColor = 'url(#lowGradient)'
                        
                        return (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={fillColor}
                            stroke="#ffffff"
                            strokeWidth={3}
                            style={{ filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15))' }}
                          />
                        )
                      })}
                    </Pie>
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0]
                          const total = scoreDistributionArray.reduce((sum: number, item: any) => sum + item.value, 0)
                          const percentage = total > 0 ? Math.round((data.value as number / total) * 100) : 0
                          return (
                            <div className="quiz-pie-tooltip">
                              <div className="quiz-pie-tooltip-header">
                                <div 
                                  className="quiz-pie-tooltip-color" 
                                  style={{ backgroundColor: data.payload.fill }}
                                ></div>
                                <span className="quiz-pie-tooltip-label">{data.name}</span>
                              </div>
                              <div className="quiz-pie-tooltip-value">
                                <span className="quiz-pie-tooltip-count">{data.value} quizzes</span>
                                <span className="quiz-pie-tooltip-percent">{percentage}%</span>
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom"
                      align="center"
                      iconType="circle"
                      wrapperStyle={{ paddingTop: '24px' }}
                      formatter={(value, entry: any) => {
                        const total = scoreDistributionArray.reduce((sum: number, item: any) => sum + (item?.value || 0), 0)
                        const item = scoreDistributionArray.find((item: any) => item.name === value) as { name: string; value: number } | undefined
                        const percentage = total > 0 && item ? Math.round((item.value / total) * 100) : 0
                        return (
                          <span className="quiz-pie-legend-item">
                            <span className="quiz-pie-legend-color" style={{ backgroundColor: entry.color }}></span>
                            <span className="quiz-pie-legend-text">{value}</span>
                            <span className="quiz-pie-legend-value">{item?.value || 0} ({percentage}%)</span>
                          </span>
                        )
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="quiz-chart-right">
              <div className="quiz-performance-box">
              <h3 className="performance-title">Performance Metrics</h3>
              <div className="quiz-metrics-vertical">
                <div className="metric-item-vertical">
                  <div className="metric-header">
                    <span className="metric-label-vertical">High Scores (80%+)</span>
                    <span className="metric-count">{safeQuizResults.filter(r => r.totalScore >= 80).length}</span>
                  </div>
                  <div className="progress-bar-container-vertical">
                    <div 
                      className="progress-bar success"
                      style={{ width: `${(safeQuizResults.filter(r => r.totalScore >= 80).length / (safeQuizResults.length || 1)) * 100 || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="metric-item-vertical">
                  <div className="metric-header">
                    <span className="metric-label-vertical">Average Scores (60-79%)</span>
                    <span className="metric-count">{safeQuizResults.filter(r => r.totalScore >= 60 && r.totalScore < 80).length}</span>
                  </div>
                  <div className="progress-bar-container-vertical">
                    <div 
                      className="progress-bar warning"
                      style={{ width: `${(safeQuizResults.filter(r => r.totalScore >= 60 && r.totalScore < 80).length / (safeQuizResults.length || 1)) * 100 || 0}%` }}
                    ></div>
                  </div>
                </div>
                <div className="metric-item-vertical">
                  <div className="metric-header">
                    <span className="metric-label-vertical">Low Scores (0-59%)</span>
                    <span className="metric-count">{safeQuizResults.filter(r => r.totalScore < 60).length}</span>
                  </div>
                  <div className="progress-bar-container-vertical">
                    <div 
                      className="progress-bar danger"
                      style={{ width: `${(safeQuizResults.filter(r => r.totalScore < 60).length / (safeQuizResults.length || 1)) * 100 || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
              <div className="average-score-box">
                <div className="average-score-label">Average Score</div>
                <div className="average-score-large">{stats.averageScore}%</div>
              </div>
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

        <div className="chart-container quiz-main-chart">
          <h3>
            <span className="chart-indicator-small"></span>
            Quiz History & Scores Over Time
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={chartDataArray} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorQuizzesQuiz" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorScoresQuiz" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.5)" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
                tick={{ fill: '#6b7280' }}
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
                labelStyle={{ color: '#1e3a8a', fontWeight: 700, marginBottom: '8px' }}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="circle"
                formatter={(value) => <span style={{ color: '#374151', fontWeight: 600 }}>{value}</span>}
              />
              <Area 
                type="monotone" 
                dataKey="count" 
                stroke="#3b82f6" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorQuizzesQuiz)" 
                name="Quizzes Taken"
                animationDuration={1500}
                animationEasing="ease-out"
              />
              <Area 
                type="monotone" 
                dataKey="avgScore" 
                stroke="#22c55e" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorScoresQuiz)" 
                name="Average Score"
                animationDuration={1500}
                animationEasing="ease-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-container quiz-secondary-chart">
          <h3>
            <span className="chart-indicator-small"></span>
            Quiz Activity by Date
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartDataArray} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBarQuiz" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={1}/>
                  <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.8}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.5)" />
              <XAxis 
                dataKey="date" 
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
                tick={{ fill: '#6b7280' }}
              />
              <YAxis 
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
                tick={{ fill: '#6b7280' }}
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
                labelStyle={{ color: '#1e3a8a', fontWeight: 700, marginBottom: '8px' }}
                cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
              />
              <Bar 
                dataKey="count" 
                fill="url(#colorBarQuiz)" 
                name="Quizzes"
                radius={[12, 12, 0, 0]}
                animationDuration={1500}
                animationEasing="ease-out"
              >
                {chartDataArray.map((_, index) => (
                  <Cell key={`cell-${index}`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="content-card">
        <h2>Quiz History</h2>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>User</th>
                <th>Coach</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(quizzes) ? quizzes : []).map(quiz => (
                <tr key={quiz.id}>
                  <td>{new Date(quiz.date).toLocaleDateString()}</td>
                  <td>
                    <div className="user-cell">
                      <User size={16} />
                      <span>{quiz.userName}</span>
                    </div>
                  </td>
                  <td>{quiz.coachName}</td>
                  <td>
                    <span className={`score-badge ${quiz.score >= 80 ? 'high' : quiz.score >= 60 ? 'medium' : 'low'}`}>
                      {quiz.score}%
                    </span>
                  </td>
                  <td>
                    <span className="status-badge completed">Completed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Quizzes

