import { Link } from 'react-router-dom'
import { 
  BookOpen, 
  Star, 
  ArrowRight, 
  Sparkles,
  Quote,
  Target,
  Brain
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import MagicalCursor from '../../components/MagicalCursor'
import '../Landing.css'
import './LandingPages.css'
import './ExpandedPages.css'

const BookReviews = () => {
  const featuredBooks = [
    {
      title: 'The 10X Rule',
      author: 'Grant Cardone',
      rating: 5,
      category: 'Business Growth',
      color: '#3b82f6',
      excerpt: 'Success is not something that happens to you; it\'s something that happens because of you and the actions you take.',
      keyTakeaways: [
        'Set goals 10X bigger than what you think you need',
        'Take 10X more action than you think is required',
        'Never reduce your targets when challenges arise'
      ],
      whyWeRecommend: 'The foundation of our 10X philosophy. This book challenges you to think bigger and act bolder.'
    },
    {
      title: 'Built to Sell',
      author: 'John Warrillow',
      rating: 5,
      category: 'Exit Strategy',
      color: '#22c55e',
      excerpt: 'The number one mistake entrepreneurs make is to build a business that relies too heavily on them.',
      keyTakeaways: [
        'Specialize in one thing that you can do better than anyone',
        'Create recurring revenue that doesn\'t depend on you',
        'Build systems that work without your constant involvement'
      ],
      whyWeRecommend: 'Essential reading for anyone planning an exit. Tanner Chase\'s coaching is heavily influenced by these principles.'
    },
    {
      title: 'Scaling Up',
      author: 'Verne Harnish',
      rating: 5,
      category: 'Operations',
      color: '#f59e0b',
      excerpt: 'Growth sucks cash. The bigger you get, the harder it is to grow, unless you get the people, strategy, execution, and cash right.',
      keyTakeaways: [
        'Master the four decisions: People, Strategy, Execution, Cash',
        'Implement daily and weekly meeting rhythms',
        'Create a one-page strategic plan'
      ],
      whyWeRecommend: 'The playbook for scaling operations efficiently. Jeffrey Wells\' coaching methodology draws from these frameworks.'
    },
    {
      title: 'Traction',
      author: 'Gino Wickman',
      rating: 5,
      category: 'Systems',
      color: '#8b5cf6',
      excerpt: 'Most entrepreneurs are living in an abyss, where their vision doesn\'t match their company\'s ability to get there.',
      keyTakeaways: [
        'Implement the Entrepreneurial Operating System (EOS)',
        'Clarify your vision and share it with everyone',
        'Create 90-day rocks and track weekly progress'
      ],
      whyWeRecommend: 'A practical system for running your business. Our huddle framework incorporates many EOS principles.'
    }
  ]

  const additionalBooks = [
    { title: 'Good to Great', author: 'Jim Collins', category: 'Leadership', rating: 5 },
    { title: 'The E-Myth Revisited', author: 'Michael Gerber', category: 'Systems', rating: 5 },
    { title: 'Never Split the Difference', author: 'Chris Voss', category: 'Negotiation', rating: 5 },
    { title: 'Influence', author: 'Robert Cialdini', category: 'Psychology', rating: 5 },
    { title: 'Blue Ocean Strategy', author: 'W. Chan Kim', category: 'Strategy', rating: 4 },
    { title: 'The Lean Startup', author: 'Eric Ries', category: 'Innovation', rating: 5 },
    { title: 'Atomic Habits', author: 'James Clear', category: 'Productivity', rating: 5 },
    { title: 'Start With Why', author: 'Simon Sinek', category: 'Leadership', rating: 5 }
  ]

  const renderStars = (rating: number) => {
    return [...Array(5)].map((_, i) => (
      <Star 
        key={i} 
        size={16} 
        className={i < rating ? 'star-filled' : 'star-empty'}
        fill={i < rating ? '#f59e0b' : 'none'}
      />
    ))
  }

  return (
    <div className="landing-page expanded-page">
      <MagicalCursor />
      <Navbar />
      
      {/* Hero Section */}
      <section className="expanded-hero books-hero">
        <div className="expanded-hero-bg">
          <div className="hero-mesh"></div>
          <div className="floating-shapes">
            {[...Array(12)].map((_, i) => (
              <div 
                key={i} 
                className="floating-shape"
                style={{
                  '--x': `${Math.random() * 100}%`,
                  '--y': `${Math.random() * 100}%`,
                  '--size': `${30 + Math.random() * 40}px`,
                  '--duration': `${25 + Math.random() * 15}s`,
                  '--delay': `${Math.random() * -20}s`
                } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="hero-gradient-orbs">
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>
          </div>
        </div>
        
        <div className="expanded-hero-content">
          <div className="hero-badge-animated">
            <BookOpen size={18} />
            <span>Curated Library</span>
            <div className="badge-shimmer"></div>
          </div>
          
          <h1 className="expanded-hero-title">
            <span className="title-line">Books That</span>
            <span className="title-line gradient-text-animated">10X Your Business</span>
          </h1>
          
          <p className="expanded-hero-subtitle">
            Handpicked by our team of experts. These are the books that have shaped 
            our coaching philosophy and transformed thousands of businesses.
          </p>
        </div>
      </section>

      {/* Featured Books */}
      <section className="featured-books-section">
        <div className="section-full-header">
          <span className="section-badge-lg">
            <Sparkles size={18} />
            Must Read
          </span>
          <h2 className="section-title-xl">
            Featured <span className="gradient-text">Recommendations</span>
          </h2>
        </div>

        <div className="featured-books-grid">
          {featuredBooks.map((book, index) => (
            <div 
              key={index} 
              className="featured-book-card"
              style={{ '--book-color': book.color } as React.CSSProperties}
            >
              <div className="book-card-glow"></div>
              
              <div className="book-visual">
                <div className="book-spine"></div>
                <div className="book-cover-main">
                  <div className="cover-pattern"></div>
                  <div className="cover-content">
                    <span className="book-category-badge">{book.category}</span>
                    <h3 className="book-cover-title">{book.title}</h3>
                    <p className="book-cover-author">by {book.author}</p>
                  </div>
                </div>
              </div>
              
              <div className="book-details">
                <div className="book-rating-row">
                  <div className="stars">{renderStars(book.rating)}</div>
                  <span className="rating-text">Essential Read</span>
                </div>
                
                <div className="book-quote">
                  <Quote size={20} className="quote-icon" />
                  <p>"{book.excerpt}"</p>
                </div>
                
                <div className="book-takeaways">
                  <h4>Key Takeaways:</h4>
                  <ul>
                    {book.keyTakeaways.map((takeaway, i) => (
                      <li key={i}>{takeaway}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="book-recommendation">
                  <h4>Why We Recommend:</h4>
                  <p>{book.whyWeRecommend}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Additional Books Grid */}
      <section className="books-section">
        <div className="section-full-header">
          <span className="section-badge-lg">
            <Brain size={18} />
            More Recommendations
          </span>
          <h2 className="section-title-xl">
            Extended <span className="gradient-text">Reading List</span>
          </h2>
        </div>

        <div className="books-grid">
          {additionalBooks.map((book, index) => (
            <div key={index} className="book-card">
              <div className="book-cover">
                <div className="book-cover-pattern"></div>
                <div className="book-title-preview">{book.title}</div>
              </div>
              <div className="book-content">
                <div className="book-rating">{renderStars(book.rating)}</div>
                <h3 className="book-title">{book.title}</h3>
                <p className="book-author">by {book.author}</p>
                <span className="book-category">{book.category}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="expanded-cta-section">
        <div className="cta-bg-effects">
          <div className="cta-orb cta-orb-1"></div>
          <div className="cta-orb cta-orb-2"></div>
        </div>
        
        <div className="expanded-cta-content">
          <div className="cta-icon-wrapper">
            <Target size={48} />
          </div>
          <h2 className="cta-title-xl">Ready to Apply These Principles?</h2>
          <p className="cta-subtitle-lg">
            Our AI coaches are trained on the best business literature. 
            Get personalized guidance based on proven strategies.
          </p>
          <div className="cta-buttons-row">
            <Link to="/signup" className="cta-btn-primary large">
              <span>Start Coaching Now</span>
              <ArrowRight size={22} />
              <div className="btn-glow"></div>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default BookReviews

