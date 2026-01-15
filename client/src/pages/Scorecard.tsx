import { useEffect, useState } from 'react'
import { 
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react'
import { api } from '../utils/api'
import './Dashboard.css'

interface Huddle {
  id: number
  title: string
  huddle_date: string
  has_short_agenda: boolean
  has_notetaker: boolean
  has_action_steps: boolean
  status: string
}

interface Todo {
  id: number
  title: string
  due_date?: string | null
  dueDate?: string | null
  priority: string
  status: string
}

const Scorecard = () => {
  const [huddles, setHuddles] = useState<Huddle[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [quizResults, setQuizResults] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [notes, setNotes] = useState<any[]>([])
  const [scorecardView, setScorecardView] = useState<'monthly' | 'quarterly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Revenue Target and Actual Sales State
  interface RevenueData {
    annual: number
    quarterly: number
    monthly: number
    weekly: number
    daily: number
  }

  const loadRevenueData = (key: string): RevenueData => {
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        return { annual: 0, quarterly: 0, monthly: 0, weekly: 0, daily: 0 }
      }
    }
    return { annual: 0, quarterly: 0, monthly: 0, weekly: 0, daily: 0 }
  }

  const saveRevenueData = (key: string, data: RevenueData) => {
    localStorage.setItem(key, JSON.stringify(data))
  }

  const [revenueTargets, setRevenueTargets] = useState<RevenueData>(() => loadRevenueData('revenue_targets'))
  const [actualSales, setActualSales] = useState<RevenueData>(() => loadRevenueData('actual_sales'))
  const [editingRevenue, setEditingRevenue] = useState<{ type: 'target' | 'actual', period: keyof RevenueData } | null>(null)
  const [revenueEditValue, setRevenueEditValue] = useState('')
  
  // Get annual revenue target for backward compatibility
  const annualRevenueTarget = revenueTargets.annual
  
  // Format currency
  const formatCurrency = (amount: number): string => {
    if (amount === 0) return '-'
    if (amount >= 1000000) {
      return `$${(amount / 1000000).toFixed(2)}M`
    } else if (amount >= 1000) {
      return `$${(amount / 1000).toFixed(1)}K`
    }
    return `$${amount.toFixed(0)}`
  }

  // Handle revenue value update
  const handleRevenueEdit = (type: 'target' | 'actual', period: keyof RevenueData) => {
    const currentValue = type === 'target' ? revenueTargets[period] : actualSales[period]
    setEditingRevenue({ type, period })
    setRevenueEditValue(currentValue > 0 ? currentValue.toString() : '')
  }

  const handleRevenueSave = () => {
    if (!editingRevenue) return
    
    const value = parseFloat(revenueEditValue.replace(/[^0-9.]/g, ''))
    if (!isNaN(value) && value >= 0) {
      if (editingRevenue.type === 'target') {
        const newTargets = { ...revenueTargets, [editingRevenue.period]: value }
        setRevenueTargets(newTargets)
        saveRevenueData('revenue_targets', newTargets)
      } else {
        const newActuals = { ...actualSales, [editingRevenue.period]: value }
        setActualSales(newActuals)
        saveRevenueData('actual_sales', newActuals)
      }
    }
    setEditingRevenue(null)
    setRevenueEditValue('')
  }

  const handleRevenueCancel = () => {
    setEditingRevenue(null)
    setRevenueEditValue('')
  }

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch huddles
        try {
          const huddlesData = await api.get('/api/huddles')
          if (Array.isArray(huddlesData)) {
            setHuddles(huddlesData)
          }
        } catch (err) {
          console.warn('Failed to fetch huddles:', err)
        }

        // Fetch todos
        try {
          const todosData = await api.get('/api/todos')
          if (Array.isArray(todosData)) {
            setTodos(todosData)
          }
        } catch (err) {
          console.warn('Failed to fetch todos:', err)
        }

        // Fetch quiz results
        try {
          const quizResultsData = await api.get('/api/quiz/results')
          if (Array.isArray(quizResultsData)) {
            setQuizResults(quizResultsData)
          }
        } catch (err) {
          console.warn('Failed to fetch quiz results:', err)
        }

        // Fetch sessions
        try {
          const sessionsData = await api.get('/api/sessions')
          if (Array.isArray(sessionsData)) {
            setSessions(sessionsData)
          }
        } catch (err) {
          console.warn('Failed to fetch sessions:', err)
        }

        // Fetch notes
        try {
          const notesData = await api.get('/api/notes')
          if (Array.isArray(notesData)) {
            setNotes(notesData)
          }
        } catch (err) {
          console.warn('Failed to fetch notes:', err)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to load scorecard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Scorecard calculation functions
  const getScorecardMetrics = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Helper to get date range based on view
    const getDateRange = (period: 'monthly' | 'quarterly' | 'annual') => {
      if (period === 'monthly') {
        const months: Date[] = []
        for (let i = 5; i >= 0; i--) {
          const date = new Date(currentYear, currentMonth - i, 1)
          months.push(date)
        }
        return months
      } else if (period === 'quarterly') {
        const quarters: Date[] = []
        const currentQuarter = Math.floor(currentMonth / 3)
        for (let i = 5; i >= 0; i--) {
          const quarter = currentQuarter - i
          const year = currentYear + Math.floor(quarter / 4)
          const month = (quarter % 4) * 3
          quarters.push(new Date(year, month, 1))
        }
        return quarters
      } else {
        const years: Date[] = []
        for (let i = 4; i >= 0; i--) {
          years.push(new Date(currentYear - i, 0, 1))
        }
        return years
      }
    }

    const periods = getDateRange(scorecardView)
    
    // Quiz Scores (month over month)
    const quizScoresByPeriod = periods.map(periodStart => {
      const periodEnd = scorecardView === 'monthly' 
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
        : scorecardView === 'quarterly'
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 3, 0)
        : new Date(periodStart.getFullYear() + 1, 0, 0)
      
      const periodQuizzes = quizResults.filter(qr => {
        const quizDate = new Date(qr.createdAt)
        return quizDate >= periodStart && quizDate <= periodEnd
      })
      
      const avgScore = periodQuizzes.length > 0
        ? periodQuizzes.reduce((sum, q) => sum + (q.totalScore || 0), 0) / periodQuizzes.length
        : 0
      
      return {
        period: periodStart,
        count: periodQuizzes.length,
        average: Math.round(avgScore),
        total: periodQuizzes.length
      }
    })

    // Huddles
    const huddlesByPeriod = periods.map(periodStart => {
      const periodEnd = scorecardView === 'monthly' 
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
        : scorecardView === 'quarterly'
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 3, 0)
        : new Date(periodStart.getFullYear() + 1, 0, 0)
      
      const periodHuddles = huddles.filter(h => {
        const huddleDate = new Date(h.huddle_date)
        return huddleDate >= periodStart && huddleDate <= periodEnd
      })
      
      const compliant = periodHuddles.filter(h => 
        h.has_short_agenda && h.has_notetaker && h.has_action_steps
      ).length
      
      return {
        period: periodStart,
        count: periodHuddles.length,
        compliant: compliant,
        complianceRate: periodHuddles.length > 0 ? Math.round((compliant / periodHuddles.length) * 100) : 0
      }
    })

    // Sessions
    const sessionsByPeriod = periods.map(periodStart => {
      const periodEnd = scorecardView === 'monthly' 
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
        : scorecardView === 'quarterly'
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 3, 0)
        : new Date(periodStart.getFullYear() + 1, 0, 0)
      
      const periodSessions = sessions.filter(s => {
        const sessionDate = new Date(s.startTime || s.start_time || s.createdAt)
        return sessionDate >= periodStart && sessionDate <= periodEnd
      })
      
      return {
        period: periodStart,
        count: periodSessions.length
      }
    })

    // Todos
    const todosByPeriod = periods.map(periodStart => {
      const periodEnd = scorecardView === 'monthly' 
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
        : scorecardView === 'quarterly'
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 3, 0)
        : new Date(periodStart.getFullYear() + 1, 0, 0)
      
      const periodTodos = todos.filter(t => {
        const todoDate = new Date(t.due_date || t.dueDate || '')
        return todoDate >= periodStart && todoDate <= periodEnd
      })
      
      const completed = periodTodos.filter(t => 
        (t.status || '').toUpperCase() === 'COMPLETED'
      ).length
      
      return {
        period: periodStart,
        count: periodTodos.length,
        completed: completed,
        completionRate: periodTodos.length > 0 ? Math.round((completed / periodTodos.length) * 100) : 0
      }
    })

    // Notes
    const notesByPeriod = periods.map(periodStart => {
      const periodEnd = scorecardView === 'monthly' 
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 1, 0)
        : scorecardView === 'quarterly'
        ? new Date(periodStart.getFullYear(), periodStart.getMonth() + 3, 0)
        : new Date(periodStart.getFullYear() + 1, 0, 0)
      
      const periodNotes = notes.filter(n => {
        const noteDate = new Date(n.session_date || n.createdAt)
        return noteDate >= periodStart && noteDate <= periodEnd
      })
      
      return {
        period: periodStart,
        count: periodNotes.length
      }
    })

    // Revenue Target by Period (based on annual target)
    const revenueTargetsByPeriod = periods.map(periodStart => {
      // Calculate target for this period based on view type
      let target = 0
      if (scorecardView === 'monthly') {
        target = revenueTargets.monthly
      } else if (scorecardView === 'quarterly') {
        target = revenueTargets.quarterly
      } else {
        target = revenueTargets.annual
      }
      
      // TODO: Fetch actual revenue for each period from API
      // For now, using placeholder - in production, this should come from revenue tracking API
      const actualRevenue = 0 // Placeholder for actual revenue data
      const achievementRate = target > 0 ? Math.round((actualRevenue / target) * 100) : 0
      
      return {
        period: periodStart,
        target: target,
        actual: actualRevenue,
        achievementRate: achievementRate
      }
    })
    
    return {
      periods,
      quizScores: quizScoresByPeriod,
      huddles: huddlesByPeriod,
      sessions: sessionsByPeriod,
      todos: todosByPeriod,
      notes: notesByPeriod,
      revenueTargets: revenueTargetsByPeriod
    }
  }

  const getTrend = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 'up' : 'neutral'
    const change = ((current - previous) / previous) * 100
    if (change > 5) return 'up'
    if (change < -5) return 'down'
    return 'neutral'
  }

  const formatPeriodLabel = (date: Date) => {
    if (scorecardView === 'monthly') {
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    } else if (scorecardView === 'quarterly') {
      const quarter = Math.floor(date.getMonth() / 3) + 1
      return `Q${quarter} ${date.getFullYear()}`
    } else {
      return date.getFullYear().toString()
    }
  }

  const scorecardData = getScorecardMetrics()

  // Calculate overall grade with transparent, explainable scoring
  const calculateOverallGrade = () => {
    const latestPeriodIndex = scorecardData.periods.length - 1

    // Get latest values for each metric
    const quizScore = scorecardData.quizScores[latestPeriodIndex]?.average || 0
    const huddleCompliance = scorecardData.huddles[latestPeriodIndex]?.complianceRate || 0
    const sessionCount = scorecardData.sessions[latestPeriodIndex]?.count || 0
    const todoCompletion = scorecardData.todos[latestPeriodIndex]?.completionRate || 0
    const notesCount = scorecardData.notes[latestPeriodIndex]?.count || 0
    
    // Get revenue achievement rate if revenue target is set
    const revenueAchievement = annualRevenueTarget > 0 && scorecardData.revenueTargets.length > 0
      ? scorecardData.revenueTargets[latestPeriodIndex]?.achievementRate || 0
      : null
    
    // Transparent scoring system with clear targets:
    // 1. Quiz Score (0-100): Already normalized, target ≥70%
    // 2. Huddle Compliance (0-100): Already normalized, target ≥80%
    // 3. Coach Sessions: Target is 4/month (or 1/week), normalize: (count / 4) * 100, capped at 100%
    const normalizedSessions = Math.min((sessionCount / 4) * 100, 100)
    // 4. Todo Completion (0-100): Already normalized, target ≥85%
    // 5. Notes: Target is 1 per session, normalize: (notes / sessions) * 100, capped at 100%
    const sessionTarget = Math.max(sessionCount, 1) // Avoid division by zero
    const normalizedNotes = Math.min((notesCount / sessionTarget) * 100, 100)
    
    // Calculate weighted average with equal weights
    // Core BOS metrics (always included):
    const coreMetrics = [
      { name: 'Quiz Score', value: quizScore, weight: 0.25 },
      { name: 'Huddle Compliance', value: huddleCompliance, weight: 0.25 },
      { name: 'Coach Sessions', value: normalizedSessions, weight: 0.20 },
      { name: 'Todo Completion', value: todoCompletion, weight: 0.20 },
      { name: 'Notetaking', value: normalizedNotes, weight: 0.10 }
    ]
    
    // Add revenue if target is set (reduces weight of other metrics proportionally)
    let overallGrade = 0
    if (revenueAchievement !== null) {
      // Adjust weights when revenue is included
      const adjustedWeights = coreMetrics.map(m => ({ ...m, weight: m.weight * 0.85 }))
      overallGrade = adjustedWeights.reduce((sum, m) => sum + (m.value * m.weight), 0) + (revenueAchievement * 0.15)
    } else {
      overallGrade = coreMetrics.reduce((sum, m) => sum + (m.value * m.weight), 0)
    }
    
    overallGrade = Math.round(overallGrade)
    
    return Math.min(Math.max(overallGrade, 0), 100) // Clamp between 0-100
  }
  
  // Get grade breakdown for transparency
  const getGradeBreakdown = () => {
    const latestPeriodIndex = scorecardData.periods.length - 1
    const quizScore = scorecardData.quizScores[latestPeriodIndex]?.average || 0
    const huddleCompliance = scorecardData.huddles[latestPeriodIndex]?.complianceRate || 0
    const sessionCount = scorecardData.sessions[latestPeriodIndex]?.count || 0
    const todoCompletion = scorecardData.todos[latestPeriodIndex]?.completionRate || 0
    const notesCount = scorecardData.notes[latestPeriodIndex]?.count || 0
    const revenueAchievement = annualRevenueTarget > 0 && scorecardData.revenueTargets.length > 0
      ? scorecardData.revenueTargets[latestPeriodIndex]?.achievementRate || 0
      : null
    
    const normalizedSessions = Math.min((sessionCount / 4) * 100, 100)
    const sessionTarget = Math.max(sessionCount, 1)
    const normalizedNotes = Math.min((notesCount / sessionTarget) * 100, 100)
    
    return {
      quizScore: { value: quizScore, target: 70, weight: revenueAchievement !== null ? 21.25 : 25 },
      huddleCompliance: { value: huddleCompliance, target: 80, weight: revenueAchievement !== null ? 21.25 : 25 },
      sessions: { value: normalizedSessions, target: 100, weight: revenueAchievement !== null ? 17 : 20 },
      todoCompletion: { value: todoCompletion, target: 85, weight: revenueAchievement !== null ? 17 : 20 },
      notes: { value: normalizedNotes, target: 100, weight: revenueAchievement !== null ? 8.5 : 10 },
      revenue: revenueAchievement !== null ? { value: revenueAchievement, target: 100, weight: 15 } : null
    }
  }

  const overallGrade = calculateOverallGrade()

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <h1>10X <span className="blue">Scorecard</span></h1>
          <p className="page-subtitle">Loading scorecard data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="page-header">
          <h1>10X <span className="blue">Scorecard</span></h1>
          <p className="page-subtitle" style={{ color: '#ef4444' }}>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>10X <span className="blue">Scorecard</span></h1>
        <p className="page-subtitle">Track your Business Operating System (BOS) activities and performance metrics</p>
      </div>

      {/* 10X Scorecard */}
      <div className="dashboard-scorecard-section">
        {/* Overall Grade Display with Transparent Breakdown */}
        <div className="scorecard-grade-display">
          <div className="scorecard-grade-circle">
            <div className="scorecard-grade-number">{overallGrade}</div>
            <div className="scorecard-grade-label">Overall BOS Grade</div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)', marginTop: '4px', textAlign: 'center' }}>
              Business Operating System
            </div>
          </div>
          <div className="scorecard-grade-metrics">
            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Grade Calculation
              </div>
              <div style={{ fontSize: '12px', color: 'var(--gray-600)', lineHeight: '1.6' }}>
                Based on 5 core BOS activities{annualRevenueTarget > 0 ? ' + Revenue Target' : ''}. 
                Each metric contributes proportionally to your overall grade.
              </div>
            </div>
            {(() => {
              const breakdown = getGradeBreakdown()
              return (
                <>
                  <div className="scorecard-grade-metric">
                    <span className="metric-label">Quiz Score</span>
                    <span className="metric-value">{breakdown.quizScore.value.toFixed(0)}%</span>
                    <span style={{ fontSize: '10px', color: 'var(--gray-500)' }}>Target: {breakdown.quizScore.target}%</span>
                  </div>
                  <div className="scorecard-grade-metric">
                    <span className="metric-label">Huddle Compliance</span>
                    <span className="metric-value">{breakdown.huddleCompliance.value.toFixed(0)}%</span>
                    <span style={{ fontSize: '10px', color: 'var(--gray-500)' }}>Target: {breakdown.huddleCompliance.target}%</span>
                  </div>
                  <div className="scorecard-grade-metric">
                    <span className="metric-label">Coach Sessions</span>
                    <span className="metric-value">{scorecardData.sessions[scorecardData.sessions.length - 1]?.count || 0}</span>
                    <span style={{ fontSize: '10px', color: 'var(--gray-500)' }}>Target: 4/{scorecardView === 'monthly' ? 'month' : scorecardView === 'quarterly' ? 'quarter' : 'year'}</span>
                  </div>
                  <div className="scorecard-grade-metric">
                    <span className="metric-label">Todo Completion</span>
                    <span className="metric-value">{breakdown.todoCompletion.value.toFixed(0)}%</span>
                    <span style={{ fontSize: '10px', color: 'var(--gray-500)' }}>Target: {breakdown.todoCompletion.target}%</span>
                  </div>
                  <div className="scorecard-grade-metric">
                    <span className="metric-label">Notetaking</span>
                    <span className="metric-value">{scorecardData.notes[scorecardData.notes.length - 1]?.count || 0}</span>
                    <span style={{ fontSize: '10px', color: 'var(--gray-500)' }}>Target: 1 per session</span>
                  </div>
                  {breakdown.revenue && (
                    <div className="scorecard-grade-metric">
                      <span className="metric-label">Revenue Target</span>
                      <span className="metric-value">{breakdown.revenue.value.toFixed(0)}%</span>
                      <span style={{ fontSize: '10px', color: 'var(--gray-500)' }}>Target: {breakdown.revenue.target}%</span>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>

        <div className="scorecard-header">
          <div>
            <h2>10X Business Operating System (BOS) Scorecard</h2>
            <p className="scorecard-subtitle">
              Track your core BOS activities across 5 key areas: Assessment (Quizzes), Team Alignment (Huddles), 
              Coaching Engagement (Sessions), Execution (Todos), and Documentation (Notes). 
              {annualRevenueTarget > 0 && ' Revenue performance is also included.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            <div className="scorecard-view-toggle">
              <button 
                className={scorecardView === 'monthly' ? 'active' : ''}
                onClick={() => setScorecardView('monthly')}
              >
                Monthly
              </button>
              <button 
                className={scorecardView === 'quarterly' ? 'active' : ''}
                onClick={() => setScorecardView('quarterly')}
              >
                Quarterly
              </button>
              <button 
                className={scorecardView === 'annual' ? 'active' : ''}
                onClick={() => setScorecardView('annual')}
              >
                Annual
              </button>
            </div>
          </div>
        </div>

        {/* Metric Categories Section */}
        <div style={{ marginBottom: '24px', padding: '20px', background: 'var(--gray-100)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '12px', color: 'var(--gray-900)' }}>
            📊 Scorecard Organization
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '13px', color: 'var(--gray-700)' }}>
            <div>
              <strong style={{ color: 'var(--gray-900)' }}>1. Assessment:</strong> Business Success Quiz
            </div>
            <div>
              <strong style={{ color: 'var(--gray-900)' }}>2. Team Alignment:</strong> 10-Minute Huddles
            </div>
            <div>
              <strong style={{ color: 'var(--gray-900)' }}>3. Coaching:</strong> Coach Sessions
            </div>
            <div>
              <strong style={{ color: 'var(--gray-900)' }}>4. Execution:</strong> To-Do Completion
            </div>
            <div>
              <strong style={{ color: 'var(--gray-900)' }}>5. Documentation:</strong> 10X Notetaking
            </div>
            {annualRevenueTarget > 0 && (
              <div>
                <strong style={{ color: 'var(--gray-900)' }}>6. Financial:</strong> Revenue Target
              </div>
            )}
          </div>
        </div>

        <div className="scorecard-table-container">
          <table className="scorecard-table">
            <thead>
              <tr>
                <th className="scorecard-trend-col">Trend</th>
                <th className="scorecard-title-col">BOS Activity</th>
                <th className="scorecard-okr-col">Target</th>
                <th className="scorecard-avg-col">Average</th>
                <th className="scorecard-total-col">Total</th>
                {scorecardData.periods.map((period, idx) => (
                  <th key={idx} className="scorecard-period-col">
                    {formatPeriodLabel(period)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* 1. Assessment: Business Success Quiz Score */}
              <tr>
                <td className="scorecard-trend-col">
                  {scorecardData.quizScores.length >= 2 && (() => {
                    const trend = getTrend(
                      scorecardData.quizScores[scorecardData.quizScores.length - 1].average,
                      scorecardData.quizScores[scorecardData.quizScores.length - 2].average
                    )
                    if (trend === 'up') return <TrendingUp size={16} className="trend-up" />
                    if (trend === 'down') return <TrendingDown size={16} className="trend-down" />
                    return <Minus size={16} className="trend-neutral" />
                  })()}
                </td>
                <td className="scorecard-title-col">
                  <div>
                    <strong>1. Assessment: Business Success Quiz</strong>
                    <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px', fontWeight: 'normal' }}>
                      Measures your business health across 8 pillars (Strategy, Finance, Marketing, Sales, Operations, Culture, Customer Experience, Exit Strategy)
                    </div>
                  </div>
                </td>
                <td className="scorecard-okr-col">
                  <span className="okr-badge">≥ 70%</span>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
                    Weight: {getGradeBreakdown().quizScore.weight}%
                  </div>
                </td>
                <td className="scorecard-avg-col">
                  {scorecardData.quizScores.length > 0 
                    ? Math.round(scorecardData.quizScores.reduce((sum, q) => sum + q.average, 0) / scorecardData.quizScores.length)
                    : 0}%
                </td>
                <td className="scorecard-total-col">
                  {scorecardData.quizScores.reduce((sum, q) => sum + q.count, 0)}
                </td>
                {scorecardData.quizScores.map((quiz, idx) => (
                  <td key={idx} className="scorecard-period-col">
                    {quiz.average > 0 ? `${quiz.average}%` : '-'}
                  </td>
                ))}
              </tr>

              {/* 2. Team Alignment: 10-Minute Huddles */}
              <tr>
                <td className="scorecard-trend-col">
                  {scorecardData.huddles.length >= 2 && (() => {
                    const trend = getTrend(
                      scorecardData.huddles[scorecardData.huddles.length - 1].complianceRate,
                      scorecardData.huddles[scorecardData.huddles.length - 2].complianceRate
                    )
                    if (trend === 'up') return <TrendingUp size={16} className="trend-up" />
                    if (trend === 'down') return <TrendingDown size={16} className="trend-down" />
                    return <Minus size={16} className="trend-neutral" />
                  })()}
                </td>
                <td className="scorecard-title-col">
                  <div>
                    <strong>2. Team Alignment: 10-Minute Huddles</strong>
                    <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px', fontWeight: 'normal' }}>
                      Weekly team meetings with agenda, notetaker, and action steps
                    </div>
                  </div>
                </td>
                <td className="scorecard-okr-col">
                  <span className="okr-badge">≥ 80% Compliance</span>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
                    Weight: {getGradeBreakdown().huddleCompliance.weight}%
                  </div>
                </td>
                <td className="scorecard-avg-col">
                  {scorecardData.huddles.length > 0
                    ? Math.round(scorecardData.huddles.reduce((sum, h) => sum + h.complianceRate, 0) / scorecardData.huddles.length)
                    : 0}%
                </td>
                <td className="scorecard-total-col">
                  {scorecardData.huddles.reduce((sum, h) => sum + h.count, 0)}
                </td>
                {scorecardData.huddles.map((huddle, idx) => (
                  <td key={idx} className="scorecard-period-col">
                    {huddle.count > 0 ? `${huddle.complianceRate}%` : '-'}
                  </td>
                ))}
              </tr>

              {/* 3. Coaching: Coach Sessions */}
              <tr>
                <td className="scorecard-trend-col">
                  {scorecardData.sessions.length >= 2 && (() => {
                    const trend = getTrend(
                      scorecardData.sessions[scorecardData.sessions.length - 1].count,
                      scorecardData.sessions[scorecardData.sessions.length - 2].count
                    )
                    if (trend === 'up') return <TrendingUp size={16} className="trend-up" />
                    if (trend === 'down') return <TrendingDown size={16} className="trend-down" />
                    return <Minus size={16} className="trend-neutral" />
                  })()}
                </td>
                <td className="scorecard-title-col">
                  <div>
                    <strong>3. Coaching: Coach Sessions</strong>
                    <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px', fontWeight: 'normal' }}>
                      Voice conversations with AI coaches for strategic guidance and problem-solving
                    </div>
                  </div>
                </td>
                <td className="scorecard-okr-col">
                  <span className="okr-badge">≥ 4/{scorecardView === 'monthly' ? 'Month' : scorecardView === 'quarterly' ? 'Quarter' : 'Year'}</span>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
                    Weight: {getGradeBreakdown().sessions.weight}%
                  </div>
                </td>
                <td className="scorecard-avg-col">
                  {scorecardData.sessions.length > 0
                    ? Math.round(scorecardData.sessions.reduce((sum, s) => sum + s.count, 0) / scorecardData.sessions.length)
                    : 0}
                </td>
                <td className="scorecard-total-col">
                  {scorecardData.sessions.reduce((sum, s) => sum + s.count, 0)}
                </td>
                {scorecardData.sessions.map((session, idx) => (
                  <td key={idx} className="scorecard-period-col">
                    {session.count > 0 ? session.count : '-'}
                  </td>
                ))}
              </tr>

              {/* 4. Execution: To-Do Tasks Completion */}
              <tr>
                <td className="scorecard-trend-col">
                  {scorecardData.todos.length >= 2 && (() => {
                    const trend = getTrend(
                      scorecardData.todos[scorecardData.todos.length - 1].completionRate,
                      scorecardData.todos[scorecardData.todos.length - 2].completionRate
                    )
                    if (trend === 'up') return <TrendingUp size={16} className="trend-up" />
                    if (trend === 'down') return <TrendingDown size={16} className="trend-down" />
                    return <Minus size={16} className="trend-neutral" />
                  })()}
                </td>
                <td className="scorecard-title-col">
                  <div>
                    <strong>4. Execution: To-Do Tasks Completion</strong>
                    <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px', fontWeight: 'normal' }}>
                      Action items and tasks from huddles, sessions, and coaching conversations
                    </div>
                  </div>
                </td>
                <td className="scorecard-okr-col">
                  <span className="okr-badge">≥ 85%</span>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
                    Weight: {getGradeBreakdown().todoCompletion.weight}%
                  </div>
                </td>
                <td className="scorecard-avg-col">
                  {scorecardData.todos.length > 0
                    ? Math.round(scorecardData.todos.reduce((sum, t) => sum + t.completionRate, 0) / scorecardData.todos.length)
                    : 0}%
                </td>
                <td className="scorecard-total-col">
                  {scorecardData.todos.reduce((sum, t) => sum + t.count, 0)}
                </td>
                {scorecardData.todos.map((todo, idx) => (
                  <td key={idx} className="scorecard-period-col">
                    {todo.count > 0 ? `${todo.completionRate}%` : '-'}
                  </td>
                ))}
              </tr>

              {/* 5. Documentation: 10X Notetaking */}
              <tr>
                <td className="scorecard-trend-col">
                  {scorecardData.notes.length >= 2 && (() => {
                    const trend = getTrend(
                      scorecardData.notes[scorecardData.notes.length - 1].count,
                      scorecardData.notes[scorecardData.notes.length - 2].count
                    )
                    if (trend === 'up') return <TrendingUp size={16} className="trend-up" />
                    if (trend === 'down') return <TrendingDown size={16} className="trend-down" />
                    return <Minus size={16} className="trend-neutral" />
                  })()}
                </td>
                <td className="scorecard-title-col">
                  <div>
                    <strong>5. Documentation: 10X Notetaking</strong>
                    <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px', fontWeight: 'normal' }}>
                      Notes automatically created from coach sessions, capturing key insights and action items
                    </div>
                  </div>
                </td>
                <td className="scorecard-okr-col">
                  <span className="okr-badge">≥ 1 per Session</span>
                  <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
                    Weight: {getGradeBreakdown().notes.weight}%
                  </div>
                </td>
                <td className="scorecard-avg-col">
                  {scorecardData.notes.length > 0
                    ? Math.round(scorecardData.notes.reduce((sum, n) => sum + n.count, 0) / scorecardData.notes.length)
                    : 0}
                </td>
                <td className="scorecard-total-col">
                  {scorecardData.notes.reduce((sum, n) => sum + n.count, 0)}
                </td>
                {scorecardData.notes.map((note, idx) => (
                  <td key={idx} className="scorecard-period-col">
                    {note.count > 0 ? note.count : '-'}
                  </td>
                ))}
              </tr>

              {/* 6. Financial: Revenue Target (Optional) */}
              {annualRevenueTarget > 0 && (
                <tr>
                  <td className="scorecard-trend-col">
                    {scorecardData.revenueTargets.length >= 2 && (() => {
                      const trend = getTrend(
                        scorecardData.revenueTargets[scorecardData.revenueTargets.length - 1].achievementRate,
                        scorecardData.revenueTargets[scorecardData.revenueTargets.length - 2].achievementRate
                      )
                      if (trend === 'up') return <TrendingUp size={16} className="trend-up" />
                      if (trend === 'down') return <TrendingDown size={16} className="trend-down" />
                      return <Minus size={16} className="trend-neutral" />
                    })()}
                  </td>
                  <td className="scorecard-title-col">
                    <div>
                      <strong>6. Financial: Revenue Target</strong>
                      <div style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px', fontWeight: 'normal' }}>
                        {scorecardView === 'monthly' && `Target: ${formatCurrency(revenueTargets.monthly)}/month`}
                        {scorecardView === 'quarterly' && `Target: ${formatCurrency(revenueTargets.quarterly)}/quarter`}
                        {scorecardView === 'annual' && `Target: ${formatCurrency(revenueTargets.annual)}/year`}
                      </div>
                    </div>
                  </td>
                  <td className="scorecard-okr-col">
                    <span className="okr-badge">≥ 100%</span>
                    <div style={{ fontSize: '11px', color: 'var(--gray-500)', marginTop: '4px' }}>
                      Weight: {getGradeBreakdown().revenue?.weight || 0}%
                    </div>
                  </td>
                  <td className="scorecard-avg-col">
                    {scorecardData.revenueTargets.length > 0
                      ? Math.round(scorecardData.revenueTargets.reduce((sum, r) => sum + r.achievementRate, 0) / scorecardData.revenueTargets.length)
                      : 0}%
                  </td>
                  <td className="scorecard-total-col">
                    {scorecardData.revenueTargets.length > 0
                      ? formatCurrency(scorecardData.revenueTargets.reduce((sum, r) => sum + r.actual, 0))
                      : '-'}
                  </td>
                  {scorecardData.revenueTargets.map((revenue, idx) => (
                    <td key={idx} className="scorecard-period-col">
                      {revenue.target > 0 ? (
                        <div>
                          <div style={{ fontWeight: 600 }}>
                            {revenue.achievementRate}%
                          </div>
                          <div style={{ fontSize: '11px', color: '#666' }}>
                            {formatCurrency(revenue.actual)} / {formatCurrency(revenue.target)}
                          </div>
                        </div>
                      ) : '-'}
                    </td>
                  ))}
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Revenue Tracking Table */}
        <div style={{ marginTop: '40px', padding: '24px', background: 'var(--gray-100)', borderRadius: '12px', border: '1px solid var(--gray-200)' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '20px', color: 'var(--gray-900)' }}>
            6. Financial: Revenue Target & Actual Sales
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '20px' }}>
            Set your revenue targets and track actual sales for each time period. Click on any value to edit.
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
              <thead>
                <tr style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                  <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '14px', border: 'none' }}>Period</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '14px', border: 'none' }}>Annual</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '14px', border: 'none' }}>Quarterly</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '14px', border: 'none' }}>Monthly</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '14px', border: 'none' }}>Weekly</th>
                  <th style={{ padding: '12px', textAlign: 'right', fontWeight: 600, fontSize: '14px', border: 'none' }}>Daily</th>
                </tr>
              </thead>
              <tbody>
                {/* Annual Revenue Target Row */}
                <tr style={{ borderBottom: '1px solid var(--gray-200)' }}>
                  <td style={{ padding: '14px', fontWeight: 600, color: 'var(--gray-900)', fontSize: '14px' }}>
                    Annual Revenue Target:
                  </td>
                  {(['annual', 'quarterly', 'monthly', 'weekly', 'daily'] as const).map((period) => (
                    <td key={period} style={{ padding: '14px', textAlign: 'right' }}>
                      {editingRevenue?.type === 'target' && editingRevenue.period === period ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <input
                            type="text"
                            value={revenueEditValue}
                            onChange={(e) => setRevenueEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRevenueSave()
                              if (e.key === 'Escape') handleRevenueCancel()
                            }}
                            autoFocus
                            style={{
                              width: '120px',
                              padding: '6px 10px',
                              border: '2px solid #667eea',
                              borderRadius: '6px',
                              fontSize: '14px',
                              textAlign: 'right'
                            }}
                          />
                          <button
                            onClick={handleRevenueSave}
                            style={{
                              padding: '6px 12px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleRevenueCancel}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleRevenueEdit('target', period)}
                          style={{
                            cursor: 'pointer',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: 'var(--gray-50)',
                            color: 'var(--gray-900)',
                            fontWeight: 600,
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            display: 'inline-block',
                            minWidth: '80px',
                            textAlign: 'right'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--gray-200)'
                            e.currentTarget.style.transform = 'scale(1.05)'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'var(--gray-50)'
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                        >
                          {revenueTargets[period] > 0 ? formatCurrency(revenueTargets[period]) : 'Click to set'}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Actual Sales Row */}
                <tr>
                  <td style={{ padding: '14px', fontWeight: 600, color: 'var(--gray-900)', fontSize: '14px' }}>
                    Actual Sales:
                  </td>
                  {(['annual', 'quarterly', 'monthly', 'weekly', 'daily'] as const).map((period) => (
                    <td key={period} style={{ padding: '14px', textAlign: 'right' }}>
                      {editingRevenue?.type === 'actual' && editingRevenue.period === period ? (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <input
                            type="text"
                            value={revenueEditValue}
                            onChange={(e) => setRevenueEditValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRevenueSave()
                              if (e.key === 'Escape') handleRevenueCancel()
                            }}
                            autoFocus
                            style={{
                              width: '120px',
                              padding: '6px 10px',
                              border: '2px solid #667eea',
                              borderRadius: '6px',
                              fontSize: '14px',
                              textAlign: 'right'
                            }}
                          />
                          <button
                            onClick={handleRevenueSave}
                            style={{
                              padding: '6px 12px',
                              background: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleRevenueCancel}
                            style={{
                              padding: '6px 12px',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => handleRevenueEdit('actual', period)}
                          style={{
                            cursor: 'pointer',
                            padding: '6px 12px',
                            borderRadius: '6px',
                            background: 'var(--gray-50)',
                            color: 'var(--gray-900)',
                            fontWeight: 600,
                            fontSize: '14px',
                            transition: 'all 0.2s',
                            display: 'inline-block',
                            minWidth: '80px',
                            textAlign: 'right'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.background = 'var(--gray-200)'
                            e.currentTarget.style.transform = 'scale(1.05)'
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.background = 'var(--gray-50)'
                            e.currentTarget.style.transform = 'scale(1)'
                          }}
                        >
                          {actualSales[period] > 0 ? formatCurrency(actualSales[period]) : 'Click to set'}
                        </div>
                      )}
                    </td>
                  ))}
                </tr>
                {/* Achievement Rate Row */}
                {(revenueTargets.annual > 0 || revenueTargets.quarterly > 0 || revenueTargets.monthly > 0 || revenueTargets.weekly > 0 || revenueTargets.daily > 0) && (
                  <tr style={{ borderTop: '2px solid var(--gray-300)', background: 'var(--gray-50)' }}>
                    <td style={{ padding: '14px', fontWeight: 600, color: 'var(--gray-900)', fontSize: '14px' }}>
                      Achievement Rate:
                    </td>
                    {(['annual', 'quarterly', 'monthly', 'weekly', 'daily'] as const).map((period) => {
                      const target = revenueTargets[period]
                      const actual = actualSales[period]
                      const rate = target > 0 ? Math.round((actual / target) * 100) : 0
                      return (
                        <td key={period} style={{ padding: '14px', textAlign: 'right' }}>
                          {target > 0 ? (
                            <span style={{
                              fontWeight: 700,
                              fontSize: '14px',
                              color: rate >= 100 ? '#10b981' : rate >= 80 ? '#f59e0b' : '#ef4444'
                            }}>
                              {rate}%
                            </span>
                          ) : '-'}
                        </td>
                      )
                    })}
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Scorecard
