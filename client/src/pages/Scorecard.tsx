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
  
  // Revenue Target State
  const [annualRevenueTarget, setAnnualRevenueTarget] = useState<number>(() => {
    const saved = localStorage.getItem('revenue_target_annual')
    return saved ? parseFloat(saved) : 0
  })
  const [showRevenueTargetModal, setShowRevenueTargetModal] = useState(false)
  const [revenueTargetInput, setRevenueTargetInput] = useState('')
  
  // Calculate revenue targets from annual goal
  const calculateRevenueTargets = (annual: number) => {
    return {
      annual: annual,
      quarterly: annual / 4,
      monthly: annual / 12,
      weekly: annual / 52,
      daily: annual / 365
    }
  }
  
  const revenueTargets = calculateRevenueTargets(annualRevenueTarget)
  
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
  
  // Handle revenue target update
  const handleSetRevenueTarget = () => {
    const value = parseFloat(revenueTargetInput.replace(/[^0-9.]/g, ''))
    if (!isNaN(value) && value > 0) {
      setAnnualRevenueTarget(value)
      localStorage.setItem('revenue_target_annual', value.toString())
      setShowRevenueTargetModal(false)
      setRevenueTargetInput('')
    }
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

  // Calculate overall grade from 6 metrics
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
    
    // Normalize each metric to 0-100 scale
    // Quiz scores are already 0-100
    // Huddle compliance is already 0-100
    // Sessions: normalize based on target (assume 10 sessions/month is 100%)
    const normalizedSessions = Math.min((sessionCount / 10) * 100, 100)
    // Todo completion is already 0-100
    // Notes: normalize based on target (assume 5 notes/month is 100%)
    const normalizedNotes = Math.min((notesCount / 5) * 100, 100)
    
    // Calculate weighted average
    // If revenue target is set, include it (7 metrics), otherwise use 6 metrics
    const metricCount = revenueAchievement !== null ? 7 : 6
    const weight = 1 / metricCount
    
    let overallGrade = (quizScore * weight) +
      (huddleCompliance * weight) +
      (normalizedSessions * weight) +
      (todoCompletion * weight) +
      (normalizedNotes * weight)
    
    if (revenueAchievement !== null) {
      overallGrade += (revenueAchievement * weight)
    }
    
    overallGrade = Math.round(overallGrade)
    
    return Math.min(Math.max(overallGrade, 0), 100) // Clamp between 0-100
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
        {/* Overall Grade Display */}
        <div className="scorecard-grade-display">
          <div className="scorecard-grade-circle">
            <div className="scorecard-grade-number">{overallGrade}</div>
            <div className="scorecard-grade-label">Overall Grade</div>
          </div>
          <div className="scorecard-grade-metrics">
            <div className="scorecard-grade-metric">
              <span className="metric-label">Quiz Scores</span>
              <span className="metric-value">{scorecardData.quizScores[scorecardData.quizScores.length - 1]?.average || 0}%</span>
            </div>
            <div className="scorecard-grade-metric">
              <span className="metric-label">Huddle Compliance</span>
              <span className="metric-value">{scorecardData.huddles[scorecardData.huddles.length - 1]?.complianceRate || 0}%</span>
            </div>
            <div className="scorecard-grade-metric">
              <span className="metric-label">Sessions</span>
              <span className="metric-value">{scorecardData.sessions[scorecardData.sessions.length - 1]?.count || 0}</span>
            </div>
            <div className="scorecard-grade-metric">
              <span className="metric-label">Todo Completion</span>
              <span className="metric-value">{scorecardData.todos[scorecardData.todos.length - 1]?.completionRate || 0}%</span>
            </div>
            <div className="scorecard-grade-metric">
              <span className="metric-label">Notes</span>
              <span className="metric-value">{scorecardData.notes[scorecardData.notes.length - 1]?.count || 0}</span>
            </div>
          </div>
        </div>

        <div className="scorecard-header">
          <div>
            <h2>10X Scorecard</h2>
            <p className="scorecard-subtitle">Record and evaluate key metrics, streamlined for strategic success.</p>
          </div>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
            {/* Revenue Target Button */}
            <button
              onClick={() => {
                setRevenueTargetInput(annualRevenueTarget > 0 ? annualRevenueTarget.toString() : '')
                setShowRevenueTargetModal(true)
              }}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              {annualRevenueTarget > 0 
                ? `Annual Target: ${formatCurrency(annualRevenueTarget)}` 
                : 'Set Revenue Target'}
            </button>
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
        
        {/* Revenue Target Modal */}
        {showRevenueTargetModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowRevenueTargetModal(false)}
          >
            <div style={{
              background: 'var(--bg-primary, #ffffff)',
              color: 'var(--text-primary, #1f2937)',
              padding: '32px',
              borderRadius: '16px',
              maxWidth: '500px',
              width: '90%',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              border: '1px solid var(--border-color, #e5e7eb)'
            }}
            onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ marginTop: 0, marginBottom: '16px', color: 'var(--text-primary, #1f2937)' }}>Set Annual Revenue Target</h3>
              <p style={{ color: 'var(--text-secondary, #6b7280)', marginBottom: '24px', fontSize: '14px' }}>
                Enter your annual revenue target. Targets for daily, weekly, monthly, and quarterly will be calculated automatically.
              </p>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-primary, #1f2937)' }}>Annual Target ($)</label>
                <input
                  type="text"
                  value={revenueTargetInput}
                  onChange={(e) => setRevenueTargetInput(e.target.value)}
                  placeholder="e.g., 1000000 for $1M"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-color, #d1d5db)',
                    borderRadius: '8px',
                    fontSize: '16px',
                    background: 'var(--bg-secondary, #f9fafb)',
                    color: 'var(--text-primary, #1f2937)'
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSetRevenueTarget()
                    }
                  }}
                />
              </div>
              {(() => {
                const inputValue = parseFloat(revenueTargetInput.replace(/[^0-9.]/g, '') || '0');
                const previewTargets = inputValue > 0 ? calculateRevenueTargets(inputValue) : null;
                return previewTargets ? (
                  <div style={{
                    background: 'var(--bg-secondary, #f0fdf4)',
                    padding: '16px',
                    borderRadius: '8px',
                    marginBottom: '24px',
                    border: '1px solid var(--border-color, #d1fae5)'
                  }}>
                    <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: 'var(--text-primary, #1f2937)' }}>Calculated Targets:</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px', color: 'var(--text-secondary, #6b7280)' }}>
                      <div>Annual: <strong style={{ color: 'var(--text-primary, #1f2937)' }}>{formatCurrency(previewTargets.annual)}</strong></div>
                      <div>Quarterly: <strong style={{ color: 'var(--text-primary, #1f2937)' }}>{formatCurrency(previewTargets.quarterly)}</strong></div>
                      <div>Monthly: <strong style={{ color: 'var(--text-primary, #1f2937)' }}>{formatCurrency(previewTargets.monthly)}</strong></div>
                      <div>Weekly: <strong style={{ color: 'var(--text-primary, #1f2937)' }}>{formatCurrency(previewTargets.weekly)}</strong></div>
                      <div style={{ gridColumn: 'span 2' }}>Daily: <strong style={{ color: 'var(--text-primary, #1f2937)' }}>{formatCurrency(previewTargets.daily)}</strong></div>
                    </div>
                  </div>
                ) : null;
              })()}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setShowRevenueTargetModal(false)}
                  style={{
                    padding: '10px 20px',
                    background: 'var(--bg-secondary, #f3f4f6)',
                    color: 'var(--text-primary, #1f2937)',
                    border: '1px solid var(--border-color, #d1d5db)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--gray-200, #e5e7eb)'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--bg-secondary, #f3f4f6)'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSetRevenueTarget}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600
                  }}
                >
                  Save Target
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="scorecard-table-container">
          <table className="scorecard-table">
            <thead>
              <tr>
                <th className="scorecard-checkbox-col"></th>
                <th className="scorecard-trend-col">Trend</th>
                <th className="scorecard-title-col">Metric</th>
                <th className="scorecard-okr-col">OKR/Measurable</th>
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
              {/* Business Success Quiz Score */}
              <tr>
                <td className="scorecard-checkbox-col">
                  <input type="checkbox" />
                </td>
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
                  <strong>Business Success Quiz Score</strong>
                </td>
                <td className="scorecard-okr-col">
                  <span className="okr-badge">≥ 70%</span>
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

              {/* 10-Minute Huddles */}
              <tr>
                <td className="scorecard-checkbox-col">
                  <input type="checkbox" />
                </td>
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
                  <strong>10-Minute Huddles</strong>
                </td>
                <td className="scorecard-okr-col">
                  <span className="okr-badge">≥ 80% Compliance</span>
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

              {/* Coach Sessions */}
              <tr>
                <td className="scorecard-checkbox-col">
                  <input type="checkbox" />
                </td>
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
                  <strong>Coach Sessions</strong>
                </td>
                <td className="scorecard-okr-col">
                  <span className="okr-badge">≥ 4/Month</span>
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

              {/* To-Do Tasks Completion */}
              <tr>
                <td className="scorecard-checkbox-col">
                  <input type="checkbox" />
                </td>
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
                  <strong>To-Do Tasks Completion</strong>
                </td>
                <td className="scorecard-okr-col">
                  <span className="okr-badge">≥ 85%</span>
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

              {/* 10X Notetaking */}
              <tr>
                <td className="scorecard-checkbox-col">
                  <input type="checkbox" />
                </td>
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
                  <strong>10X Notetaking</strong>
                </td>
                <td className="scorecard-okr-col">
                  <span className="okr-badge">≥ 1/Session</span>
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

              {/* Revenue Target */}
              {annualRevenueTarget > 0 && (
                <tr>
                  <td className="scorecard-checkbox-col">
                    <input type="checkbox" />
                  </td>
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
                    <strong>Revenue Target</strong>
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                      {scorecardView === 'monthly' && `Target: ${formatCurrency(revenueTargets.monthly)}/month`}
                      {scorecardView === 'quarterly' && `Target: ${formatCurrency(revenueTargets.quarterly)}/quarter`}
                      {scorecardView === 'annual' && `Target: ${formatCurrency(revenueTargets.annual)}/year`}
                    </div>
                  </td>
                  <td className="scorecard-okr-col">
                    <span className="okr-badge">≥ 100%</span>
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
      </div>
    </div>
  )
}

export default Scorecard
