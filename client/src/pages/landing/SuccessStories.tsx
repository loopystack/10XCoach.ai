import { Link } from 'react-router-dom'
import { 
  Trophy, 
  TrendingUp, 
  ArrowRight, 
  Quote,
  Star,
  Building2,
  Users,
  DollarSign,
  Rocket,
  Target,
  BarChart3,
  Award
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import MagicalCursor from '../../components/MagicalCursor'
import '../Landing.css'
import './LandingPages.css'
import './ExpandedPages.css'

const SuccessStories = () => {
  const featuredStories = [
    {
      name: 'Sarah Mitchell',
      company: 'TechScale Solutions',
      role: 'CEO & Founder',
      avatar: 'SM',
      industry: 'SaaS',
      quote: '10XCoach.ai transformed how I think about my business. The AI coaches helped me identify blind spots I didn\'t even know I had. We went from struggling to close deals to having a predictable, scalable sales engine.',
      results: [
        { metric: '340%', label: 'Revenue Growth', icon: TrendingUp },
        { metric: '2.4x', label: 'Team Size', icon: Users },
        { metric: '$4.2M', label: 'ARR Achieved', icon: DollarSign }
      ],
      timeframe: '18 months',
      coaches: ['Rob Mercer', 'Alan Wozniak'],
      color: '#3b82f6'
    },
    {
      name: 'Michael Chen',
      company: 'Evergreen Manufacturing',
      role: 'President',
      avatar: 'MC',
      industry: 'Manufacturing',
      quote: 'The operations coaching from Jeffrey Wells was a game-changer. We streamlined our processes, reduced waste by 40%, and finally have systems that run without me being in the building every day.',
      results: [
        { metric: '40%', label: 'Cost Reduction', icon: BarChart3 },
        { metric: '3x', label: 'Productivity', icon: Rocket },
        { metric: '85%', label: 'Owner Freedom', icon: Target }
      ],
      timeframe: '12 months',
      coaches: ['Jeffrey Wells', 'Hudson Jaxon'],
      color: '#22c55e'
    },
    {
      name: 'Jennifer Adams',
      company: 'Luxe Consulting Group',
      role: 'Managing Partner',
      avatar: 'JA',
      industry: 'Professional Services',
      quote: 'The combination of Chelsea\'s culture coaching and Camille\'s customer experience insights helped us create a world-class team and service delivery. Our NPS went from 32 to 78.',
      results: [
        { metric: '78', label: 'NPS Score', icon: Star },
        { metric: '95%', label: 'Retention Rate', icon: Users },
        { metric: '2.8x', label: 'Revenue/Employee', icon: DollarSign }
      ],
      timeframe: '14 months',
      coaches: ['Chelsea Fox', 'Camille Quinn'],
      color: '#8b5cf6'
    }
  ]

  const additionalTestimonials = [
    {
      quote: 'Finally, a coaching solution that understands the real challenges of running a business. The AI coaches are available 24/7 and the advice is always actionable.',
      name: 'David Park',
      company: 'Horizon Ventures',
      result: '5x ROI in first quarter'
    },
    {
      quote: 'The Big Exit Blueprint coaching helped me position my company for acquisition. We sold for 40% above our initial valuation target.',
      name: 'Amanda Foster',
      company: 'DataFlow Analytics',
      result: '$12M Exit'
    },
    {
      quote: 'Teresa\'s marketing coaching completely transformed our brand. We went from unknown to industry leader in our niche.',
      name: 'Ryan Thompson',
      company: 'Apex Fitness',
      result: '10x Lead Generation'
    },
    {
      quote: 'The financial coaching helped me understand my numbers like never before. Now I make decisions based on data, not gut feelings.',
      name: 'Lisa Wang',
      company: 'Innovate Labs',
      result: '65% Margin Improvement'
    },
    {
      quote: 'As a solopreneur, I felt lost. 10XCoach.ai gave me a clear roadmap and the accountability I needed to scale.',
      name: 'Marcus Johnson',
      company: 'Elite Coaching Co.',
      result: 'Solo to 8-Person Team'
    },
    {
      quote: 'The huddle framework alone was worth the subscription. Our team meetings are now focused, efficient, and actually productive.',
      name: 'Emily Rodriguez',
      company: 'Verde Marketing',
      result: '50% Time Saved Weekly'
    }
  ]

  const overallStats = [
    { number: '2,400+', label: 'Businesses Transformed', icon: Building2 },
    { number: '$1.2B', label: 'Revenue Generated', icon: DollarSign },
    { number: '340+', label: 'Successful Exits', icon: Trophy },
    { number: '4.9/5', label: 'Customer Rating', icon: Star }
  ]

  return (
    <div className="landing-page expanded-page">
      <MagicalCursor />
      <Navbar />
      
      {/* Hero Section */}
      <section className="expanded-hero stories-hero">
        <div className="expanded-hero-bg">
          <div className="hero-mesh"></div>
          <div className="floating-shapes">
            {[...Array(15)].map((_, i) => (
              <div 
                key={i} 
                className="floating-shape"
                style={{
                  '--x': `${Math.random() * 100}%`,
                  '--y': `${Math.random() * 100}%`,
                  '--size': `${25 + Math.random() * 45}px`,
                  '--duration': `${22 + Math.random() * 18}s`,
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
            <Trophy size={18} />
            <span>Real Results</span>
            <div className="badge-shimmer"></div>
          </div>
          
          <h1 className="expanded-hero-title">
            <span className="title-line">Success Stories</span>
            <span className="title-line gradient-text-animated">That Inspire</span>
          </h1>
          
          <p className="expanded-hero-subtitle">
            Discover how entrepreneurs and business leaders have transformed their companies 
            with AI-powered coaching. These are their stories.
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="metrics-section">
        <div className="metrics-track">
          <div className="metrics-scroll" style={{ animationDuration: '40s' }}>
            {[...overallStats, ...overallStats].map((stat, i) => {
              const Icon = stat.icon
              return (
                <div key={i} className="metric-card">
                  <Icon size={28} className="metric-icon" />
                  <span className="metric-number">{stat.number}</span>
                  <span className="metric-label">{stat.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Featured Success Stories */}
      <section className="featured-stories-section">
        <div className="section-full-header">
          <span className="section-badge-lg">
            <Award size={18} />
            Featured
          </span>
          <h2 className="section-title-xl">
            Transformation <span className="gradient-text">Journeys</span>
          </h2>
        </div>

        <div className="featured-stories-list">
          {featuredStories.map((story, index) => (
            <div 
              key={index} 
              className="featured-story-card"
              style={{ '--story-color': story.color } as React.CSSProperties}
            >
              <div className="story-card-glow"></div>
              
              <div className="story-header">
                <div className="story-author-large">
                  <div className="author-avatar-large" style={{ background: `linear-gradient(135deg, ${story.color}, ${story.color}88)` }}>
                    {story.avatar}
                  </div>
                  <div className="author-info-large">
                    <h3>{story.name}</h3>
                    <p className="company">{story.company}</p>
                    <p className="role">{story.role}</p>
                  </div>
                </div>
                <div className="story-meta">
                  <span className="industry-badge">{story.industry}</span>
                  <span className="timeframe">{story.timeframe}</span>
                </div>
              </div>

              <div className="story-quote-large">
                <Quote size={32} className="quote-icon" />
                <blockquote>"{story.quote}"</blockquote>
              </div>

              <div className="story-results">
                <h4>Results Achieved:</h4>
                <div className="results-grid">
                  {story.results.map((result, i) => {
                    const Icon = result.icon
                    return (
                      <div key={i} className="result-item">
                        <Icon size={24} className="result-icon" />
                        <span className="result-metric">{result.metric}</span>
                        <span className="result-label">{result.label}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="story-coaches">
                <span className="coaches-label">Coached by:</span>
                <div className="coaches-list">
                  {story.coaches.map((coach, i) => (
                    <span key={i} className="coach-tag">{coach}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* More Testimonials */}
      <section className="stories-section">
        <div className="section-full-header">
          <span className="section-badge-lg">
            <Users size={18} />
            More Stories
          </span>
          <h2 className="section-title-xl">
            Client <span className="gradient-text">Testimonials</span>
          </h2>
        </div>

        <div className="stories-grid">
          {additionalTestimonials.map((testimonial, i) => (
            <div key={i} className="story-card">
              <Quote size={24} className="story-quote-icon" />
              <div className="story-content">
                <p className="story-quote">"{testimonial.quote}"</p>
                <div className="story-result">
                  <TrendingUp size={16} />
                  <span>{testimonial.result}</span>
                </div>
              </div>
              <div className="story-author">
                <div className="author-avatar">
                  {testimonial.name.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="author-info">
                  <h4>{testimonial.name}</h4>
                  <p>{testimonial.company}</p>
                </div>
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
          <div className="cta-particles">
            {[...Array(30)].map((_, i) => (
              <div 
                key={i} 
                className="cta-particle"
                style={{
                  '--x': `${Math.random() * 100}%`,
                  '--delay': `${Math.random() * 5}s`
                } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
        
        <div className="expanded-cta-content">
          <div className="cta-icon-wrapper">
            <Rocket size={48} />
          </div>
          <h2 className="cta-title-xl">Write Your Success Story</h2>
          <p className="cta-subtitle-lg">
            Join thousands of entrepreneurs who have transformed their businesses. 
            Your story could be next.
          </p>
          <div className="cta-buttons-row">
            <Link to="/signup" className="cta-btn-primary large">
              <span>Start Your Journey</span>
              <ArrowRight size={22} />
              <div className="btn-glow"></div>
            </Link>
            <Link to="/pricing" className="cta-btn-secondary large">
              <span>View Plans</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default SuccessStories

