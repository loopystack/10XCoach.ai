import { HelpCircle, MessageSquare, Send, Play } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import './PageStyles.css'

interface Coach {
  id: number
  name: string
  role: string
  specialty?: string
}

const DiscoveryQuestions = () => {
  const navigate = useNavigate()
  const [coaches, setCoaches] = useState<Coach[]>([])

  useEffect(() => {
    const fetchCoaches = async () => {
      try {
        const data = await api.get('/api/coaches')
        if (Array.isArray(data)) {
          setCoaches(data)
        }
      } catch (error) {
        console.error('Error fetching coaches:', error)
      }
    }
    fetchCoaches()
  }, [])

  const questionCategories = [
    {
      category: 'Strategy',
      pillar: 'STRATEGY',
      coach: 'Strategy Coach',
      questions: [
        'Can you help me figure out what I should really be focusing on right now?',
        'Where do you think my strategy is unclear or holding me back?',
        'Am I aiming at the right opportunities for where my business is today?',
        'What strategic decisions am I avoiding that I probably need to make?',
        'How do I simplify my strategy without slowing down growth?'
      ]
    },
    {
      category: 'Sales',
      pillar: 'SALES',
      coach: 'Sales Coach',
      questions: [
        'Where do you see my sales process breaking down?',
        'Why do some deals move forward while others stall out?',
        'What\'s the biggest thing stopping my sales from being more consistent?',
        'How can I improve my close rate without adding more pressure?',
        'What should I fix first if I want more predictable revenue?'
      ]
    },
    {
      category: 'Marketing',
      pillar: 'MARKETING',
      coach: 'Marketing Coach',
      questions: [
        'Which of my marketing efforts are actually working right now?',
        'Is my message clear enough for the customers I want to attract?',
        'Where am I wasting time or money on marketing?',
        'How can I better connect my marketing to actual sales?',
        'What marketing change would give me the biggest return the fastest?'
      ]
    },
    {
      category: 'Operations',
      pillar: 'OPERATIONS',
      coach: 'Operations Coach',
      questions: [
        'What parts of my business feel harder than they should be?',
        'Where am I missing systems or processes that are slowing things down?',
        'What am I personally doing that the business shouldn\'t rely on me for?',
        'How ready is my operation to handle growth?',
        'If I wanted things to run smoother, where should I start?'
      ]
    },
    {
      category: 'Culture',
      pillar: 'CULTURE',
      coach: 'Culture Coach',
      questions: [
        'How healthy does my team culture look from the outside?',
        'Where do you see misalignment or lack of accountability showing up?',
        'What behaviors am I unintentionally encouraging or allowing?',
        'How can I build a culture where people take more ownership?',
        'What should I focus on to grow stronger leaders on my team?'
      ]
    },
    {
      category: 'Customer Centricity',
      pillar: 'CUSTOMER_CENTRICITY',
      coach: 'Customer Centricity Coach',
      questions: [
        'How well do I really understand my customers\' needs?',
        'Where might customers be getting frustrated or confused?',
        'What could I do to keep customers coming back more often?',
        'How well am I actually using customer feedback?',
        'What would my customers say I need to improve the most?'
      ]
    },
    {
      category: 'Finance',
      pillar: 'FINANCE',
      coach: 'Finances Coach',
      questions: [
        'How healthy are my finances, really?',
        'Which numbers should I be paying closer attention to?',
        'Where am I most exposed financially without realizing it?',
        'What can I do to improve cash flow and profitability?',
        'What financial decisions today will matter most in the long run?'
      ]
    },
    {
      category: 'Exit Readiness',
      pillar: 'EXIT_STRATEGY',
      coach: 'Exit Readiness Coach',
      questions: [
        'If I wanted to exit someday, how prepared is my business right now?',
        'What\'s limiting the value of my business today?',
        'How dependent is the business on me personally?',
        'What should I start fixing now to keep exit options open?',
        'What would a realistic exit timeline look like for my situation?'
      ]
    }
  ]

  const getCoachForPillar = (pillar: string) => {
    return coaches.find(coach => {
      const coachRole = coach.role?.toUpperCase()
      return coachRole === pillar
    })
  }

  const handleStarterQuestions = (pillar: string) => {
    const coach = getCoachForPillar(pillar)
    if (coach) {
      navigate(`/coaches?coach=${coach.id}`)
    } else {
      navigate('/coaches')
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>10X Discovery Questions</h1>
        <p className="page-subtitle">Starter questions for clients, organized by the 8 Business Pillars. Each set is clearly mapped to the pillars, written in plain, approachable language a business owner would actually use.</p>
      </div>

      <div className="discovery-intro">
        <div className="intro-card">
          <HelpCircle size={48} />
          <h2>10XCoach.ai – Starter Questions</h2>
          <p>These questions are designed for clients to use when starting conversations with their coaches. Each pillar has 5 starter questions written in plain, approachable language that business owners can use to begin meaningful coaching conversations.</p>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            Click "Starter Questions" for any pillar to connect with the appropriate coach and begin your conversation.
          </p>
        </div>
      </div>

      <div className="questions-container">
        {questionCategories.map((category, index) => (
          <div key={index} className="question-category">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div>
                <h2>{index + 1}. {category.category} Pillar</h2>
                {category.coach && (
                  <p className="coach-label">({category.coach})</p>
                )}
              </div>
              <button
                className="primary-button"
                onClick={() => handleStarterQuestions(category.pillar)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '10px 20px',
                  fontSize: '14px',
                  fontWeight: 600
                }}
              >
                <Play size={18} />
                Starter Questions
              </button>
            </div>
              <div className="questions-list">
                {category.questions.map((question, qIndex) => (
                  <div key={qIndex} className="question-item">
                    <MessageSquare size={20} />
                    <p><strong>{qIndex + 1}.</strong> "{question}"</p>
                  </div>
                ))}
              </div>
            </div>
        ))}
      </div>

      <div className="action-section">
        <div className="action-card">
          <h3>Ready to Start?</h3>
          <p>Click "Starter Questions" for any pillar to connect with the appropriate coach and begin your conversation.</p>
          <button 
            className="primary-button"
            onClick={() => navigate('/coaches')}
          >
            <Send size={18} />
            View All Coaches
          </button>
        </div>
      </div>
    </div>
  )
}

export default DiscoveryQuestions

