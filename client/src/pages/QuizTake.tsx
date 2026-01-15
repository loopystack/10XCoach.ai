import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Circle } from 'lucide-react'
import { isAuthenticated, api } from '../utils/api'
import { notify } from '../utils/notification'
import './PageStyles.css'

interface QuizQuestion {
  id: number
  text: string
  type: 'SCALE' | 'MULTIPLE_CHOICE' | 'OPEN'
  pillarTag: string
  weight: number
  order: number
  options?: any
}

interface Quiz {
  id: number
  name: string
  description: string
  questions: QuizQuestion[]
}

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

const QuizTake = () => {
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<Quiz | null>(null)
  const [answers, setAnswers] = useState<{ [questionId: number]: number | string }>({})
  const [currentPillar, setCurrentPillar] = useState<string | null>(null)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [isSinglePillarQuiz, setIsSinglePillarQuiz] = useState(false)
  
  // Track previous pillar to prevent unnecessary resets
  const prevPillarRef = useRef<string | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/quiz/take' } })
      return
    }

    fetchQuiz()
  }, [navigate])

  const fetchQuiz = async () => {
    try {
      setLoading(true)
      // Check if this is a pillar-specific quiz
      const urlParams = new URLSearchParams(window.location.search)
      const pillar = urlParams.get('pillar')
      
      let url = '/api/quiz/10x'
      if (pillar) {
        url = `/api/quiz/pillar/${pillar}`
        setIsSinglePillarQuiz(true) // Set flag for single pillar quiz
      } else {
        setIsSinglePillarQuiz(false) // Full quiz with all pillars
      }
      
      try {
        const data = await api.get(url)
        setQuiz(data)
        
        // Group questions by pillar
        if (data.questions && data.questions.length > 0) {
          const firstPillar = data.questions[0].pillarTag
          setCurrentPillar(firstPillar)
          setCurrentQuestionIndex(0)
          prevPillarRef.current = firstPillar
        } else {
          console.warn('Quiz loaded but no questions found')
          const pillarName = pillar ? PILLAR_INFO[pillar as keyof typeof PILLAR_INFO]?.name || pillar : 'this quiz'
          notify.warning(`No questions found for ${pillarName}. Please add questions in the admin panel.`)
        }
      } catch (apiError: any) {
        console.error('API error fetching quiz:', apiError)
        let errorMessage = apiError.message || 'Failed to load quiz. Please try again.'
        
        // Handle specific error cases
        if (apiError.message?.includes('Invalid pillar tag')) {
          errorMessage = `Invalid pillar name. Please check the URL and try again.`
        } else if (apiError.message?.includes('Quiz not configured') || apiError.message?.includes('not found')) {
          const pillarName = pillar ? PILLAR_INFO[pillar as keyof typeof PILLAR_INFO]?.name || pillar : 'the quiz'
          errorMessage = `The ${pillarName} quiz has not been configured yet. Please contact an administrator to set up the quiz questions in the admin panel.`
        } else if (apiError.message?.includes('No questions found')) {
          const pillarName = pillar ? PILLAR_INFO[pillar as keyof typeof PILLAR_INFO]?.name || pillar : 'this quiz'
          errorMessage = `No questions have been added for ${pillarName} yet. Please add questions in the admin panel.`
        }
        
        notify.error(errorMessage)
      }
    } catch (error: any) {
      console.error('Failed to fetch quiz:', error)
      notify.error(error.message || 'Failed to load quiz. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Memoize getPillarQuestions to prevent recreating arrays
  const getPillarQuestions = useCallback((pillarTag: string) => {
    if (!quiz) return []
    return quiz.questions.filter(q => q.pillarTag === pillarTag)
  }, [quiz])

  // Get current pillar questions - memoized
  const currentPillarQuestions = useMemo(() => {
    if (!currentPillar || !quiz) return []
    return getPillarQuestions(currentPillar)
  }, [currentPillar, quiz, getPillarQuestions])

  const totalQuestionsInPillar = currentPillarQuestions.length

  // Reset question index when pillar changes
  useEffect(() => {
    if (!currentPillar || !quiz) return
    
    // Only reset if pillar actually changed
    if (prevPillarRef.current !== currentPillar) {
      setCurrentQuestionIndex(0)
      prevPillarRef.current = currentPillar
    }
  }, [currentPillar, quiz])

  // Ensure valid question index
  const safeQuestionIndex = useMemo(() => {
    if (totalQuestionsInPillar === 0) return 0
    return Math.max(0, Math.min(currentQuestionIndex, totalQuestionsInPillar - 1))
  }, [currentQuestionIndex, totalQuestionsInPillar])

  const currentQuestion = currentPillarQuestions[safeQuestionIndex] || null

  // Calculate total question number across all pillars
  const questionNumber = useMemo(() => {
    if (!quiz || !currentPillar) return 0
    const pillars = Object.keys(PILLAR_INFO)
    const currentPillarIndex = pillars.indexOf(currentPillar)
    if (currentPillarIndex === -1) return 0
    
    let total = 0
    for (let i = 0; i < currentPillarIndex; i++) {
      const pillarQuestions = getPillarQuestions(pillars[i])
      total += pillarQuestions.length
    }
    
    total += safeQuestionIndex + 1
    return total
  }, [quiz, currentPillar, safeQuestionIndex, getPillarQuestions])

  const handleAnswer = useCallback((questionId: number, answer: number | string) => {
    setAnswers(prev => {
      if (prev[questionId] === answer) {
        return prev
      }
      return {
        ...prev,
        [questionId]: answer
      }
    })
    
    // Auto-advance to next question after a short delay
    setTimeout(() => {
      if (!currentPillar || !quiz) return
      
      const pillarQuestions = getPillarQuestions(currentPillar)
      const currentIndex = pillarQuestions.findIndex(q => q.id === questionId)
      
      if (currentIndex === -1) return
      
      // If there are more questions in this pillar, advance
      if (currentIndex < pillarQuestions.length - 1) {
        setCurrentQuestionIndex(currentIndex + 1)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      } else {
        // Last question in pillar - only advance to next pillar if NOT a single pillar quiz
        if (!isSinglePillarQuiz) {
          const pillars = Object.keys(PILLAR_INFO)
          const currentPillarIndex = pillars.indexOf(currentPillar)
          
          if (currentPillarIndex < pillars.length - 1) {
            setCurrentPillar(pillars[currentPillarIndex + 1])
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }
        // For single pillar quiz, stay on last question to show submit button
      }
    }, 300)
  }, [currentPillar, quiz, getPillarQuestions, isSinglePillarQuiz])

  const getAnsweredCount = useCallback(() => {
    return Object.keys(answers).length
  }, [answers])

  const getTotalQuestions = useCallback(() => {
    return quiz?.questions.length || 0
  }, [quiz])

  const getProgress = useCallback(() => {
    const total = getTotalQuestions()
    return total > 0 ? (getAnsweredCount() / total) * 100 : 0
  }, [getTotalQuestions, getAnsweredCount])

  const isPillarComplete = useCallback((pillarTag: string) => {
    const pillarQuestions = getPillarQuestions(pillarTag)
    return pillarQuestions.every(q => answers[q.id] !== undefined)
  }, [getPillarQuestions, answers])

  const handleSubmit = async () => {
    const total = getTotalQuestions()
    const answered = getAnsweredCount()

    if (answered < total) {
      if (!confirm(`You have answered ${answered} out of ${total} questions. Do you want to submit anyway?`)) {
        return
      }
    }

    setSubmitting(true)

    try {
      const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer: answer
      }))

      // Check if this is a pillar-specific quiz
      const urlParams = new URLSearchParams(window.location.search)
      const pillar = urlParams.get('pillar')
      
      let submitUrl = '/api/quiz/10x/submit'
      if (pillar) {
        submitUrl = `/api/quiz/pillar/${pillar}/submit`
      }
      
      const result = await api.post(submitUrl, { answers: answersArray })
      navigate('/quiz/results', { state: { result } })
    } catch (error: any) {
      console.error('Failed to submit quiz:', error)
      if (error.message && (error.message.includes('401') || error.message.includes('Unauthorized'))) {
        notify.warning('Your session has expired. Please log in again.')
        navigate('/login', { state: { from: '/quiz/take' } })
      } else {
        notify.error(error.message || 'Failed to submit quiz. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const pillars = Object.keys(PILLAR_INFO)
  const allPillarsComplete = useMemo(() => {
    if (isSinglePillarQuiz && currentPillar) {
      // For single pillar quiz, check if all questions in current pillar are answered
      return isPillarComplete(currentPillar)
    }
    // For full quiz, check if all pillars are complete
    return pillars.every(p => isPillarComplete(p))
  }, [pillars, isPillarComplete, isSinglePillarQuiz, currentPillar, answers])

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-card">
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Loading quiz...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!quiz || !quiz.questions || quiz.questions.length === 0) {
    return (
      <div className="page-container">
        <div className="content-card">
          <div className="text-center p-8">
            <p className="text-gray-600">Quiz not available. Please contact support.</p>
            <button
              onClick={() => navigate('/quizzes')}
              className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="quiz-header-row">
          <div className="quiz-header-left">
            <button
              onClick={() => navigate('/quizzes')}
              className="quiz-back-button"
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="quiz-title-inline">{quiz.name}</h1>
          </div>
          <div className="quiz-header-right">
            <p className="quiz-description-inline">{quiz.description}</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="quiz-progress-container">
          <div className="quiz-progress-info">
            <span className="quiz-progress-text">
              Progress: {getAnsweredCount()} / {getTotalQuestions()} questions
            </span>
            <span className="quiz-progress-text">
              {Math.round(getProgress())}%
            </span>
          </div>
          <div className="quiz-progress-bar-wrapper">
            <div
              className="quiz-progress-bar"
              style={{ width: `${getProgress()}%` }}
            ></div>
          </div>
        </div>

        {/* Pillar Navigation - Only show for full quiz, not individual pillar quizzes */}
        {!isSinglePillarQuiz && (
          <div className="quiz-pillar-nav">
            {pillars.map(pillarTag => {
              const info = PILLAR_INFO[pillarTag as keyof typeof PILLAR_INFO]
              const isComplete = isPillarComplete(pillarTag)
              const isActive = currentPillar === pillarTag
              
              return (
                <button
                  key={pillarTag}
                  onClick={() => {
                    setCurrentPillar(pillarTag)
                    setCurrentQuestionIndex(0)
                    prevPillarRef.current = pillarTag
                  }}
                  className={`quiz-pillar-button ${
                    isActive ? 'active' : isComplete ? 'complete' : 'inactive'
                  }`}
                  style={isActive ? { backgroundColor: info.color } : {}}
                >
                  <span>{info.icon}</span>
                  {info.name}
                  {isComplete && <CheckCircle size={14} />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Single Question Card */}
      <div className="content-card">
        {currentPillar && quiz && (
          <>
            {/* Pillar Tag */}
            <div className="quiz-pillar-tag">
              {PILLAR_INFO[currentPillar as keyof typeof PILLAR_INFO].name.toUpperCase()}
            </div>

            {/* Question Card - Only show if currentQuestion exists */}
            {currentQuestion && (
            <div className="quiz-single-question-card">
              <div className="quiz-question-header">
                <span className="quiz-question-number">
                  Question {questionNumber} of {getTotalQuestions()}
                </span>
                <h3 className="quiz-question-text">{currentQuestion.text}</h3>
              </div>

              {currentQuestion.type === 'SCALE' && (
                <div className="quiz-scale-section">
                  <div className="quiz-scale-labels">
                    <span className="quiz-scale-label-left">Very weak</span>
                    <span className="quiz-scale-label-right">World-class →</span>
                  </div>
                  <div className="quiz-scale-container">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <button
                        key={num}
                        onClick={() => handleAnswer(currentQuestion.id, num)}
                        className={`quiz-scale-button ${answers[currentQuestion.id] === num ? 'selected' : ''}`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentQuestion.type === 'MULTIPLE_CHOICE' && currentQuestion.options && (
                <div className="quiz-options-section">
                  {currentQuestion.options.map((option: string, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(currentQuestion.id, idx)}
                      className={`quiz-option-button ${answers[currentQuestion.id] === idx ? 'selected' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        {answers[currentQuestion.id] === idx ? (
                          <CheckCircle className="text-blue-600" size={20} />
                        ) : (
                          <Circle className="text-gray-400" size={20} />
                        )}
                        <span className="font-medium">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === 'OPEN' && (
                <div className="quiz-textarea-section">
                  <textarea
                    value={answers[currentQuestion.id] as string || ''}
                    onChange={(e) => {
                      const value = e.target.value
                      setAnswers(prev => ({
                        ...prev,
                        [currentQuestion.id]: value
                      }))
                    }}
                    placeholder="Type your answer here..."
                    className="quiz-textarea"
                    onBlur={(e) => {
                      const value = e.target.value.trim()
                      if (value && currentPillar && quiz) {
                        setTimeout(() => {
                          if (safeQuestionIndex < totalQuestionsInPillar - 1) {
                            setCurrentQuestionIndex(safeQuestionIndex + 1)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                          } else if (!isSinglePillarQuiz) {
                            // Only advance to next pillar if it's not a single pillar quiz
                            const pillars = Object.keys(PILLAR_INFO)
                            const currentPillarIndex = pillars.indexOf(currentPillar)
                            if (currentPillarIndex < pillars.length - 1) {
                              setCurrentPillar(pillars[currentPillarIndex + 1])
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }
                          }
                        }, 500)
                      }
                    }}
                  />
                </div>
              )}

              {/* Manual Navigation */}
              <div className="quiz-question-nav">
                <button
                  onClick={() => {
                    if (safeQuestionIndex > 0) {
                      setCurrentQuestionIndex(safeQuestionIndex - 1)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    } else if (!isSinglePillarQuiz) {
                      // Only navigate to previous pillar if it's not a single pillar quiz
                      const pillars = Object.keys(PILLAR_INFO)
                      const currentPillarIndex = pillars.indexOf(currentPillar!)
                      if (currentPillarIndex > 0) {
                        const prevPillar = pillars[currentPillarIndex - 1]
                        const prevPillarQuestions = getPillarQuestions(prevPillar)
                        setCurrentPillar(prevPillar)
                        setCurrentQuestionIndex(prevPillarQuestions.length - 1)
                        prevPillarRef.current = prevPillar
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }
                    }
                  }}
                  disabled={safeQuestionIndex === 0 && (isSinglePillarQuiz || pillars.indexOf(currentPillar!) === 0)}
                  className="quiz-nav-button prev"
                >
                  ← Previous
                </button>

                <button
                  onClick={() => {
                    if (safeQuestionIndex < totalQuestionsInPillar - 1) {
                      setCurrentQuestionIndex(safeQuestionIndex + 1)
                      window.scrollTo({ top: 0, behavior: 'smooth' })
                    } else if (!isSinglePillarQuiz) {
                      // Only navigate to next pillar if it's not a single pillar quiz
                      const pillars = Object.keys(PILLAR_INFO)
                      const currentPillarIndex = pillars.indexOf(currentPillar!)
                      if (currentPillarIndex < pillars.length - 1) {
                        setCurrentPillar(pillars[currentPillarIndex + 1])
                        prevPillarRef.current = pillars[currentPillarIndex + 1]
                        window.scrollTo({ top: 0, behavior: 'smooth' })
                      }
                    }
                  }}
                  disabled={safeQuestionIndex === totalQuestionsInPillar - 1 && (isSinglePillarQuiz || pillars.indexOf(currentPillar!) === pillars.length - 1)}
                  className="quiz-nav-button next"
                >
                  Next →
                </button>
              </div>
            </div>
            )}

            {/* Submit Button - Show when all questions in current pillar are answered */}
            {allPillarsComplete && (
              <div className="quiz-submit-section">
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="quiz-submit-button"
                >
                  {submitting ? 'Submitting...' : isSinglePillarQuiz ? '✅ Submit Pillar Quiz' : '✅ Submit Quiz'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default QuizTake
