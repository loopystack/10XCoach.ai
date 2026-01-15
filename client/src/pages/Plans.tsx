import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check, CreditCard, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { api, isAuthenticated } from '../utils/api'
import './PageStyles.css'
import './Dashboard.css'

interface BillingStatus {
  trialStartDate: string | null
  trialEndDate: string | null
  trialDaysRemaining: number | null
  accessStatus: string
  hasAccess: boolean
  currentPlanName: string | null
  planStartDate: string | null
  planEndDate: string | null
  creditBalance: number
  stripeCustomerId: string | null
}

interface Plan {
  id: number
  name: string
  tier: string
  price: number
  yearlyPrice: number | null
  featuresJson: any
  maxMinutes: number | null
  active: boolean
}

const Plans = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [billingStatus, setBillingStatus] = useState<BillingStatus | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [depositAmount, setDepositAmount] = useState<number>(50)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [activatingPlan, setActivatingPlan] = useState<number | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/plans' } })
      return
    }

    fetchBillingStatus()
    fetchPlans()
    
    // Check for payment success/cancel in URL
    const params = new URLSearchParams(location.search)
    if (params.get('payment') === 'success') {
      alert('Payment successful! Your credit has been added.')
      fetchBillingStatus() // Refresh status
    } else if (params.get('payment') === 'cancelled') {
      alert('Payment was cancelled.')
    }
  }, [location.search])

  const fetchBillingStatus = async () => {
    try {
      const status = await api.get('/api/billing/status')
      setBillingStatus(status)
    } catch (error: any) {
      console.error('Failed to fetch billing status:', error)
      // Set default values if error occurs
      setBillingStatus({
        trialStartDate: null,
        trialEndDate: null,
        trialDaysRemaining: null,
        accessStatus: 'TRIAL_ACTIVE',
        hasAccess: true,
        currentPlanName: null,
        planStartDate: null,
        planEndDate: null,
        creditBalance: 0,
        stripeCustomerId: null
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPlans = async () => {
    try {
      const plansData = await api.get('/api/billing/plans')
      setPlans(plansData)
    } catch (error: any) {
      console.error('Failed to fetch plans:', error)
    }
  }

  const handleCreateCheckout = async () => {
    try {
      setCheckoutLoading(true)
      const response = await api.post('/api/billing/create-checkout', {
        amount: depositAmount
      })
      
      // Redirect to Stripe checkout
      if (response.url) {
        window.location.href = response.url
      }
    } catch (error: any) {
      console.error('Failed to create checkout:', error)
      alert(error.message || 'Failed to start checkout. Please try again.')
      setCheckoutLoading(false)
    }
  }

  const handleActivatePlan = async (plan: Plan) => {
    try {
      setActivatingPlan(plan.id)
      
      // For now, use plan price. You can adjust this logic
      const planPrice = plan.price
      
      if (billingStatus && billingStatus.creditBalance < planPrice) {
        alert(`Insufficient credit. You need $${planPrice} but only have $${billingStatus.creditBalance}. Please add more credit.`)
        setActivatingPlan(null)
        return
      }

      const response = await api.post('/api/billing/activate-plan', {
        planName: plan.name,
        planPrice: planPrice,
        planDurationDays: 30 // Default 30 days, adjust as needed
      })

      alert(response.message || 'Plan activated successfully!')
      fetchBillingStatus() // Refresh status
    } catch (error: any) {
      console.error('Failed to activate plan:', error)
      alert(error.message || 'Failed to activate plan. Please try again.')
    } finally {
      setActivatingPlan(null)
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="content-card">
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <div className="loading"></div>
            <p style={{ marginTop: '16px', color: 'var(--gray-600)' }}>Loading plans...</p>
          </div>
        </div>
      </div>
    )
  }

  const fromAction = location.state?.from

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>My Plans</h1>
          <p className="page-subtitle">Upgrade to unlock all features</p>
        </div>
      </div>

      <div className="content-card" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Trial Status Banner */}
        {billingStatus && (
          <div 
            className="content-card" 
            style={{ 
              marginBottom: '24px',
              padding: '20px',
              background: billingStatus.hasAccess 
                ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
              border: billingStatus.hasAccess 
                ? '1px solid rgba(59, 130, 246, 0.3)'
                : '1px solid rgba(239, 68, 68, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {billingStatus.hasAccess ? (
                <>
                  <Clock style={{ color: '#3b82f6', flexShrink: 0 }} size={20} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>
                      {billingStatus.trialDaysRemaining !== null
                        ? `${billingStatus.trialDaysRemaining} days remaining in your free trial`
                        : billingStatus.currentPlanName
                        ? `Active Plan: ${billingStatus.currentPlanName}`
                        : 'Active Access'}
                    </p>
                    {billingStatus.trialDaysRemaining !== null && (
                      <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                        Trial ends: {new Date(billingStatus.trialEndDate!).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle style={{ color: '#ef4444', flexShrink: 0 }} size={20} />
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--gray-900)', marginBottom: '4px' }}>Your free trial has ended</p>
                    <p style={{ fontSize: '14px', color: 'var(--gray-600)' }}>
                      {fromAction && `You were trying to ${fromAction}. `}
                      Upgrade now to continue using all features.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Credit Balance */}
        {billingStatus && (
          <div 
            className="content-card" 
            style={{ 
              marginBottom: '24px',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
              <div>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginBottom: '8px' }}>Account Credit</p>
                <p style={{ fontSize: '32px', fontWeight: 800, color: 'var(--gray-900)' }}>
                  ${billingStatus.creditBalance.toFixed(2)}
                </p>
              </div>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 10)}
                  style={{ 
                    width: '100px',
                    padding: '10px 12px',
                    border: '1px solid rgba(229, 231, 235, 0.8)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                />
                <button
                  onClick={handleCreateCheckout}
                  disabled={checkoutLoading || depositAmount < 10}
                  className="primary-button"
                  style={{ 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: (checkoutLoading || depositAmount < 10) ? 0.5 : 1,
                    cursor: (checkoutLoading || depositAmount < 10) ? 'not-allowed' : 'pointer'
                  }}
                >
                  {checkoutLoading ? (
                    <>
                      <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      Add Credit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px'
        }}>
          {plans.map((plan) => {
            const features = plan.featuresJson && typeof plan.featuresJson === 'object' 
              ? plan.featuresJson 
              : Array.isArray(plan.featuresJson) 
                ? plan.featuresJson 
                : []
            
            const isActive = billingStatus?.currentPlanName === plan.name
            const canActivate = billingStatus && billingStatus.creditBalance >= plan.price

            return (
              <div
                key={plan.id}
                className="content-card"
                style={{
                  border: isActive
                    ? '2px solid #22c55e'
                    : canActivate
                    ? '2px solid #3b82f6'
                    : '2px solid rgba(229, 231, 235, 0.8)',
                  background: isActive
                    ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(22, 163, 74, 0.05) 100%)'
                    : 'transparent',
                  padding: '24px'
                }}
              >
                <div style={{ marginBottom: '20px' }}>
                  <h3 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '8px', color: 'var(--gray-900)' }}>{plan.name}</h3>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontSize: '36px', fontWeight: 800, color: 'var(--gray-900)' }}>${plan.price}</span>
                    <span style={{ fontSize: '16px', color: 'var(--gray-600)' }}>/month</span>
                  </div>
                  {plan.yearlyPrice && (
                    <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginTop: '8px' }}>
                      ${plan.yearlyPrice}/year (save {((plan.price * 12 - plan.yearlyPrice) / (plan.price * 12) * 100).toFixed(0)}%)
                    </p>
                  )}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0' }}>
                  {Array.isArray(features) ? (
                    features.map((feature: string, idx: number) => (
                      <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px', fontSize: '14px' }}>
                        <Check style={{ color: '#22c55e', flexShrink: 0, marginTop: '2px' }} size={16} />
                        <span style={{ color: 'var(--gray-700)' }}>{feature}</span>
                      </li>
                    ))
                  ) : (
                    Object.entries(features).map(([key, value]: [string, any]) => (
                      <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '12px', fontSize: '14px' }}>
                        <Check style={{ color: '#22c55e', flexShrink: 0, marginTop: '2px' }} size={16} />
                        <span style={{ color: 'var(--gray-700)' }}>
                          <strong>{key}:</strong> {String(value)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>

                {isActive ? (
                  <button
                    disabled
                    className="primary-button"
                    style={{ 
                      width: '100%',
                      background: '#22c55e',
                      color: '#ffffff',
                      cursor: 'not-allowed',
                      opacity: 0.7,
                      textAlign: 'center',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    Active Plan
                  </button>
                ) : canActivate ? (
                  <button
                    onClick={() => handleActivatePlan(plan)}
                    disabled={activatingPlan === plan.id}
                    className="primary-button"
                    style={{ 
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: activatingPlan === plan.id ? 0.5 : 1,
                      cursor: activatingPlan === plan.id ? 'not-allowed' : 'pointer',
                      color: '#ffffff',
                      textAlign: 'center'
                    }}
                  >
                    {activatingPlan === plan.id ? (
                      <>
                        <div className="loading" style={{ width: '16px', height: '16px', borderWidth: '2px' }}></div>
                        Activating...
                      </>
                    ) : (
                      <>
                        Activate Plan
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                ) : (
                  <div>
                    <p style={{ 
                      fontSize: '14px', 
                      color: 'var(--gray-600)', 
                      marginBottom: '12px',
                      textAlign: 'center',
                      fontWeight: 600
                    }}>
                      Need ${(plan.price - (billingStatus?.creditBalance || 0)).toFixed(2)} more credit
                    </p>
                  </div>
                )}
                
                {/* Add Credit First button at bottom of all cards (when not active) */}
                {!isActive && (
                  <div style={{ marginTop: '16px' }}>
                    <button
                      onClick={handleCreateCheckout}
                      className="primary-button"
                      style={{ 
                        width: '100%',
                        background: '#475569',
                        color: '#ffffff',
                        border: 'none',
                        textAlign: 'center',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      Add Credit First
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* FAQ Section */}
        <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '1px solid rgba(229, 231, 235, 0.8)' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '20px', color: 'var(--gray-900)' }}>Frequently Asked Questions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--gray-900)' }}>How does the credit system work?</h3>
              <p style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: 1.6 }}>
                When you make a payment, the amount is added to your account credit. You can then use this credit to activate any plan. Plans are activated for 30 days.
              </p>
            </div>
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--gray-900)' }}>What happens when my trial ends?</h3>
              <p style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: 1.6 }}>
                When your 14-day free trial ends, you'll need to upgrade to a paid plan to continue using features like talking to coaches, taking quizzes, creating huddles, notes, and todos.
              </p>
            </div>
            <div>
              <h3 style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--gray-900)' }}>Can I cancel my plan?</h3>
              <p style={{ fontSize: '14px', color: 'var(--gray-600)', lineHeight: 1.6 }}>
                Yes, you can cancel at any time. Your plan will remain active until the end of the current billing period.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Plans
