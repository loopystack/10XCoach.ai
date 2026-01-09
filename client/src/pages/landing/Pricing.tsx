import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Check, ArrowRight, Zap } from 'lucide-react'
import Navbar from '../../components/Navbar'
import MagicalCursor from '../../components/MagicalCursor'
import '../Landing.css'
import './LandingPages.css'

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

const Pricing = () => {
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

  // Map plans to display format
  const displayPlans = plans.map((plan) => ({
    ...plan,
    featured: plan.tier === 'MOMENTUM', // Mark Momentum as featured
    description: plan.tier === 'FOUNDATION' 
      ? 'Perfect for solopreneurs and small businesses'
      : plan.tier === 'MOMENTUM'
      ? 'For growing businesses ready to scale'
      : 'Enterprise-grade coaching for serious growth'
  }))

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
            <Zap size={16} />
            <span>Simple Pricing</span>
          </div>
          <h1 className="page-hero-title">
            Choose Your <span className="hero-title-gradient">Growth Plan</span>
          </h1>
          <p className="page-hero-subtitle">
            Invest in AI-powered coaching that pays for itself. 
            Start with a 14-day free trial, no credit card required.
          </p>
        </div>
      </section>

      {/* Pricing Grid */}
      <section className="features-section">
        <div className="section-container">
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <p>Loading plans...</p>
            </div>
          ) : (
            <div className="pricing-grid">
              {displayPlans.map((plan, index) => (
                <div 
                  key={plan.id} 
                  className={`pricing-card ${plan.featured ? 'featured' : ''}`}
                  style={{ '--index': index } as React.CSSProperties}
                >
                  {plan.featured && <div className="pricing-badge">Most Popular</div>}
                  
                  <div className="pricing-header">
                    <h3 className="pricing-name">{plan.name}</h3>
                    <div className="pricing-price">
                      <span className="price-currency">$</span>
                      <span className="price-amount">{plan.price}</span>
                      <span className="price-period">/mo</span>
                    </div>
                    {plan.yearlyPrice && (
                      <div style={{ fontSize: '0.875rem', color: 'var(--gray-600)', marginTop: '0.25rem' }}>
                        ${plan.yearlyPrice}/year (save {Math.round((1 - (plan.yearlyPrice / 12) / plan.price) * 100)}%)
                      </div>
                    )}
                    <p className="pricing-description">
                      {plan.description}
                    </p>
                  </div>
                  
                  <ul className="pricing-features">
                    {(plan.featuresJson?.features || []).map((feature, i) => (
                      <li key={i}>
                        <Check size={18} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link 
                    to="/app" 
                    className={`pricing-btn ${plan.featured ? 'primary' : 'secondary'}`}
                  >
                    Start Free Trial
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* FAQ Section */}
      <section className="coaches-section">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">FAQ</span>
            <h2 className="section-title">Frequently Asked <span className="gradient-text">Questions</span></h2>
          </div>
          
          <div className="faq-container">
            {[
              { q: 'Can I switch plans anytime?', a: 'Yes! You can upgrade or downgrade your plan at any time. Changes take effect on your next billing cycle.' },
              { q: 'Is there a free trial?', a: 'Absolutely! All plans come with a 14-day free trial. No credit card required to start.' },
              { q: 'What happens after my trial ends?', a: 'You\'ll be prompted to choose a plan. If you don\'t, your account will be paused until you subscribe.' },
              { q: 'Do you offer refunds?', a: 'Yes, we offer a 30-day money-back guarantee on all plans. No questions asked.' },
            ].map((faq, i) => (
              <div 
                key={i} 
                className="faq-card"
                style={{ '--index': i } as React.CSSProperties}
              >
                <h4 className="faq-question">{faq.q}</h4>
                <p className="faq-answer">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-bg">
          <div className="cta-glow"></div>
        </div>
        <div className="cta-content">
          <h2 className="cta-title">Start Your 10X Journey Today</h2>
          <p className="cta-subtitle">
            Join thousands of businesses achieving exponential growth with AI coaching.
          </p>
          <Link to="/app" className="cta-btn">
            Start Free Trial
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Pricing
