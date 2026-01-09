import { HelpCircle, MessageSquare, Send } from 'lucide-react'
import './PageStyles.css'

const DiscoveryQuestions = () => {
  const questionCategories = [
    {
      category: 'Business Strategy',
      coach: 'Strategy Coach',
      questions: [
        'Walk me through how you currently set and review your business goals.',
        'What are the top initiatives you\'re focused on this quarter?',
        'How do you measure success for those initiatives?',
        'Which part of your strategy excites you most—and which feels most challenging?',
        'If you could change one strategic priority tomorrow, what would it be and why?'
      ]
    },
    {
      category: 'Sales',
      coach: 'Sales Coach',
      questions: [
        'Describe your sales process from lead to close—what steps do you follow?',
        'What sales initiatives are a top priority for your team right now?',
        'How does your team feel about the current sales process?',
        'Which parts of your sales cycle move fastest, and which tend to stall?',
        'If your ideal customer walked in today, how would your sales system handle them?'
      ]
    },
    {
      category: 'Marketing',
      coach: 'Marketing Coach',
      questions: [
        'Walk me through how you generate and nurture leads today.',
        'Which marketing campaigns are most critical this quarter?',
        'How do you know which marketing channels are working best?',
        'What does your ideal customer journey look like from awareness to loyalty?',
        'If you could double your marketing budget tomorrow, where would you put it first?'
      ]
    },
    {
      category: 'Operations',
      coach: 'Operations Coach',
      questions: [
        'Describe how your team manages daily operations or key processes.',
        'What operational improvements are you planning this year?',
        'Which systems or workflows do employees complain about most?',
        'What\'s your process for tracking and improving operational efficiency?',
        'If you stepped away for 30 days, which operational areas would hold up and which might fail?'
      ]
    },
    {
      category: 'Finance',
      coach: 'Finance Coach',
      questions: [
        'Tell me about how you currently track cash flow and profitability.',
        'What financial initiatives are you implementing to improve performance?',
        'Which financial metrics do you monitor most often?',
        'How does your finance team feel about their tools and processes?',
        'If an investor or buyer asked for a snapshot of your finances today, how ready would you be?'
      ]
    },
    {
      category: 'Culture',
      coach: 'Culture Coach',
      questions: [
        'Walk me through how you onboard, develop, and retain your team.',
        'What culture or engagement initiatives are you prioritizing this year?',
        'How do your employees describe the company\'s culture?',
        'Where do you see the biggest gaps between your desired culture and reality?',
        'If you could implement one culture shift tomorrow, what would it be?'
      ]
    },
    {
      category: 'Customer Centricity',
      coach: 'Customer Experience Coach',
      questions: [
        'Explain how you currently gather and act on customer feedback.',
        'What customer-focused projects are most important this quarter?',
        'Which parts of the customer journey cause the most friction?',
        'How does your team measure customer satisfaction and loyalty?',
        'If you could improve one customer touchpoint overnight, which would you pick?'
      ]
    },
    {
      category: 'Exit Readiness',
      coach: 'Exit & Succession Coach',
      questions: [
        'Describe how your business could operate without you—what would break first?',
        'What steps are you taking now to increase your company\'s attractiveness to buyers or investors?',
        'How confident is your leadership team about succession or exit planning?',
        'What financial or operational gaps would a buyer flag right now?',
        'If you planned to exit in 12–24 months, what would you prioritize first to increase valuation?'
      ]
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>10X Discovery Questions</h1>
        <p className="page-subtitle">5 questions per pillar. These are written as coach prompts to accelerate client conversations, starting with situations, initiatives, and workflows, then layering in emotional and strategic follow-ups.</p>
      </div>

      <div className="discovery-intro">
        <div className="intro-card">
          <HelpCircle size={48} />
          <h2>10XCoach.ai – Master Prompt Set</h2>
          <p>These questions are designed to help your coach understand your business, challenges, and goals. Start with workflow questions to open the conversation safely, move to initiatives to uncover leadership priorities, ask feelings to unlock hidden constraints and motivations, and end with "what if" scenarios to spark reflection and action.</p>
          <p style={{ marginTop: '1rem', fontStyle: 'italic', color: 'var(--text-secondary)' }}>
            This approach aligns with 10XCoach.ai's core philosophy: guide clients into revealing their real challenges naturally, without interrogation, and accelerate insights in every session.
          </p>
        </div>
      </div>

      <div className="questions-container">
        {questionCategories.map((category, index) => (
          <div key={index} className="question-category">
            <h2>{index + 1}. {category.category}</h2>
            {category.coach && (
              <p className="coach-label">({category.coach})</p>
            )}
            <div className="questions-list">
              {category.questions.map((question, qIndex) => (
                <div key={qIndex} className="question-item">
                  <MessageSquare size={20} />
                  <p><strong>{qIndex + 1}.</strong> {question}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="action-section">
        <div className="action-card">
          <h3>Ready to Start?</h3>
          <p>Schedule a session with your coach to discuss these questions and create your 10X action plan.</p>
          <button className="primary-button">
            <Send size={18} />
            Contact Your Coach
          </button>
        </div>
      </div>
    </div>
  )
}

export default DiscoveryQuestions

