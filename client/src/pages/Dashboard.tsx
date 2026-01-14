import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  FileText, 
  UsersRound, 
  Target,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  ArrowRight,
  Mic
} from 'lucide-react'
import ConversationModal from '../components/ConversationModal'
import { isAuthenticated } from '../utils/api'
import { 
  AreaChart, 
  Area,
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line
} from 'recharts'
import './Dashboard.css'
import { api } from '../utils/api'

interface DashboardStats {
  total_quizzes: number
  total_huddles: number
  total_notes: number
  total_todos: number
  completed_todos: number
  pending_todos: number
}

interface Coach {
  id: number
  name: string
  email: string
}

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

interface Activity {
  type: 'todo' | 'huddle' | 'session' | 'action'
  id: number
  title: string
  time?: string | null
  color: string
  data: any
}

interface BillingStatus {
  trialStartDate: string | null
  trialEndDate: string | null
  trialDaysRemaining: number | null
  accessStatus: string
  hasAccess: boolean
  currentPlanName: string | null
  planStartDate: string | null
  planEndDate: string | null
  creditBalance: number
  stripeCustomerId: string | null
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [quizData, setQuizData] = useState<any[]>([])
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedCoach, setSelectedCoach] = useState<number | null>(null)
  const [huddles, setHuddles] = useState<Huddle[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [monthlyActivity, setMonthlyActivity] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWelcomeNotification, setShowWelcomeNotification] = useState(false)
  const [userName, setUserName] = useState<string>('')
  const [calendarDate, setCalendarDate] = useState(new Date())
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [selectedDateActivities, setSelectedDateActivities] = useState<Activity[]>([])
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [hoverTimeout, setHoverTimeout] = useState<ReturnType<typeof setTimeout> | null>(null)
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [trialCountdown, setTrialCountdown] = useState<string>('')
  const [conversationModalOpen, setConversationModalOpen] = useState(false)
  const [selectedCoachForConversation, setSelectedCoachForConversation] = useState<Coach | null>(null)
  const [conversationApiType, setConversationApiType] = useState<'openai' | 'elevenlabs'>('openai')

  // Check for login and show welcome notification (ONLY for regular users, NOT admins)
  useEffect(() => {
    let autoHideTimer: ReturnType<typeof setTimeout> | null = null

    const checkLoginAndShowNotification = () => {
      try {
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          const userRole = (user.role || 'USER').toUpperCase()
          const userEmail = (user.email || '').toLowerCase()
          
          // Skip notification for admins - they see it on /app page instead
          if (userRole === 'ADMIN' || userEmail === 'danrosario0604@gmail.com') {
            return
          }
          
          const name = user.name || user.email?.split('@')[0] || 'User'
          setUserName(name)
          
          // Check if notification was already shown in this session
          const notificationShown = sessionStorage.getItem('welcomeNotificationShown')
          const loginTime = sessionStorage.getItem('loginTime')
          
          // Show notification if not shown yet
          if (!notificationShown) {
            // Check if login was recent (within last 60 seconds) or if loginTime exists
            const shouldShow = loginTime ? (Date.now() - parseInt(loginTime)) < 60000 : true
            
            if (shouldShow) {
              setShowWelcomeNotification(true)
              sessionStorage.setItem('welcomeNotificationShown', 'true')
              
              // Auto-hide after 5 seconds
              autoHideTimer = setTimeout(() => {
                setShowWelcomeNotification(false)
              }, 5000)
            }
          }
        }
      } catch (error) {
        console.error('Error reading user data:', error)
      }
    }

    // Check immediately and also listen for auth state changes
    checkLoginAndShowNotification()
    
    // Listen for auth state changes (e.g., after login)
    const handleAuthChange = () => {
      setTimeout(checkLoginAndShowNotification, 100)
    }
    window.addEventListener('authStateChanged', handleAuthChange)

    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange)
      if (autoHideTimer) {
        clearTimeout(autoHideTimer)
      }
    }
  }, [])

  // Countdown timer for trial
  useEffect(() => {
    if (!billingStatus || !billingStatus.trialEndDate || billingStatus.trialDaysRemaining === null) {
      setTrialCountdown('')
      return
    }

    const updateCountdown = () => {
      const now = new Date()
      const endDate = new Date(billingStatus.trialEndDate!)
      const diff = endDate.getTime() - now.getTime()

      if (diff <= 0) {
        setTrialCountdown('Trial Expired')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)

      setTrialCountdown(`${days} Days, ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`)
    }

    // Update immediately
    updateCountdown()

    // Update every second
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [billingStatus])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Fetch billing status
        try {
          const billingData = await api.get('/api/billing/status')
          setBillingStatus(billingData)
        } catch (err) {
          console.warn('Failed to fetch billing status:', err)
        }

        // Fetch coaches
        try {
          const coachesData = await api.get('/api/coaches')
          if (Array.isArray(coachesData)) {
            setCoaches(coachesData)
          }
        } catch (err) {
          console.warn('Failed to fetch coaches:', err)
        }

        // Fetch stats
        try {
          const statsUrl = selectedCoach ? `/api/dashboard/stats?coachId=${selectedCoach}` : '/api/dashboard/stats'
          const statsData = await api.get(statsUrl)
          if (statsData && !statsData.error) {
            setStats(statsData)
            console.log('Dashboard stats:', statsData)
          }
        } catch (err) {
          console.warn('Failed to fetch dashboard stats:', err)
          // Try without auth as fallback
          try {
            const statsUrl = selectedCoach ? `/api/dashboard/stats?coachId=${selectedCoach}` : '/api/dashboard/stats'
            const statsRes = await fetch(statsUrl)
            const statsData = await statsRes.json()
            if (statsData && !statsData.error) {
              setStats(statsData)
            }
          } catch (fallbackErr) {
            console.error('Fallback stats fetch failed:', fallbackErr)
          }
        }

        // Fetch quizzes
        try {
          const quizzesUrl = selectedCoach ? `/api/quizzes?coachId=${selectedCoach}` : '/api/quizzes'
          const quizzesData = await api.get(quizzesUrl)
          if (Array.isArray(quizzesData)) {
            console.log('Fetched quizzes:', quizzesData.length, 'items')
            const grouped = quizzesData.reduce((acc: any, quiz: any) => {
              // Extract clean date (YYYY-MM-DD format only, no time)
              let date = null
              if (quiz.quiz_date) {
                // If quiz_date is a string, extract date part only
                date = typeof quiz.quiz_date === 'string' && quiz.quiz_date.includes('T')
                  ? quiz.quiz_date.split('T')[0]
                  : quiz.quiz_date
              } else if (quiz.date) {
                // Same for date field
                date = typeof quiz.date === 'string' && quiz.date.includes('T')
                  ? quiz.date.split('T')[0]
                  : quiz.date
              } else if (quiz.createdAt || quiz.created_at) {
                // Extract date from timestamp
                const timestamp = quiz.createdAt || quiz.created_at
                date = new Date(timestamp).toISOString().split('T')[0]
              }

              if (!date) return acc // Skip if no date
              
              if (!acc[date]) {
                acc[date] = { date, count: 0, avgScore: 0, scores: [] }
              }
              acc[date].count++
              // Handle score from different possible fields
              const score = quiz.score || quiz.totalScore || 0
              acc[date].scores.push(score)
              acc[date].avgScore = Math.round(acc[date].scores.reduce((a: number, b: number) => a + b, 0) / acc[date].scores.length)
              return acc
            }, {})
            const sortedData = Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date))
            setQuizData(sortedData)
            console.log('Processed quiz data:', sortedData.length, 'date groups')
          } else {
            setQuizData([])
          }
        } catch (err) {
          console.warn('Failed to fetch quizzes with auth, trying without:', err)
          // Try without auth as fallback
          try {
            const quizzesUrl = selectedCoach ? `/api/quizzes?coachId=${selectedCoach}` : '/api/quizzes'
            const quizzesRes = await fetch(quizzesUrl)
            const quizzesData = await quizzesRes.json()
            if (Array.isArray(quizzesData)) {
              const grouped = quizzesData.reduce((acc: any, quiz: any) => {
                const date = quiz.quiz_date || quiz.date || (quiz.createdAt ? new Date(quiz.createdAt).toISOString().split('T')[0] : null)
                if (!date) return acc
                if (!acc[date]) {
                  acc[date] = { date, count: 0, avgScore: 0, scores: [] }
                }
                acc[date].count++
                const score = quiz.score || quiz.totalScore || 0
                acc[date].scores.push(score)
                acc[date].avgScore = Math.round(acc[date].scores.reduce((a: number, b: number) => a + b, 0) / acc[date].scores.length)
                return acc
              }, {})
              setQuizData(Object.values(grouped).sort((a: any, b: any) => a.date.localeCompare(b.date)))
            } else {
              setQuizData([])
            }
          } catch (fallbackErr) {
            console.error('Fallback quizzes fetch failed:', fallbackErr)
            setQuizData([])
          }
        }

        // Fetch huddles
        try {
          const huddlesUrl = selectedCoach ? `/api/huddles?coachId=${selectedCoach}` : '/api/huddles'
          const huddlesData = await api.get(huddlesUrl)
          if (Array.isArray(huddlesData)) {
            setHuddles(huddlesData)
            console.log('Fetched huddles:', huddlesData.length, 'items')
          }
        } catch (err) {
          console.warn('Failed to fetch huddles with auth, trying without:', err)
          // Try without auth as fallback
          try {
            const huddlesUrl = selectedCoach ? `/api/huddles?coachId=${selectedCoach}` : '/api/huddles'
            const huddlesRes = await fetch(huddlesUrl)
            const huddlesData = await huddlesRes.json()
            if (Array.isArray(huddlesData)) {
              setHuddles(huddlesData)
            }
          } catch (fallbackErr) {
            console.error('Fallback huddles fetch failed:', fallbackErr)
          }
        }

        // Fetch todos for calendar
        try {
          const todosData = await api.get('/api/todos')
          if (Array.isArray(todosData)) {
            setTodos(todosData)
          }
        } catch (err) {
          console.warn('Failed to fetch todos:', err)
        }
      } catch (err) {
        console.error('Error fetching data:', err)
        setError('Failed to connect to the server. Please make sure the backend is running.')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedCoach])

  useEffect(() => {
    // Always calculate monthly activity, even if data is empty
    const monthly = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const activityData = monthly.map(month => {
      const quizCount = quizData.filter(q => {
        try {
          return new Date(q.date).toLocaleDateString('en-US', { month: 'short' }) === month
        } catch {
          return false
        }
      }).length
      const huddleCount = huddles.filter(h => {
        try {
          const date = h.huddle_date || (h as any).date || (h as any).huddleDate
          return date && new Date(date).toLocaleDateString('en-US', { month: 'short' }) === month
        } catch {
          return false
        }
      }).length
      return {
        month,
        quizzes: quizCount,
        huddles: huddleCount,
        total: quizCount + huddleCount
      }
    })
    setMonthlyActivity(activityData)
  }, [quizData, huddles])

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="loading"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="error-container" style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <AlertCircle size={64} color="#ef4444" style={{ marginBottom: '20px' }} />
          <h2 style={{ color: '#ef4444', marginBottom: '10px' }}>Connection Error</h2>
          <p style={{ color: '#6b7280', maxWidth: '400px' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            style={{
              marginTop: '20px',
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Use default values if stats is null, and ensure all values are numbers
  const toSafeNumber = (val: any): number => {
    const num = Number(val)
    return isNaN(num) ? 0 : num
  }

  const safeStats = {
    total_quizzes: toSafeNumber(stats?.total_quizzes),
    total_huddles: toSafeNumber(stats?.total_huddles),
    total_notes: toSafeNumber(stats?.total_notes),
    total_todos: toSafeNumber(stats?.total_todos),
    completed_todos: toSafeNumber(stats?.completed_todos),
    pending_todos: toSafeNumber(stats?.pending_todos)
  }

  // Calculate completion percentage for todos
  const todoCompletionRate = safeStats.total_todos > 0 
    ? Math.round((safeStats.completed_todos / safeStats.total_todos) * 100) 
    : 0

  // Calculate activity distribution - use actual counts for pie chart
  const activityDistribution = [
    { name: 'Quizzes', value: safeStats.total_quizzes, color: '#60a5fa' },
    { name: 'Huddles', value: safeStats.total_huddles, color: '#3b82f6' },
    { name: 'Notes', value: safeStats.total_notes, color: '#2563eb' },
    { name: 'Todos', value: safeStats.total_todos, color: '#1e40af' },
  ].filter(item => item.value > 0) // Only show items with values

  // Calculate compliance rate - handle both snake_case and camelCase
  const complianceRate = huddles.length > 0
    ? Math.round((huddles.filter(h => {
        const hasAgenda = h.has_short_agenda ?? (h as any).hasShortAgenda
        const hasNotetaker = h.has_notetaker ?? (h as any).hasNotetaker
        const hasActions = h.has_action_steps ?? (h as any).hasActionSteps
        return hasAgenda && hasNotetaker && hasActions
      }).length / huddles.length) * 100)
    : 0

  // Calculate score distribution
  const allScores = quizData.flatMap((item: any) => item.scores || [])
  const scoreDistribution: any = {}
  allScores.forEach((score: number) => {
    let category = ''
    if (score >= 80) category = 'High (80-100%)'
    else if (score >= 60) category = 'Medium (60-79%)'
    else category = 'Low (0-59%)'
    
    if (!scoreDistribution[category]) {
      scoreDistribution[category] = { 
        name: category, 
        value: 0, 
        color: score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444' 
      }
    }
    scoreDistribution[category].value++
  })
  const scoreDistributionArray = Object.values(scoreDistribution)

  // Prepare compliance pie data - handle both snake_case and camelCase
  // Compliance metrics (unused for now but kept for future use)
  // const compliantCount = huddles.filter(h => {
  //   const hasAgenda = h.has_short_agenda ?? (h as any).hasShortAgenda
  //   const hasNotetaker = h.has_notetaker ?? (h as any).hasNotetaker
  //   const hasActions = h.has_action_steps ?? (h as any).hasActionSteps
  //   return hasAgenda && hasNotetaker && hasActions
  // }).length
  // Compliance pie data (unused for now but kept for future use)
  // const nonCompliantCount = huddles.length - compliantCount
  // const compliancePieData = [
  //   { name: 'Compliant', value: compliantCount, color: '#22c55e' },
  //   { name: 'Non-Compliant', value: nonCompliantCount, color: '#ef4444' }
  // ]

  // KPI Cards - with safe value formatting
  const formatNumber = (num: number | undefined | null): string => {
    if (num === undefined || num === null || isNaN(num)) return '0'
    return num.toLocaleString()
  }

  // Calendar functions
  const getActivitiesForDate = (date: Date): Activity[] => {
    const dateStr = date.toISOString().split('T')[0]
    const activities: Activity[] = []

    // Todos
    todos.forEach(todo => {
      const todoDate = todo.due_date || todo.dueDate
      if (todoDate && todoDate.split('T')[0] === dateStr) {
        const priorityColors: Record<string, string> = {
          'URGENT': '#dc2626',
          'HIGH': '#ef4444',
          'MEDIUM': '#f59e0b',
          'LOW': '#10b981'
        }
        activities.push({
          type: 'todo',
          id: todo.id,
          title: todo.title,
          time: null,
          color: priorityColors[todo.priority?.toUpperCase() || 'MEDIUM'] || '#f59e0b',
          data: todo
        })
      }
    })

    // Huddles
    huddles.forEach(huddle => {
      const huddleDate = huddle.huddle_date || (huddle as any).date
      if (huddleDate && huddleDate.split('T')[0] === dateStr) {
        activities.push({
          type: 'huddle',
          id: huddle.id,
          title: huddle.title,
          time: null,
          color: '#3b82f6',
          data: huddle
        })
      }
    })

    return activities
  }

  const generateDaysInMonth = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    
    const days: (number | null)[] = []
    
    // Empty cells for days before the first day
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }
    
    return days
  }

  const handleCalendarDateHover = (day: number | null) => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout)
    }
    
    if (day === null) {
      setHoveredDate(null)
      return
    }

    const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day)
    setHoveredDate(date)
    
    // Show popup after short delay
    const timeout = setTimeout(() => {
      const activities = getActivitiesForDate(date)
      if (activities.length > 0) {
        setSelectedDateActivities(activities)
      }
    }, 300)
    setHoverTimeout(timeout)
  }

  const handleCalendarDateClick = (day: number | null) => {
    if (day === null) return
    
    const date = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day)
    const activities = getActivitiesForDate(date)
    setHoveredDate(date)
    setSelectedDateActivities(activities)
    setShowActivityModal(true)
  }

  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))
  }

  const kpiCards = [
    { 
      title: 'Total Quizzes', 
      value: formatNumber(safeStats.total_quizzes),
      icon: FileText, 
      bgColor: '#60a5fa',
      link: '/quizzes'
    },
    { 
      title: 'Total Huddles', 
      value: formatNumber(safeStats.total_huddles),
      icon: UsersRound, 
      bgColor: '#3b82f6',
      link: '/huddles'
    },
    { 
      title: 'Completion Rate', 
      value: `${todoCompletionRate || 0}%`,
      icon: Target, 
      bgColor: '#2563eb',
      link: '/todos'
    },
    { 
      title: 'Compliance Rate', 
      value: `${complianceRate || 0}%`,
      icon: CheckCircle2, 
      bgColor: '#22c55e',
      link: '/huddles'
    },
  ]

  return (
    <div className="dashboard-page">
      {/* Welcome Notification */}
      {showWelcomeNotification && (
        <div className="welcome-notification">
          <div className="welcome-notification-content">
            <div className="welcome-icon">
              <Sparkles size={20} />
            </div>
            <div className="welcome-text">
              <div className="welcome-title">Welcome back, {userName}! 🎉</div>
              <div className="welcome-message">Login successful!</div>
            </div>
            <button 
              className="welcome-close"
              onClick={() => setShowWelcomeNotification(false)}
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Prominent Talk to Coach Button */}
      <div style={{
        marginBottom: '24px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <button
          onClick={async () => {
            // Check authentication
            if (!isAuthenticated()) {
              navigate('/login', { state: { from: '/dashboard' } })
              return
            }

            // Check billing access
            try {
              const billingData = await api.get('/api/billing/status')
              if (!billingData.hasAccess) {
                alert('Your free trial has ended. Please upgrade to continue using this feature.')
                navigate('/plans', { state: { from: 'talk-to-coach' } })
                return
              }
            } catch (error: any) {
              console.error('Failed to check billing status:', error)
              if (error.requiresUpgrade) {
                alert('Your free trial has ended. Please upgrade to continue.')
                navigate('/plans', { state: { from: 'talk-to-coach' } })
                return
              }
            }

            // Get user's primary coach or first available coach
            const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
            let primaryCoachId = null
            if (userStr) {
              try {
                const user = JSON.parse(userStr)
                primaryCoachId = user.primaryCoachId || user.primary_coach_id
              } catch (e) {
                console.error('Error parsing user data:', e)
              }
            }

            // Find the coach
            let coachToUse: Coach | null = null
            if (primaryCoachId && coaches.length > 0) {
              coachToUse = coaches.find(c => c.id === primaryCoachId) || null
            }
            
            // If no primary coach, use first available coach
            if (!coachToUse && coaches.length > 0) {
              coachToUse = coaches[0]
            }

            if (!coachToUse) {
              alert('No coaches available. Please contact support.')
              return
            }

            // Open conversation modal
            setSelectedCoachForConversation(coachToUse)
            setConversationApiType('openai')
            setConversationModalOpen(true)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '20px 40px',
            fontSize: '18px',
            fontWeight: 700,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            borderRadius: '16px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.4)',
            transition: 'all 0.3s ease',
            minWidth: '280px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)'
            e.currentTarget.style.boxShadow = '0 6px 20px 0 rgba(59, 130, 246, 0.5)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 14px 0 rgba(59, 130, 246, 0.4)'
          }}
        >
          <Mic size={24} />
          <span>Talk to Coach</span>
        </button>
      </div>

      <div className="page-header">
        <div className="header-top">
          <div>
            <h1>10X Coach <span className="blue">Dashboard</span></h1>
            <p className="page-subtitle">Comprehensive overview of your 10X coaching activities and metrics</p>
          </div>
          <div className="header-top-right">
            <div className="coach-selector-dashboard">
              <label htmlFor="coach-select">Select Coach:</label>
              <select 
                id="coach-select"
                className="coach-select-dashboard"
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
          </div>
        </div>
      </div>

      {/* Trial Status Banner */}
      {billingStatus && (
        <div 
          className="content-card" 
          style={{ 
            marginBottom: '24px',
            padding: '20px',
            background: billingStatus.hasAccess 
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
            border: billingStatus.hasAccess 
              ? '1px solid rgba(59, 130, 246, 0.3)'
              : '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
              {billingStatus.hasAccess ? (
                <>
                  <Clock style={{ color: '#3b82f6', flexShrink: 0 }} size={20} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px', fontSize: '16px' }}>
                      {billingStatus.trialDaysRemaining !== null
                        ? `Free Trial: ${trialCountdown || 'Calculating...'}`
                        : billingStatus.currentPlanName
                        ? `Active Plan: ${billingStatus.currentPlanName}`
                        : 'Active Access'}
                    </p>
                    {billingStatus.trialDaysRemaining !== null && billingStatus.trialEndDate && (
                      <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                        Trial ends: {new Date(billingStatus.trialEndDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle style={{ color: '#ef4444', flexShrink: 0 }} size={20} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px', fontSize: '16px' }}>Your free trial has ended</p>
                    <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                      Upgrade now to continue using all features.
                    </p>
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {billingStatus.creditBalance > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px' }}>
                  <CreditCard size={16} style={{ color: '#8b5cf6' }} />
                  <span style={{ fontWeight: 700, color: 'var(--gray-900)', fontSize: '16px' }}>
                    ${billingStatus.creditBalance.toFixed(2)}
                  </span>
                </div>
              )}
              <Link 
                to="/plans" 
                style={{
                  padding: '10px 20px',
                  background: billingStatus.hasAccess ? 'var(--card-blue-dark)' : '#ef4444',
                  color: 'white',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '14px',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              >
                {billingStatus.hasAccess ? 'View Plans' : 'Upgrade Now'}
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards Row */}
      <div className="dashboard-kpi-row">
        {kpiCards.map((card, index) => {
          const Icon = card.icon
          return (
            <Link key={index} to={card.link} className="dashboard-kpi-card" style={{ backgroundColor: card.bgColor }}>
              <div className="dashboard-kpi-icon">
                <Icon size={28} />
              </div>
              <div className="dashboard-kpi-content">
                <div className="dashboard-kpi-label">{card.title}</div>
                <div className="dashboard-kpi-value">{card.value}</div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* 6 Charts Grid Layout */}
      <div className="dashboard-charts-grid">
        {/* Chart 1: Quiz History & Scores */}
        <div className="dashboard-chart-card">
          <h3>
            <span className="chart-indicator-small"></span>
            Quiz History & Scores
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={quizData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorQuizzes" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorScores" x1="0" y1="0" x2="0" y2="1">
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
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} tick={{ fill: '#6b7280' }} />
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
                labelFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" formatter={(value) => <span style={{ color: '#374151', fontWeight: 600 }}>{value}</span>} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorQuizzes)" name="Quizzes Taken" />
              <Area type="monotone" dataKey="avgScore" stroke="#22c55e" strokeWidth={3} fillOpacity={1} fill="url(#colorScores)" name="Average Score" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Activity Distribution */}
        <div className="dashboard-chart-card">
          <h3>
            <span className="chart-indicator-small"></span>
            Activity Distribution
          </h3>
          {activityDistribution.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie 
                  data={activityDistribution} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={60} 
                  outerRadius={100} 
                  paddingAngle={2} 
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {activityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid rgba(229, 231, 235, 0.8)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    padding: '12px 16px',
                    fontWeight: 600
                  }}
                  formatter={(value: any, name: string) => [`${value} items`, name]}
                />
                <Legend verticalAlign="bottom" align="center" iconType="square" formatter={(value) => <span style={{ color: '#374151', fontWeight: 600, marginLeft: '8px' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ 
              height: 300, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              No activity data available
            </div>
          )}
        </div>

        {/* Chart 3: Monthly Activity Trend */}
        <div className="dashboard-chart-card">
          <h3>
            <span className="chart-indicator-small"></span>
            Monthly Activity Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyActivity} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.5)" />
              <XAxis dataKey="month" stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} tick={{ fill: '#6b7280' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} tick={{ fill: '#6b7280' }} />
              <Tooltip 
                contentStyle={{
                  background: '#ffffff',
                  border: '1px solid rgba(229, 231, 235, 0.8)',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  padding: '12px 16px',
                  fontWeight: 600
                }}
              />
              <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" formatter={(value) => <span style={{ color: '#374151', fontWeight: 600 }}>{value}</span>} />
              <Line type="monotone" dataKey="quizzes" stroke="#3b82f6" strokeWidth={3} dot={{ fill: '#3b82f6', r: 4 }} name="Quizzes" />
              <Line type="monotone" dataKey="huddles" stroke="#22c55e" strokeWidth={3} dot={{ fill: '#22c55e', r: 4 }} name="Huddles" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Quiz Activity by Date */}
        <div className="dashboard-chart-card">
          <h3>
            <span className="chart-indicator-small"></span>
            Quiz Activity by Date
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={quizData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBar" x1="0" y1="0" x2="0" y2="1">
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
                tickFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }}
              />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px', fontWeight: 600 }} tick={{ fill: '#6b7280' }} />
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
                labelFormatter={(value) => {
                  const date = new Date(value)
                  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
                }}
              />
              <Bar dataKey="count" fill="url(#colorBar)" name="Quizzes" radius={[12, 12, 0, 0]}>
                {quizData.map((_, index) => (
                  <Cell key={`cell-${index}`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 5: Score Distribution */}
        <div className="dashboard-chart-card">
          <h3>
            <span className="chart-indicator-small"></span>
            Score Distribution
          </h3>
          {scoreDistributionArray.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={scoreDistributionArray} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={2} dataKey="value">
                  {scoreDistributionArray.map((entry: any, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    background: '#ffffff',
                    border: '1px solid rgba(229, 231, 235, 0.8)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                    padding: '12px 16px',
                    fontWeight: 600
                  }}
                />
                <Legend verticalAlign="bottom" align="center" iconType="square" formatter={(value) => <span style={{ color: '#374151', fontWeight: 600, marginLeft: '8px' }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ 
              height: 300, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              No score data available
            </div>
          )}
        </div>

        {/* Chart 6: 10X Calendar-At-A-Glance */}
        <div className="dashboard-chart-card" style={{ position: 'relative' }}>
          <h3>
            <span className="chart-indicator-small"></span>
            10X Calendar-At-A-Glance
          </h3>
          <div className="dashboard-interactive-calendar">
            <div className="calendar-header-small">
              <button 
                className="calendar-nav-btn-small"
                onClick={handlePrevMonth}
                aria-label="Previous month"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="calendar-month-year-small">
                {calendarDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </span>
              <button 
                className="calendar-nav-btn-small"
                onClick={handleNextMonth}
                aria-label="Next month"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            <div className="calendar-grid-small">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="calendar-day-label-small">{day.substring(0, 1)}</div>
              ))}
              {generateDaysInMonth(calendarDate.getFullYear(), calendarDate.getMonth()).map((day, index) => {
                const today = new Date()
                const isToday = day !== null && 
                  day === today.getDate() && 
                  calendarDate.getMonth() === today.getMonth() && 
                  calendarDate.getFullYear() === today.getFullYear()
                
                const date = day !== null ? new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day) : null
                const activities = date ? getActivitiesForDate(date) : []
                const hasActivities = activities.length > 0
                
                return (
                  <div
                    key={index}
                    className={`calendar-day-cell-small ${day === null ? 'empty' : ''} ${isToday ? 'today' : ''} ${hasActivities ? 'has-activities' : ''}`}
                    onMouseEnter={() => handleCalendarDateHover(day)}
                    onMouseLeave={() => {
                      if (hoverTimeout) clearTimeout(hoverTimeout)
                      setHoveredDate(null)
                    }}
                    onClick={() => handleCalendarDateClick(day)}
                  >
                    {day}
                    {hasActivities && (
                      <div className="activity-dot-container-small">
                        {activities.slice(0, 3).map((activity, idx) => (
                          <div 
                            key={idx} 
                            className="activity-dot-small"
                            style={{ backgroundColor: activity.color }}
                            title={activity.title}
                          />
                        ))}
                        {activities.length > 3 && (
                          <div className="activity-dot-more-small">+{activities.length - 3}</div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Hover Popup */}
            {hoveredDate && selectedDateActivities.length > 0 && (
              <div className="calendar-popup-small">
                <div className="calendar-popup-header-small">
                  {hoveredDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div className="calendar-popup-activities-small">
                  {selectedDateActivities.slice(0, 5).map((activity, idx) => (
                    <div key={idx} className="calendar-popup-activity-small" style={{ borderLeftColor: activity.color }}>
                      <div className="activity-type-label-small">
                        {activity.type === 'todo' && '📋 Todo'}
                        {activity.type === 'huddle' && '👥 10Min Huddle'}
                        {activity.type === 'action' && '✅ Action Item'}
                        {activity.type === 'session' && '💼 Coach Session'}
                      </div>
                      <div className="activity-title-small">{activity.title}</div>
                    </div>
                  ))}
                  {selectedDateActivities.length > 5 && (
                    <div className="calendar-popup-more-small">+{selectedDateActivities.length - 5} more</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Activity Modal */}
          {showActivityModal && (
            <div className="calendar-modal-overlay" onClick={() => setShowActivityModal(false)}>
              <div className="calendar-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="calendar-modal-header">
                  <h3>
                    {hoveredDate ? hoveredDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : selectedDateActivities.length > 0 && selectedDateActivities[0]?.data ? new Date(selectedDateActivities[0].data.due_date || selectedDateActivities[0].data.huddle_date || selectedDateActivities[0].data.startTime).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Activities'}
                  </h3>
                  <button className="calendar-modal-close" onClick={() => setShowActivityModal(false)}>
                    <X size={20} />
                  </button>
                </div>
                <div className="calendar-modal-body">
                  {selectedDateActivities.length === 0 ? (
                    <div className="calendar-modal-empty">No activities for this date</div>
                  ) : (
                    selectedDateActivities.map((activity, idx) => (
                      <div key={idx} className="calendar-modal-activity" style={{ borderLeftColor: activity.color }}>
                        <div className="activity-type-label-modal">
                          {activity.type === 'todo' && '📋 Todo'}
                          {activity.type === 'huddle' && '👥 10Min Huddle'}
                          {activity.type === 'action' && '✅ Action Item'}
                          {activity.type === 'session' && '💼 Coach Session'}
                        </div>
                        <div className="activity-title-modal">{activity.title}</div>
                        {activity.time && (
                          <div className="activity-time-modal">{activity.time}</div>
                        )}
                        {activity.type === 'todo' && activity.data.priority && (
                          <div className="activity-priority-modal">Priority: {activity.data.priority}</div>
                        )}
                        {activity.type === 'huddle' && (
                          <div className="activity-status-modal">
                            Status: {activity.data.status || 'Scheduled'}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Conversation Modal */}
      {conversationModalOpen && selectedCoachForConversation && (
        <ConversationModal
          coach={selectedCoachForConversation}
          isOpen={conversationModalOpen}
          onClose={() => {
            setConversationModalOpen(false)
            setSelectedCoachForConversation(null)
          }}
          apiType={conversationApiType}
        />
      )}
    </div>
  )
}

export default Dashboard
