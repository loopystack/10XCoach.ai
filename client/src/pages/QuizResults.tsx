import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Award, BarChart3, Sparkles, CheckCircle2, Target, Mail, Download, AlertCircle, X } from 'lucide-react'
import { isAuthenticated } from '../utils/api'
import { notify } from '../utils/notification'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import './PageStyles.css'

const PILLAR_INFO = {
  STRATEGY: { name: 'Strategy', color: '#3b82f6', icon: '🎯' },
  FINANCE: { name: 'Finance', color: '#10b981', icon: '💰' },
  MARKETING: { name: 'Marketing', color: '#f59e0b', icon: '📢' },
  SALES: { name: 'Sales', color: '#ef4444', icon: '💼' },
  OPERATIONS: { name: 'Operations', color: '#8b5cf6', icon: '⚙️' },
  CULTURE: { name: 'Culture', color: '#ec4899', icon: '👥' },
  CUSTOMER_CENTRICITY: { name: 'Customer Experience', color: '#06b6d4', icon: '❤️' },
  EXIT_STRATEGY: { name: 'Exit Strategy', color: '#6366f1', icon: '🚀' }
}

interface QuizResult {
  resultId: number
  pillarScores: { [key: string]: number }
  overallScore: number
  createdAt: string
}

const QuizResults = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [result, setResult] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [emailAddress, setEmailAddress] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/quiz/results' } })
      return
    }

    // Get result from navigation state or fetch from API
    const stateResult = location.state?.result
    if (stateResult) {
      setResult(stateResult)
      setLoading(false)
    } else {
      // Could fetch latest result or redirect to quiz list
      navigate('/quizzes')
    }
  }, [navigate, location])

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-card">
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Loading results...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!result) {
    return (
      <div className="page-container">
        <div className="content-card">
          <div className="text-center p-8">
            <p className="text-gray-600 mb-4">No results found.</p>
            <button
              onClick={() => navigate('/quizzes')}
              className="quiz-results-back-btn"
            >
              <ArrowLeft size={18} />
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Prepare chart data - handle both full quiz and individual pillar quiz results
  const pillarScores = result.pillarScores || {}
  const chartData = Object.entries(pillarScores).map(([pillar, score]) => {
    const info = PILLAR_INFO[pillar as keyof typeof PILLAR_INFO]
    if (!info) {
      // Handle unknown pillar tags gracefully
      return {
        pillar: pillar,
        score: score as number,
        icon: '📊',
        color: '#6b7280'
      }
    }
    return {
      pillar: info.name,
      score: score as number,
      icon: info.icon,
      color: info.color
    }
  }).sort((a, b) => b.score - a.score)

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e' // green
    if (score >= 60) return '#f59e0b' // yellow
    return '#ef4444' // red
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    if (score >= 40) return 'Fair'
    return 'Needs Improvement'
  }

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
    if (score >= 60) return 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
  }

  const handleSendEmail = async () => {
    if (!emailAddress || !result) return
    
    try {
      setSendingEmail(true)
      setEmailError(null)
      setEmailSent(false)
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const response = await fetch(`/api/quiz/results/${result.resultId}/send-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ email: emailAddress })
      })

      let data;
      try {
        data = await response.json()
      } catch (parseError) {
        // If response is not JSON, use status text
        throw new Error(response.statusText || 'Failed to send email')
      }

      if (response.ok) {
        setEmailSent(true)
        setEmailError(null)
        setTimeout(() => {
          setEmailAddress('')
          setEmailSent(false)
          setEmailError(null)
        }, 5000)
      } else {
        const errorMessage = data?.error || data?.details || data?.message || `Failed to send email (${response.status})`
        setEmailError(errorMessage)
        setEmailSent(false)
      }
    } catch (error: any) {
      console.error('Error sending email:', error)
      setEmailError(error.message || 'Failed to send email. Please try again.')
      setEmailSent(false)
    } finally {
      setSendingEmail(false)
    }
  }

  const handleExport = async () => {
    if (!result) return
    
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const response = await fetch(`/api/quiz/results/${result.resultId}/export?format=pdf`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `quiz-results-${result.resultId}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to export' }))
        notify.error(errorData.error || 'Failed to export results. Please try again.')
      }
    } catch (error) {
      console.error('Error exporting results:', error)
      notify.error('Failed to export results. Please try again.')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="quiz-results-header">
          <button
            onClick={() => navigate('/quizzes')}
            className="quiz-results-back-btn"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
          <div className="quiz-results-title-section">
            <h1>Quiz Results</h1>
            <p className="page-subtitle">Your comprehensive business health assessment</p>
          </div>
        </div>
      </div>

      {/* Overall Score Hero Card */}
      <div className="quiz-results-hero-card">
        <div className="quiz-results-hero-content">
          <div className="quiz-results-hero-icon-wrapper">
            <div className="quiz-results-hero-icon-bg"></div>
            <Award className="quiz-results-hero-icon" size={64} />
            <div className="quiz-results-hero-glow"></div>
          </div>
          
          <div className="quiz-results-hero-score">
            <div className="quiz-results-hero-label">Overall Business Health Score</div>
            <div 
              className="quiz-results-hero-number"
              style={{ 
                background: getScoreGradient(result.overallScore),
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text'
              }}
            >
              {result.overallScore}%
            </div>
            <div 
              className="quiz-results-hero-badge"
              style={{ 
                background: getScoreGradient(result.overallScore),
                color: 'white'
              }}
            >
              <CheckCircle2 size={20} />
              <span>{getScoreLabel(result.overallScore)}</span>
            </div>
          </div>

          <div className="quiz-results-hero-description">
            <p>
              This score represents your business health across all 8 key pillars. 
              Review your individual pillar scores below to identify strengths and areas for improvement.
            </p>
          </div>
        </div>
        <div className="quiz-results-hero-decoration">
          <div className="quiz-results-decoration-circle circle-1"></div>
          <div className="quiz-results-decoration-circle circle-2"></div>
          <div className="quiz-results-decoration-circle circle-3"></div>
        </div>
      </div>

      {/* Pillar Scores Grid */}
      <div className="content-card quiz-results-pillars-card">
        <div className="quiz-results-section-header">
          <div className="quiz-results-section-icon">
            <Target size={28} />
          </div>
          <div>
            <h2 className="quiz-results-section-title">Pillar Performance</h2>
            <p className="quiz-results-section-subtitle">Detailed breakdown by business area</p>
          </div>
        </div>
        
        <div className="quiz-results-pillars-grid">
          {Object.entries(pillarScores).map(([pillar, score]) => {
            const info = PILLAR_INFO[pillar as keyof typeof PILLAR_INFO]
            return (
              <div
                key={pillar}
                className="quiz-results-pillar-card"
                style={{ '--pillar-color': info.color } as React.CSSProperties}
              >
                <div className="quiz-results-pillar-header">
                  <div className="quiz-results-pillar-icon-wrapper">
                    <span className="quiz-results-pillar-icon">{info.icon}</span>
                  </div>
                  <div 
                    className="quiz-results-pillar-score"
                    style={{ color: getScoreColor(score) }}
                  >
                    {score}%
                  </div>
                </div>
                
                <h3 className="quiz-results-pillar-name">{info.name}</h3>
                
                <div className="quiz-results-pillar-progress">
                  <div className="quiz-results-progress-track">
                    <div
                      className="quiz-results-progress-fill"
                      style={{
                        width: `${score}%`,
                        background: getScoreGradient(score)
                      }}
                    ></div>
                  </div>
                </div>
                
                <div className="quiz-results-pillar-label">
                  <span style={{ color: getScoreColor(score) }}>
                    {getScoreLabel(score)}
                  </span>
                </div>
              </div>
            )
          }).filter(Boolean)}
        </div>
      </div>

      {/* Chart Visualization */}
      <div className="content-card quiz-results-chart-card">
        <div className="quiz-results-section-header">
          <div className="quiz-results-section-icon">
            <BarChart3 size={28} />
          </div>
          <div>
            <h2 className="quiz-results-section-title">Score Breakdown</h2>
            <p className="quiz-results-section-subtitle">Visual comparison across all pillars</p>
          </div>
        </div>
        
        <div className="quiz-results-chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(229, 231, 235, 0.5)" />
              <XAxis
                dataKey="pillar"
                angle={-45}
                textAnchor="end"
                height={120}
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
              />
              <YAxis
                domain={[0, 100]}
                stroke="#6b7280"
                style={{ fontSize: '12px', fontWeight: 600 }}
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
                formatter={(value: number) => [`${value}%`, 'Score']}
              />
              <Legend />
              <Bar dataKey="score" name="Pillar Score" radius={[12, 12, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Email & Export Section */}
      <div className="content-card quiz-results-export-card">
        <h3 className="quiz-export-title">Share Results</h3>
        <div className="quiz-export-actions">
          <div className="quiz-email-section">
            <input
              type="email"
              placeholder="Enter email address"
              value={emailAddress}
              onChange={(e) => {
                setEmailAddress(e.target.value)
                setEmailError(null)
                setEmailSent(false)
              }}
              className="quiz-email-input"
              disabled={sendingEmail}
            />
            <button
              onClick={handleSendEmail}
              disabled={!emailAddress || sendingEmail}
              className={`quiz-export-btn email ${emailSent ? 'success' : ''} ${emailError ? 'error' : ''}`}
            >
              <Mail size={18} />
              <span>{emailSent ? 'Sent!' : sendingEmail ? 'Sending...' : 'Send to Client'}</span>
            </button>
          </div>
          {/* Success Message */}
          {emailSent && (
            <div className="quiz-email-message success">
              <CheckCircle2 size={18} />
              <span>Email sent successfully to hitech.proton@gmail.com!</span>
            </div>
          )}
          {/* Error Message */}
          {emailError && (
            <div className="quiz-email-message error">
              <AlertCircle size={18} />
              <span>{emailError}</span>
              <button
                onClick={() => setEmailError(null)}
                className="quiz-email-message-close"
                aria-label="Close error message"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <button
            onClick={handleExport}
            className="quiz-export-btn export"
          >
            <Download size={18} />
            <span>Export Results</span>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="content-card quiz-results-actions-card">
        <div className="quiz-results-actions">
          <button
            onClick={() => navigate('/quiz/take')}
            className="quiz-results-action-btn primary"
          >
            <Sparkles size={20} />
            <span>Retake Quiz</span>
          </button>
          <button
            onClick={() => navigate('/coaches')}
            className="quiz-results-action-btn secondary"
          >
            <TrendingUp size={20} />
            <span>Talk to a Coach</span>
          </button>
          <button
            onClick={() => navigate('/quizzes')}
            className="quiz-results-action-btn tertiary"
          >
            <BarChart3 size={20} />
            <span>View All Quizzes</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default QuizResults
