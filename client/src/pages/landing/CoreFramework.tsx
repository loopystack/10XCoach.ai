import { Link } from 'react-router-dom'
import { 
  Target, 
  TrendingUp, 
  BarChart3, 
  Settings,
  DollarSign,
  Users,
  Heart,
  Rocket,
  ArrowRight,
  Sparkles,
  Layers,
  Lightbulb,
  CheckCircle2,
  Compass
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import MagicalCursor from '../../components/MagicalCursor'
import '../Landing.css'
import './LandingPages.css'
import './ExpandedPages.css'

const CoreFramework = () => {
  const pillars = [
    {
      number: '01',
      icon: Target,
      title: 'Business Strategy',
      subtitle: 'Vision & Direction',
      description: 'Define your north star. Craft a compelling vision, set strategic objectives, and build a roadmap that transforms ambition into achievement.',
      color: '#3b82f6',
      coach: 'Alan Wozniak',
      capabilities: ['Strategic Planning', 'Competitive Analysis', 'Goal Setting', 'Decision Frameworks']
    },
    {
      number: '02',
      icon: TrendingUp,
      title: 'Sales Excellence',
      subtitle: 'Revenue Growth',
      description: 'Master the art of conversion. Build a sales engine that consistently fills your pipeline and closes deals with confidence.',
      color: '#22c55e',
      coach: 'Rob Mercer',
      capabilities: ['Pipeline Management', 'Closing Techniques', 'Objection Handling', 'Sales Psychology']
    },
    {
      number: '03',
      icon: BarChart3,
      title: 'Marketing Mastery',
      subtitle: 'Brand & Demand',
      description: 'Attract your ideal customers. Create magnetic messaging and campaigns that build brand authority and generate qualified leads.',
      color: '#ec4899',
      coach: 'Teresa Lane',
      capabilities: ['Brand Strategy', 'Content Marketing', 'Lead Generation', 'Digital Campaigns']
    },
    {
      number: '04',
      icon: Settings,
      title: 'Operations',
      subtitle: 'Systems & Scale',
      description: 'Build a business that runs without you. Implement processes, systems, and automation that deliver consistent results.',
      color: '#f59e0b',
      coach: 'Jeffrey Wells',
      capabilities: ['Process Design', 'Workflow Automation', 'Quality Control', 'Efficiency Metrics']
    },
    {
      number: '05',
      icon: DollarSign,
      title: 'Financial Intelligence',
      subtitle: 'Profit & Cash Flow',
      description: 'Master your numbers. Make data-driven decisions, optimize profitability, and build a financially resilient business.',
      color: '#14b8a6',
      coach: 'Hudson Jaxon',
      capabilities: ['Financial Analysis', 'Cash Flow Management', 'Pricing Strategy', 'Investment Planning']
    },
    {
      number: '06',
      icon: Users,
      title: 'Culture & Team',
      subtitle: 'People & Performance',
      description: 'Build an A-player team. Create a culture of excellence that attracts top talent and drives peak performance.',
      color: '#8b5cf6',
      coach: 'Chelsea Fox',
      capabilities: ['Hiring Systems', 'Team Development', 'Performance Management', 'Culture Building']
    },
    {
      number: '07',
      icon: Heart,
      title: 'Customer Centricity',
      subtitle: 'Experience & Loyalty',
      description: 'Turn customers into raving fans. Design experiences that delight, retain, and generate powerful referrals.',
      color: '#ef4444',
      coach: 'Camille Quinn',
      capabilities: ['Customer Journey', 'Service Excellence', 'Retention Strategy', 'Loyalty Programs']
    },
    {
      number: '08',
      icon: Rocket,
      title: 'Exit Strategies',
      subtitle: 'Value & Legacy',
      description: 'Build to sell. Position your business for maximum valuation and execute an exit that rewards your years of hard work.',
      color: '#06b6d4',
      coach: 'Tanner Chase',
      capabilities: ['Valuation Optimization', 'Deal Structure', 'Buyer Relations', 'Transition Planning']
    }
  ]

  const benefits = [
    { title: 'Holistic Approach', description: 'Address every critical area of your business simultaneously' },
    { title: 'Expert Coaches', description: 'Specialized AI coaches for each pillar of success' },
    { title: 'Proven System', description: 'Battle-tested framework used by 1000+ businesses' },
    { title: 'Measurable Results', description: 'Track progress with clear KPIs and milestones' }
  ]

  return (
    <div className="landing-page expanded-page">
      <MagicalCursor />
      <Navbar />
      
      {/* Hero Section */}
      <section className="expanded-hero framework-hero">
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
                  '--size': `${30 + Math.random() * 50}px`,
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
            <Compass size={18} />
            <span>The 10X Framework</span>
            <div className="badge-shimmer"></div>
          </div>
          
          <h1 className="expanded-hero-title">
            <span className="title-line">8 Pillars of</span>
            <span className="title-line gradient-text-animated">Business Excellence</span>
          </h1>
          
          <p className="expanded-hero-subtitle">
            A comprehensive coaching framework that addresses every critical area of your business.
            Master all eight pillars to achieve exponential growth and build a truly valuable company.
          </p>
          
          <div className="hero-cta-group">
            <Link to="/signup" className="cta-btn-primary">
              <span>Start Your Journey</span>
              <ArrowRight size={20} />
              <div className="btn-glow"></div>
            </Link>
            <Link to="/ai-coaches" className="cta-btn-secondary">
              <span>Meet the Coaches</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Framework Visual */}
      <section className="framework-visual-section">
        <div className="framework-center">
          <div className="center-logo">
            <Sparkles size={48} />
            <span className="center-text">10X</span>
          </div>
          <div className="center-ring ring-1"></div>
          <div className="center-ring ring-2"></div>
          <div className="center-ring ring-3"></div>
        </div>
        
        <div className="pillars-orbit">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon
            const angle = (index * 45) - 90 // Start from top
            const radius = 280 // pixels from center
            return (
              <div 
                key={index}
                className="pillar-orbit-item"
                style={{
                  '--angle': `${angle}deg`,
                  '--radius': `${radius}px`,
                  '--color': pillar.color
                } as React.CSSProperties}
              >
                <div className="orbit-icon">
                  <Icon size={24} />
                </div>
                <span className="orbit-label">{pillar.title}</span>
              </div>
            )
          })}
        </div>
      </section>

      {/* Pillars Grid - Full Width */}
      <section className="pillars-section">
        <div className="section-full-header">
          <span className="section-badge-lg">
            <Layers size={18} />
            The 8 Pillars
          </span>
          <h2 className="section-title-xl">
            Master Every <span className="gradient-text">Dimension</span>
          </h2>
          <p className="section-subtitle-lg">
            Each pillar represents a critical area of business excellence. 
            Together, they form a complete system for sustainable growth.
          </p>
        </div>

        <div className="pillars-grid">
          {pillars.map((pillar, index) => {
            const Icon = pillar.icon
            return (
              <div 
                key={index} 
                className="pillar-card"
                style={{ '--pillar-color': pillar.color } as React.CSSProperties}
              >
                <div className="pillar-card-glow"></div>
                
                <div className="pillar-header">
                  <span className="pillar-number">{pillar.number}</span>
                  <div className="pillar-icon">
                    <Icon size={28} />
                  </div>
                </div>
                
                <div className="pillar-content">
                  <span className="pillar-subtitle">{pillar.subtitle}</span>
                  <h3 className="pillar-title">{pillar.title}</h3>
                  <p className="pillar-description">{pillar.description}</p>
                  
                  <div className="pillar-coach">
                    <span className="coach-label">Your Coach:</span>
                    <span className="coach-name">{pillar.coach}</span>
                  </div>
                  
                  <div className="pillar-capabilities">
                    {pillar.capabilities.map((cap, i) => (
                      <span key={i} className="capability-tag">{cap}</span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="benefits-bg">
          <div className="benefits-gradient"></div>
        </div>
        
        <div className="section-full-header">
          <span className="section-badge-lg">
            <Lightbulb size={18} />
            Why It Works
          </span>
          <h2 className="section-title-xl">
            A <span className="gradient-text">Complete System</span>
          </h2>
        </div>

        <div className="benefits-grid">
          {benefits.map((benefit, i) => (
            <div key={i} className="benefit-card">
              <CheckCircle2 size={32} className="benefit-icon" />
              <h3>{benefit.title}</h3>
              <p>{benefit.description}</p>
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
            {[...Array(25)].map((_, i) => (
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
            <Sparkles size={48} />
          </div>
          <h2 className="cta-title-xl">Ready to 10X Your Business?</h2>
          <p className="cta-subtitle-lg">
            Start your journey with AI-powered coaching across all 8 pillars.
          </p>
          <div className="cta-buttons-row">
            <Link to="/signup" className="cta-btn-primary large">
              <span>Get Started Free</span>
              <ArrowRight size={22} />
              <div className="btn-glow"></div>
            </Link>
            <Link to="/pricing" className="cta-btn-secondary large">
              <span>View Pricing</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default CoreFramework

