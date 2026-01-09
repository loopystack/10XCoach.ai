import { Link } from 'react-router-dom'
import { 
  Rocket, 
  TrendingUp, 
  Target, 
  DollarSign, 
  BarChart3, 
  Users,
  ArrowRight,
  CheckCircle2,
  Star,
  Sparkles,
  Trophy,
  Zap,
  LineChart,
  Building2,
  Crown,
  Diamond
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import MagicalCursor from '../../components/MagicalCursor'
import '../Landing.css'
import './LandingPages.css'
import './ExpandedPages.css'

const BigExitBlueprint = () => {
  const blueprintPhases = [
    {
      phase: '01',
      title: 'Foundation Assessment',
      subtitle: 'Know Where You Stand',
      description: 'Comprehensive analysis of your business valuation, identifying gaps and opportunities for exponential value creation.',
      icon: Target,
      color: '#00d4ff',
      features: ['Business Valuation Analysis', 'Market Position Assessment', 'Revenue Stream Audit', 'Risk Identification']
    },
    {
      phase: '02',
      title: 'Value Acceleration',
      subtitle: 'Build What Buyers Want',
      description: 'Strategic initiatives to multiply your business value through systematic improvements in key value drivers.',
      icon: TrendingUp,
      color: '#7c3aed',
      features: ['Recurring Revenue Models', 'Customer Concentration Fix', 'Process Documentation', 'Team Independence']
    },
    {
      phase: '03',
      title: 'Scale & Optimize',
      subtitle: 'Maximize Multiples',
      description: 'Scale operations while maintaining margins. Build the systems that make your business an attractive acquisition target.',
      icon: BarChart3,
      color: '#22c55e',
      features: ['Margin Optimization', 'Scalable Systems', 'Leadership Development', 'Financial Clean-up']
    },
    {
      phase: '04',
      title: 'Exit Execution',
      subtitle: 'Close the Deal',
      description: 'Navigate the exit process with confidence. From finding buyers to negotiating terms and closing successfully.',
      icon: Rocket,
      color: '#f59e0b',
      features: ['Buyer Identification', 'Deal Structure Strategy', 'Negotiation Support', 'Transaction Management']
    }
  ]

  const exitMultipliers = [
    { metric: '2-3x', label: 'Revenue Multiple', description: 'For service businesses', icon: DollarSign },
    { metric: '5-8x', label: 'EBITDA Multiple', description: 'For optimized operations', icon: LineChart },
    { metric: '10x+', label: 'Strategic Value', description: 'For category leaders', icon: Crown }
  ]

  const successMetrics = [
    { number: '$2.4B+', label: 'Exit Value Generated', icon: Trophy },
    { number: '340+', label: 'Successful Exits', icon: Rocket },
    { number: '47%', label: 'Above Market Value', icon: TrendingUp },
    { number: '18mo', label: 'Average Timeline', icon: Zap }
  ]

  return (
    <div className="landing-page expanded-page">
      <MagicalCursor />
      <Navbar />
      
      {/* Hero Section - Full Width */}
      <section className="expanded-hero exit-hero">
        <div className="expanded-hero-bg">
          <div className="hero-mesh"></div>
          <div className="floating-shapes">
            {[...Array(20)].map((_, i) => (
              <div 
                key={i} 
                className="floating-shape"
                style={{
                  '--x': `${Math.random() * 100}%`,
                  '--y': `${Math.random() * 100}%`,
                  '--size': `${20 + Math.random() * 60}px`,
                  '--duration': `${20 + Math.random() * 20}s`,
                  '--delay': `${Math.random() * -20}s`
                } as React.CSSProperties}
              />
            ))}
          </div>
          <div className="hero-gradient-orbs">
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>
            <div className="orb orb-3"></div>
          </div>
        </div>
        
        <div className="expanded-hero-content">
          <div className="hero-badge-animated">
            <Diamond size={18} />
            <span>The Ultimate Exit Strategy</span>
            <div className="badge-shimmer"></div>
          </div>
          
          <h1 className="expanded-hero-title">
            <span className="title-line">Build a Business</span>
            <span className="title-line gradient-text-animated">Worth Buying</span>
          </h1>
          
          <p className="expanded-hero-subtitle">
            The Big Exit Blueprint is your comprehensive roadmap to building maximum business value 
            and executing a successful exit. Transform your business into an irresistible acquisition target.
          </p>
          
          <div className="hero-cta-group">
            <Link to="/signup" className="cta-btn-primary">
              <span>Start Your Exit Journey</span>
              <ArrowRight size={20} />
              <div className="btn-glow"></div>
            </Link>
            <Link to="/pricing" className="cta-btn-secondary">
              <span>View Plans</span>
            </Link>
          </div>
        </div>
        
        {/* Floating Exit Value Card */}
        <div className="hero-floating-card exit-value-card">
          <div className="card-glow"></div>
          <div className="card-content">
            <div className="card-icon">
              <DollarSign size={32} />
            </div>
            <div className="card-stat">
              <span className="stat-value">$2.4B+</span>
              <span className="stat-label">Exit Value Created</span>
            </div>
          </div>
        </div>
      </section>

      {/* Success Metrics - Full Width Scroll */}
      <section className="metrics-section">
        <div className="metrics-track">
          <div className="metrics-scroll">
            {[...successMetrics, ...successMetrics].map((metric, i) => {
              const Icon = metric.icon
              return (
                <div key={i} className="metric-card">
                  <Icon size={28} className="metric-icon" />
                  <span className="metric-number">{metric.number}</span>
                  <span className="metric-label">{metric.label}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Blueprint Phases - Full Width Timeline */}
      <section className="blueprint-section">
        <div className="section-full-header">
          <span className="section-badge-lg">
            <Sparkles size={18} />
            The Blueprint
          </span>
          <h2 className="section-title-xl">
            Your Path to a <span className="gradient-text">10X Exit</span>
          </h2>
          <p className="section-subtitle-lg">
            A proven four-phase system that has generated over $2.4 billion in exit value
          </p>
        </div>

        <div className="blueprint-timeline">
          <div className="timeline-line"></div>
          
          {blueprintPhases.map((phase, index) => {
            const Icon = phase.icon
            return (
              <div 
                key={index} 
                className="blueprint-phase"
                style={{ '--phase-color': phase.color } as React.CSSProperties}
              >
                <div className="phase-connector">
                  <div className="connector-dot"></div>
                  <div className="connector-pulse"></div>
                </div>
                
                <div className="phase-card">
                  <div className="phase-card-glow"></div>
                  <div className="phase-header">
                    <span className="phase-number">{phase.phase}</span>
                    <div className="phase-icon">
                      <Icon size={28} />
                    </div>
                  </div>
                  
                  <div className="phase-content">
                    <span className="phase-subtitle">{phase.subtitle}</span>
                    <h3 className="phase-title">{phase.title}</h3>
                    <p className="phase-description">{phase.description}</p>
                    
                    <ul className="phase-features">
                      {phase.features.map((feature, i) => (
                        <li key={i}>
                          <CheckCircle2 size={16} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Exit Multipliers - Visual Section */}
      <section className="multipliers-section">
        <div className="multipliers-bg">
          <div className="grid-pattern"></div>
        </div>
        
        <div className="section-full-header">
          <span className="section-badge-lg">
            <TrendingUp size={18} />
            Value Multiples
          </span>
          <h2 className="section-title-xl">
            Unlock <span className="gradient-text">Premium Valuations</span>
          </h2>
        </div>

        <div className="multipliers-grid">
          {exitMultipliers.map((mult, i) => {
            const Icon = mult.icon
            return (
              <div key={i} className="multiplier-card">
                <div className="multiplier-glow"></div>
                <div className="multiplier-icon">
                  <Icon size={32} />
                </div>
                <div className="multiplier-value">{mult.metric}</div>
                <div className="multiplier-label">{mult.label}</div>
                <div className="multiplier-desc">{mult.description}</div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Who It's For */}
      <section className="audience-section">
        <div className="section-full-header">
          <span className="section-badge-lg">
            <Users size={18} />
            Who This Is For
          </span>
          <h2 className="section-title-xl">
            Built for <span className="gradient-text">Ambitious Founders</span>
          </h2>
        </div>

        <div className="audience-grid">
          {[
            {
              icon: Building2,
              title: 'Established Business Owners',
              description: 'Running a profitable business with $1M-$50M revenue looking to maximize exit value',
              fit: ['3+ years in business', '$1M+ annual revenue', 'Ready to scale or exit']
            },
            {
              icon: TrendingUp,
              title: 'Growth-Stage Founders',
              description: 'Scaling rapidly and want to position for a premium acquisition',
              fit: ['High growth trajectory', 'Seeking strategic buyers', 'Want to optimize operations']
            },
            {
              icon: Star,
              title: 'Serial Entrepreneurs',
              description: 'Building to sell and want a systematic approach to maximizing returns',
              fit: ['Previous exit experience', 'Building for acquisition', 'Want faster timelines']
            }
          ].map((audience, i) => {
            const Icon = audience.icon
            return (
              <div key={i} className="audience-card">
                <div className="audience-icon">
                  <Icon size={36} />
                </div>
                <h3>{audience.title}</h3>
                <p>{audience.description}</p>
                <ul className="audience-fit">
                  {audience.fit.map((item, j) => (
                    <li key={j}>
                      <CheckCircle2 size={16} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
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
          <h2 className="cta-title-xl">Ready to Build Your Exit?</h2>
          <p className="cta-subtitle-lg">
            Join hundreds of founders who have used the Big Exit Blueprint 
            to achieve life-changing exits.
          </p>
          <div className="cta-buttons-row">
            <Link to="/signup" className="cta-btn-primary large">
              <span>Start Building Value</span>
              <ArrowRight size={22} />
              <div className="btn-glow"></div>
            </Link>
            <Link to="/contact" className="cta-btn-secondary large">
              <span>Talk to Our Team</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default BigExitBlueprint

