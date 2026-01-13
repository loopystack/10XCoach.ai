import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check, CreditCard, Clock, AlertCircle, ArrowRight } from 'lucide-react'
import { api, isAuthenticated } from '../utils/api'
import './PageStyles.css'

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
          <div className="text-center p-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4"></div>
            <p className="text-gray-600">Loading plans...</p>
          </div>
        </div>
      </div>
    )
  }

  const fromAction = location.state?.from

  return (
    <div className="page-container">
      <div className="content-card" style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Choose Your Plan</h1>
          <p className="text-gray-600">Upgrade to unlock all features</p>
        </div>

        {/* Trial Status Banner */}
        {billingStatus && (
          <div className={`mb-6 p-4 rounded-lg ${billingStatus.hasAccess ? 'bg-blue-50 border border-blue-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center gap-3">
              {billingStatus.hasAccess ? (
                <>
                  <Clock className="text-blue-600" size={20} />
                  <div>
                    <p className="font-semibold text-blue-900">
                      {billingStatus.trialDaysRemaining !== null
                        ? `${billingStatus.trialDaysRemaining} days remaining in your free trial`
                        : billingStatus.currentPlanName
                        ? `Active Plan: ${billingStatus.currentPlanName}`
                        : 'Active Access'}
                    </p>
                    {billingStatus.trialDaysRemaining !== null && (
                      <p className="text-sm text-blue-700">
                        Trial ends: {new Date(billingStatus.trialEndDate!).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="text-red-600" size={20} />
                  <div>
                    <p className="font-semibold text-red-900">Your free trial has ended</p>
                    <p className="text-sm text-red-700">
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
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Account Credit</p>
                <p className="text-2xl font-bold text-purple-900">
                  ${billingStatus.creditBalance.toFixed(2)}
                </p>
              </div>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="10"
                  step="10"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 10)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  style={{ width: '100px' }}
                />
                <button
                  onClick={handleCreateCheckout}
                  disabled={checkoutLoading || depositAmount < 10}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold text-sm hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {checkoutLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
                className={`border-2 rounded-xl p-6 ${
                  isActive
                    ? 'border-green-500 bg-green-50'
                    : canActivate
                    ? 'border-blue-500 bg-white hover:shadow-lg transition-shadow'
                    : 'border-gray-300 bg-gray-50'
                }`}
              >
                <div className="mb-4">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  {plan.yearlyPrice && (
                    <p className="text-sm text-gray-600 mt-1">
                      ${plan.yearlyPrice}/year (save ${((plan.price * 12 - plan.yearlyPrice) / (plan.price * 12) * 100).toFixed(0)}%)
                    </p>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {Array.isArray(features) ? (
                    features.map((feature: string, idx: number) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                        <span>{feature}</span>
                      </li>
                    ))
                  ) : (
                    Object.entries(features).map(([key, value]: [string, any]) => (
                      <li key={key} className="flex items-start gap-2 text-sm">
                        <Check className="text-green-600 flex-shrink-0 mt-0.5" size={16} />
                        <span>
                          <strong>{key}:</strong> {String(value)}
                        </span>
                      </li>
                    ))
                  )}
                </ul>

                {isActive ? (
                  <button
                    disabled
                    className="w-full py-3 bg-green-500 text-white rounded-lg font-semibold cursor-not-allowed"
                  >
                    Active Plan
                  </button>
                ) : canActivate ? (
                  <button
                    onClick={() => handleActivatePlan(plan)}
                    disabled={activatingPlan === plan.id}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {activatingPlan === plan.id ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
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
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-2">
                      Need ${(plan.price - (billingStatus?.creditBalance || 0)).toFixed(2)} more credit
                    </p>
                    <button
                      onClick={handleCreateCheckout}
                      className="w-full py-3 bg-gray-600 text-white rounded-lg font-semibold hover:bg-gray-700"
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
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-1">How does the credit system work?</h3>
              <p className="text-sm text-gray-600">
                When you make a payment, the amount is added to your account credit. You can then use this credit to activate any plan. Plans are activated for 30 days.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">What happens when my trial ends?</h3>
              <p className="text-sm text-gray-600">
                When your 14-day free trial ends, you'll need to upgrade to a paid plan to continue using features like talking to coaches, taking quizzes, creating huddles, notes, and todos.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-1">Can I cancel my plan?</h3>
              <p className="text-sm text-gray-600">
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

