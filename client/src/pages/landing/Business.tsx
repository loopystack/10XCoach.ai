import { Link } from 'react-router-dom'
import { 
  Building2, 
  Users, 
  Lock, 
  BarChart3, 
  Headphones, 
  Zap, 
  ArrowRight,
  Globe,
  Shield
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import MagicalCursor from '../../components/MagicalCursor'
import '../Landing.css'
import './LandingPages.css'

const Business = () => {
  const enterpriseFeatures = [
    {
      icon: Users,
      title: 'Unlimited Team Access',
      description: 'Scale coaching across your entire organization with unlimited seats and role-based permissions.'
    },
    {
      icon: Lock,
      title: 'Enterprise Security',
      description: 'SOC 2 Type II compliant with SSO, encryption at rest, and custom data retention policies.'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Deep insights into team performance, coaching utilization, and ROI measurement.'
    },
    {
      icon: Headphones,
      title: 'Dedicated Support',
      description: '24/7 priority support with a dedicated customer success manager for your account.'
    },
    {
      icon: Zap,
      title: 'Custom AI Training',
      description: 'Train AI coaches on your specific industry, processes, and company knowledge base.'
    },
    {
      icon: Globe,
      title: 'API & Integrations',
      description: 'Connect 10XCoach.ai with your existing tools through our robust API and pre-built integrations.'
    }
  ]

  const logos = [
    'TechCorp', 'GrowthLabs', 'ScaleUp', 'Innovate Inc', 'FutureTech', 'Enterprise Co'
  ]

  return (
    <div className="landing-page">
      <MagicalCursor />
      <Navbar />
      
      {/* Hero Section */}
      <section className="page-hero">
        <div className="hero-bg">
          <div className="hero-gradient"></div>
          <div className="hero-grid"></div>
          <div className="hero-glow glow-1"></div>
          <div className="hero-glow glow-2"></div>
        </div>
        
        <div className="page-hero-content">
          <div className="hero-badge">
            <Building2 size={16} />
            <span>Enterprise Solutions</span>
          </div>
          <h1 className="page-hero-title">
            AI Coaching for <span className="hero-title-gradient">Enterprise</span>
          </h1>
          <p className="page-hero-subtitle">
            Scale world-class business coaching across your entire organization. 
            Enterprise-grade security, unlimited seats, and dedicated support.
          </p>
          
          <div className="business-hero-stats">
            <div className="business-stat" style={{ '--index': 0 } as React.CSSProperties}>
              <span className="business-stat-number">500+</span>
              <span className="business-stat-label">Enterprise Clients</span>
            </div>
            <div className="business-stat" style={{ '--index': 1 } as React.CSSProperties}>
              <span className="business-stat-number">50K+</span>
              <span className="business-stat-label">Users Coached</span>
            </div>
            <div className="business-stat" style={{ '--index': 2 } as React.CSSProperties}>
              <span className="business-stat-number">99.9%</span>
              <span className="business-stat-label">Uptime SLA</span>
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By Section */}
      <section className="trusted-by-section">
        <div className="section-container" style={{ paddingTop: '0', paddingBottom: '0' }}>
          <p className="trusted-by-label">
            Trusted by Industry Leaders
          </p>
          <div className="trusted-by-logos">
            {logos.map((logo, i) => (
              <span key={i} className="trusted-logo">
                {logo}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise Features */}
      <section className="features-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Enterprise Features</span>
            <h2 className="section-title">Built for <span className="gradient-text">Scale</span></h2>
            <p className="section-subtitle">
              Everything you need to deploy AI coaching across your organization
            </p>
          </div>
          
          <div className="enterprise-features-grid">
            {enterpriseFeatures.map((feature, index) => {
              const Icon = feature.icon
              return (
                <div 
                  key={index} 
                  className="enterprise-feature-card"
                  style={{ '--index': index } as React.CSSProperties}
                >
                  <div className="enterprise-feature-icon">
                    <Icon size={28} />
                  </div>
                  <div className="enterprise-feature-content">
                    <h3>{feature.title}</h3>
                    <p>{feature.description}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="coaches-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Security & Compliance</span>
            <h2 className="section-title">Enterprise-Grade <span className="gradient-text">Security</span></h2>
          </div>
          
          <div className="security-grid">
            {[
              { icon: Shield, title: 'SOC 2 Type II', desc: 'Certified compliance' },
              { icon: Lock, title: 'Encryption', desc: '256-bit AES at rest & transit' },
              { icon: Users, title: 'SSO/SAML', desc: 'Enterprise authentication' },
              { icon: Globe, title: 'GDPR', desc: 'Full compliance' }
            ].map((item, i) => {
              const Icon = item.icon
              return (
                <div 
                  key={i} 
                  className="security-card"
                  style={{ '--index': i } as React.CSSProperties}
                >
                  <div className="security-icon">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h4 className="security-title">{item.title}</h4>
                    <p className="security-desc">{item.desc}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-bg">
          <div className="cta-glow"></div>
        </div>
        <div className="cta-content">
          <h2 className="cta-title">Ready for Enterprise AI Coaching?</h2>
          <p className="cta-subtitle">
            Schedule a demo to see how 10XCoach.ai can transform your organization.
          </p>
          <div className="cta-buttons">
            <Link to="/contact" className="cta-btn">
              Schedule Demo
              <ArrowRight size={20} />
            </Link>
            <Link to="/pricing" className="hero-btn-secondary">
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Business
