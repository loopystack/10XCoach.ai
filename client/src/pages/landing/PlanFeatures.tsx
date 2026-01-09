import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  Check, 
  X, 
  ArrowRight, 
  Sparkles,
  Zap,
  Crown,
  Star,
  Shield,
  Users,
  BarChart3,
  Headphones,
  Clock,
  Brain,
  Target,
  Rocket
} from 'lucide-react'
import Navbar from '../../components/Navbar'
import MagicalCursor from '../../components/MagicalCursor'
import '../Landing.css'
import './LandingPages.css'
import './ExpandedPages.css'

interface Plan {
  id: number
  name: string
  tier: string
  price: number
  yearlyPrice: number | null
  featuresJson: {
    features: string[]
  }
  maxMinutes: number | null
  active: boolean
}

const PlanFeatures = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        setPlans(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(error => {
        console.error('Failed to load plans:', error)
        setLoading(false)
      })
  }, [])

  // Map plans to display format with icons
  const displayPlans = plans.map((plan) => {
    const iconMap: Record<string, any> = {
      'FOUNDATION': Star,
      'MOMENTUM': Zap,
      'ELITE': Crown
    }
    const colorMap: Record<string, string> = {
      'FOUNDATION': '#3b82f6',
      'MOMENTUM': '#8b5cf6',
      'ELITE': '#f59e0b'
    }
    const descriptionMap: Record<string, string> = {
      'FOUNDATION': 'Perfect for solopreneurs and small businesses',
      'MOMENTUM': 'For growing businesses ready to scale',
      'ELITE': 'Enterprise-grade coaching for serious growth'
    }

    return {
      ...plan,
      icon: iconMap[plan.tier] || Star,
      color: colorMap[plan.tier] || '#3b82f6',
      description: descriptionMap[plan.tier] || '',
      recommended: plan.tier === 'MOMENTUM'
    }
  })

  const featureCategories = [
    {
      name: 'AI Coaches',
      icon: Brain,
      features: [
        { name: 'Number of AI Coaches', foundation: '3 Coaches', momentum: 'All 8 Coaches', elite: 'All 8 + Custom' },
        { name: 'Coaching Sessions', foundation: '10/month', momentum: 'Unlimited', elite: 'Unlimited' },
        { name: 'Session Duration', foundation: '30 min max', momentum: 'No limit', elite: 'No limit' },
        { name: 'Voice Conversations', foundation: false, momentum: true, elite: true },
        { name: 'Custom AI Training', foundation: false, momentum: false, elite: true }
      ]
    },
    {
      name: 'Business Tools',
      icon: Target,
      features: [
        { name: 'Business Health Assessment', foundation: true, momentum: true, elite: true },
        { name: 'Action Step Tracking', foundation: true, momentum: true, elite: true },
        { name: 'Huddle Meeting Framework', foundation: false, momentum: true, elite: true },
        { name: 'Custom Action Templates', foundation: false, momentum: true, elite: true },
        { name: 'Strategic Planning Tools', foundation: false, momentum: true, elite: true },
        { name: 'Exit Planning Module', foundation: false, momentum: false, elite: true }
      ]
    },
    {
      name: 'Analytics & Insights',
      icon: BarChart3,
      features: [
        { name: 'Basic Progress Tracking', foundation: true, momentum: true, elite: true },
        { name: 'Advanced Analytics', foundation: false, momentum: true, elite: true },
        { name: 'Team Performance Metrics', foundation: false, momentum: false, elite: true },
        { name: 'ROI Dashboard', foundation: false, momentum: false, elite: true },
        { name: 'Custom Reports', foundation: false, momentum: false, elite: true }
      ]
    },
    {
      name: 'Team & Collaboration',
      icon: Users,
      features: [
        { name: 'Team Seats', foundation: '1 User', momentum: '3 Users', elite: 'Unlimited' },
        { name: 'Role-Based Access', foundation: false, momentum: true, elite: true },
        { name: 'Team Collaboration', foundation: false, momentum: true, elite: true },
        { name: 'Admin Dashboard', foundation: false, momentum: false, elite: true },
        { name: 'White-Label Options', foundation: false, momentum: false, elite: true }
      ]
    },
    {
      name: 'Support & Success',
      icon: Headphones,
      features: [
        { name: 'Email Support', foundation: true, momentum: true, elite: true },
        { name: 'Priority Support', foundation: false, momentum: true, elite: true },
        { name: 'Live Chat Support', foundation: false, momentum: true, elite: true },
        { name: 'Dedicated Success Manager', foundation: false, momentum: false, elite: true },
        { name: 'Quarterly Business Review', foundation: false, momentum: false, elite: true }
      ]
    },
    {
      name: 'Integrations',
      icon: Shield,
      features: [
        { name: 'Mobile App Access', foundation: true, momentum: true, elite: true },
        { name: 'Calendar Integration', foundation: false, momentum: true, elite: true },
        { name: 'CRM Integration', foundation: false, momentum: false, elite: true },
        { name: 'API Access', foundation: false, momentum: false, elite: true },
        { name: 'SSO/SAML', foundation: false, momentum: false, elite: true }
      ]
    }
  ]

  const renderFeatureValue = (value: boolean | string) => {
    if (typeof value === 'boolean') {
      return value ? (
        <Check size={16} className="check-icon" />
      ) : (
        <X size={16} className="x-icon" />
      )
    }
    return <span className="feature-value">{value}</span>
  }

  return (
    <div className="landing-page expanded-page">
      <MagicalCursor />
      <Navbar />
      
      {/* Hero Section */}
      <section className="expanded-hero">
        <div className="expanded-hero-bg">
          <div className="hero-mesh"></div>
          <div className="hero-gradient-orbs">
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>
          </div>
        </div>
        
        <div className="expanded-hero-content">
          <div className="hero-badge-animated">
            <Sparkles size={18} />
            <span>Complete Feature Comparison</span>
            <div className="badge-shimmer"></div>
          </div>
          
          <h1 className="expanded-hero-title">
            <span className="title-line">Every Feature</span>
            <span className="title-line gradient-text-animated">Every Plan</span>
          </h1>
          
          <p className="expanded-hero-subtitle">
            Compare all features across our plans. Find the perfect fit for your business needs 
            and start your journey to 10X growth.
          </p>
        </div>
      </section>

      {/* Plans Quick View */}
      <section className="plans-quick-section">
        <div className="plans-quick-grid">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', gridColumn: '1 / -1' }}>
              <p>Loading plans...</p>
            </div>
          ) : (
            displayPlans.map((plan) => {
              const Icon = plan.icon
              return (
                <div 
                  key={plan.id} 
                  className={`plan-quick-card ${plan.recommended ? 'recommended' : ''}`}
                  style={{ '--plan-color': plan.color } as React.CSSProperties}
                >
                  {plan.recommended && <div className="recommended-badge">Most Popular</div>}
                  <div className="plan-quick-icon">
                    <Icon size={28} />
                  </div>
                  <h3 className="plan-quick-name">{plan.name}</h3>
                  <div className="plan-quick-price">
                    <span className="currency">$</span>
                    <span className="amount">{plan.price}</span>
                    <span className="period">/mo</span>
                  </div>
                  {plan.yearlyPrice && (
                    <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                      ${plan.yearlyPrice}/year
                    </div>
                  )}
                  <p className="plan-quick-desc">{plan.description}</p>
                  <Link 
                    to="/signup" 
                    className={`plan-quick-btn ${plan.recommended ? 'primary' : 'secondary'}`}
                  >
                    Get Started
                  </Link>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Features Comparison */}
      <section className="features-comparison-section">
        <div className="section-full-header">
          <span className="section-badge-lg">
            <BarChart3 size={18} />
            Full Comparison
          </span>
          <h2 className="section-title-xl">
            Detailed <span className="gradient-text">Feature List</span>
          </h2>
        </div>

        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th className="feature-header">Features</th>
                <th>Foundation</th>
                <th className="featured">
                  <div className="most-popular-badge-table">Most Popular</div>
                  Momentum
                </th>
                <th>Elite</th>
              </tr>
            </thead>
            <tbody>
              {featureCategories.map((category, catIndex) => {
                const CategoryIcon = category.icon
                return (
                  <>
                    <tr key={`cat-${catIndex}`} className="category-row">
                      <td colSpan={4} className="category-cell">
                        <CategoryIcon size={16} />
                        <span>{category.name}</span>
                      </td>
                    </tr>
                    {category.features.map((feature, featIndex) => (
                      <tr key={`feat-${catIndex}-${featIndex}`}>
                        <td className="feature-name">{feature.name}</td>
                        <td>{renderFeatureValue(feature.foundation)}</td>
                        <td className="featured">{renderFeatureValue(feature.momentum)}</td>
                        <td>{renderFeatureValue(feature.elite)}</td>
                      </tr>
                    ))}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="faq-full-section">
        <div className="section-full-header">
          <span className="section-badge-lg">
            <Clock size={18} />
            Questions?
          </span>
          <h2 className="section-title-xl">
            Frequently <span className="gradient-text">Asked</span>
          </h2>
        </div>

        <div className="faq-grid">
          {[
            { q: 'Can I switch plans anytime?', a: 'Yes! You can upgrade or downgrade at any time. Changes take effect on your next billing cycle.' },
            { q: 'Is there a free trial?', a: 'All plans come with a 14-day free trial. No credit card required to start.' },
            { q: 'What if I need more team seats?', a: 'Elite plan includes unlimited seats. For Momentum, you can add extra seats at $49/user/month.' },
            { q: 'Can I get a custom plan?', a: 'Yes! Contact us for enterprise pricing and custom requirements.' },
            { q: 'Do you offer annual billing?', a: 'Yes! Save 20% with annual billing on any plan.' },
            { q: 'What\'s your refund policy?', a: '30-day money-back guarantee on all plans. No questions asked.' }
          ].map((faq, i) => (
            <div key={i} className="faq-item">
              <h4>{faq.q}</h4>
              <p>{faq.a}</p>
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
            <Rocket size={48} />
          </div>
          <h2 className="cta-title-xl">Ready to Get Started?</h2>
          <p className="cta-subtitle-lg">
            Start your free 14-day trial today. No credit card required.
          </p>
          <div className="cta-buttons-row">
            <Link to="/signup" className="cta-btn-primary large">
              <span>Start Free Trial</span>
              <ArrowRight size={22} />
              <div className="btn-glow"></div>
            </Link>
            <Link to="/contact" className="cta-btn-secondary large">
              <span>Contact Sales</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

export default PlanFeatures

