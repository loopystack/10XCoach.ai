import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Check, CreditCard, Clock, AlertCircle, ArrowRight, Package, Settings, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { api, isAuthenticated } from '../utils/api'
import { notify } from '../utils/notification'
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
  // Prepaid time fields
  prepaidHoursBalance?: number
  includedHoursMonthly?: number | null
  hoursUsedThisMonth?: number
  lastUsageResetDate?: string | null
  usageAlerts?: {
    alert75Sent: boolean
    alert90Sent: boolean
    alert100Sent: boolean
  }
  spendingControls?: {
    hardStopAtLimit: boolean
    autoPurchaseEnabled: boolean
    autoPurchasePackSize: number | null
  }
  activeTimePacks?: Array<{
    id: number
    packSize: number
    hoursPurchased: number
    hoursUsed: number
    hoursRemaining: number
    expiresAt: string | null
    createdAt: string
  }>
}

interface UsageData {
  includedHours: number
  extraHoursPurchased: number
  hoursUsed: number
  remainingBalance: number
  hoursUsedThisMonth: number
  lastUsageResetDate: string | null
  activeTimePacks: Array<{
    id: number
    packSize: number
    hoursPurchased: number
    hoursUsed: number
    hoursRemaining: number
    expiresAt: string | null
    createdAt: string
  }>
  sessionsThisMonth: number
  totalMinutesUsed: number
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
  const [usageData, setUsageData] = useState<UsageData | null>(null)
  const [purchasingPack, setPurchasingPack] = useState<number | null>(null) // packSize being purchased
  const [showSpendingControls, setShowSpendingControls] = useState(false)
  const [spendingControls, setSpendingControls] = useState({
    hardStopAtLimit: false,
    autoPurchaseEnabled: false,
    autoPurchasePackSize: null as number | null
  })
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { state: { from: '/plans' } })
      return
    }

    fetchBillingStatus()
    fetchPlans()
    fetchUsageData()
    
    // Check for payment success/cancel in URL
    const params = new URLSearchParams(location.search)
    const paymentStatus = params.get('payment')
    const sessionId = params.get('session_id')
    
    // Only process payment notification if URL parameters exist (first time only)
    if (paymentStatus === 'success') {
      // Verify payment and add credit if webhook hasn't fired yet
      if (sessionId) {
        verifyPayment(sessionId).then(() => {
          // Remove URL parameters after processing to prevent showing notification on refresh
          const newUrl = window.location.pathname
          window.history.replaceState({}, '', newUrl)
        })
      } else {
        notify.success('Payment successful! Your credit has been added.')
        fetchBillingStatus() // Refresh status
        fetchUsageData() // Refresh usage data
        // Remove URL parameters after showing notification
        const newUrl = window.location.pathname
        window.history.replaceState({}, '', newUrl)
      }
    } else if (paymentStatus === 'cancelled') {
      notify.info('Payment was cancelled.')
      // Remove URL parameters after showing notification
      const newUrl = window.location.pathname
      window.history.replaceState({}, '', newUrl)
    }
  }, [location.search])

  const verifyPayment = async (sessionId: string) => {
    try {
      const result = await api.get(`/api/billing/verify-payment?session_id=${sessionId}`)
      if (result.success) {
        // Only show notification if credit was actually added (not already processed)
        if (!result.alreadyProcessed) {
          notify.success(`Payment successful! $${result.amount?.toFixed(2) || 'Credit'} has been added to your account.`)
        }
        fetchBillingStatus() // Refresh status
      } else {
        notify.error('Payment was successful, but there was an issue adding credit. Please contact support.')
        fetchBillingStatus() // Still refresh to check if webhook processed it
      }
    } catch (error: any) {
      console.error('Failed to verify payment:', error)
      // Still refresh status in case webhook processed it
      fetchBillingStatus()
      // Only show alert if it's the first attempt (URL params still present)
      if (new URLSearchParams(location.search).get('payment') === 'success') {
        notify.warning('Payment was successful. Please wait a moment and refresh the page to see your updated credit balance.')
      }
    }
  }

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

  const fetchUsageData = async () => {
    try {
      const usage = await api.get('/api/billing/usage')
      // Map backend response to frontend UsageData interface
      setUsageData({
        includedHours: usage.includedHours || 0,
        extraHoursPurchased: usage.extraHoursPurchased || 0,
        hoursUsed: usage.hoursUsed || 0,
        remainingBalance: usage.remainingBalance || 0,
        hoursUsedThisMonth: usage.hoursUsedThisMonth || 0,
        lastUsageResetDate: usage.lastUsageResetDate || null,
        activeTimePacks: usage.activeTimePacks || [],
        sessionsThisMonth: usage.sessionsThisMonth || 0,
        totalMinutesUsed: usage.totalMinutesUsed || 0
      })
    } catch (error: any) {
      console.error('Failed to fetch usage data:', error)
      // Set default usage data on error
      setUsageData({
        includedHours: 0,
        extraHoursPurchased: 0,
        hoursUsed: 0,
        remainingBalance: 0,
        hoursUsedThisMonth: 0,
        lastUsageResetDate: null,
        activeTimePacks: [],
        sessionsThisMonth: 0,
        totalMinutesUsed: 0
      })
    }
  }

  const handlePurchaseTimePack = async (packSize: number) => {
    try {
      setPurchasingPack(packSize)
      const response = await api.post('/api/billing/purchase-time-pack', { 
        packSize: packSize
      })
      
      // Redirect to Stripe checkout
      if (response.url) {
        window.location.href = response.url
      }
    } catch (error: any) {
      console.error('Failed to purchase time pack:', error)
      notify.error(error.message || 'Failed to start checkout. Please try again.')
      setPurchasingPack(null)
    }
  }

  const handleUpdateSpendingControls = async () => {
    try {
      const response = await api.post('/api/billing/update-spending-controls', spendingControls)
      if (response.success) {
        notify.success('Spending controls updated successfully')
        setSpendingControls(response.spendingControls)
        // Update billing status to reflect changes
        fetchBillingStatus()
      }
    } catch (error: any) {
      console.error('Failed to update spending controls:', error)
      notify.error(error.message || 'Failed to update spending controls')
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
      notify.error(error.message || 'Failed to start checkout. Please try again.')
      setCheckoutLoading(false)
    }
  }

  const handleActivatePlan = async (plan: Plan) => {
    try {
      setActivatingPlan(plan.id)
      
      // For now, use plan price. You can adjust this logic
      const planPrice = plan.price
      
      if (billingStatus && billingStatus.creditBalance < planPrice) {
        notify.warning(`Insufficient credit. You need $${planPrice} but only have $${billingStatus.creditBalance}. Please add more credit.`)
        setActivatingPlan(null)
        return
      }

      const response = await api.post('/api/billing/activate-plan', {
        planName: plan.name,
        planPrice: planPrice,
        planDurationDays: 30 // Default 30 days, adjust as needed
      })

      notify.success(response.message || 'Plan activated successfully!')
      fetchBillingStatus() // Refresh status
    } catch (error: any) {
      console.error('Failed to activate plan:', error)
      notify.error(error.message || 'Failed to activate plan. Please try again.')
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
                      <div className="modern-spinner"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard size={16} />
                      <span>Add Credit</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Usage Dashboard */}
        {usageData && (
          <div 
            className="content-card" 
            style={{ 
              marginBottom: '32px',
              padding: '24px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.02) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--gray-900)' }}>
                Usage Dashboard
              </h2>
              <button
                onClick={() => setShowSpendingControls(!showSpendingControls)}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.2)',
                  borderRadius: '8px',
                  color: '#3b82f6',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Settings size={16} />
                Spending Controls
              </button>
            </div>

            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid rgba(229, 231, 235, 0.8)' }}>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Included Hours
                </p>
                <p style={{ fontSize: '28px', fontWeight: 800, color: 'var(--gray-900)', margin: 0 }}>
                  {usageData.includedHours.toFixed(1)}h
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', margin: 0 }}>
                  Monthly
                </p>
              </div>

              <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid rgba(229, 231, 235, 0.8)' }}>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Extra Hours Purchased
                </p>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#8b5cf6', margin: 0 }}>
                  {usageData.extraHoursPurchased.toFixed(1)}h
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', margin: 0 }}>
                  Prepaid
                </p>
              </div>

              <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid rgba(229, 231, 235, 0.8)' }}>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Hours Used
                </p>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#ef4444', margin: 0 }}>
                  {usageData.hoursUsed.toFixed(1)}h
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', margin: 0 }}>
                  This Month
                </p>
              </div>

              <div style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid rgba(229, 231, 235, 0.8)' }}>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginBottom: '8px', fontWeight: 600, textTransform: 'uppercase' }}>
                  Remaining Balance
                </p>
                <p style={{ fontSize: '28px', fontWeight: 800, color: '#10b981', margin: 0 }}>
                  {Math.max(0, usageData.remainingBalance).toFixed(1)}h
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', margin: 0 }}>
                  Available
                </p>
              </div>
            </div>

            {/* Estimated Overage Cost */}
            {usageData.hoursUsed > (usageData.includedHours + usageData.extraHoursPurchased) && (
              <div style={{ 
                marginTop: '20px', 
                padding: '16px', 
                background: 'rgba(239, 68, 68, 0.1)', 
                borderRadius: '12px',
                border: '1px solid rgba(239, 68, 68, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertCircle size={18} style={{ color: '#ef4444' }} />
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#dc2626' }}>Estimated Overage</span>
                </div>
                <p style={{ fontSize: '24px', fontWeight: 800, color: '#dc2626', margin: 0 }}>
                  ${((usageData.hoursUsed - (usageData.includedHours + usageData.extraHoursPurchased)) * 35).toFixed(2)}
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gray-600)', marginTop: '4px', margin: 0 }}>
                  {((usageData.hoursUsed - (usageData.includedHours + usageData.extraHoursPurchased)) * 60).toFixed(0)} minutes × $0.5833/minute
                </p>
              </div>
            )}

            {/* Usage Progress Bar */}
            {usageData.includedHours + usageData.extraHoursPurchased > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)' }}>Usage Progress</span>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--gray-700)' }}>
                    {((usageData.hoursUsed / (usageData.includedHours + usageData.extraHoursPurchased)) * 100).toFixed(1)}%
                  </span>
                </div>
                <div style={{ 
                  width: '100%', 
                  height: '12px', 
                  background: 'rgba(229, 231, 235, 0.8)', 
                  borderRadius: '6px',
                  overflow: 'hidden'
                }}>
                  <div style={{ 
                    width: `${Math.min(100, (usageData.hoursUsed / (usageData.includedHours + usageData.extraHoursPurchased)) * 100)}%`,
                    height: '100%',
                    background: usageData.hoursUsed / (usageData.includedHours + usageData.extraHoursPurchased) > 0.9
                      ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)'
                      : usageData.hoursUsed / (usageData.includedHours + usageData.extraHoursPurchased) > 0.75
                      ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
                    transition: 'width 0.3s ease'
                  }} />
                </div>
                {/* Usage Alerts */}
                {billingStatus?.usageAlerts && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {usageData.hoursUsed / (usageData.includedHours + usageData.extraHoursPurchased) >= 0.75 && !billingStatus.usageAlerts.alert75Sent && (
                      <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', fontSize: '12px', color: '#d97706' }}>
                        ⚠️ 75% usage reached
                      </div>
                    )}
                    {usageData.hoursUsed / (usageData.includedHours + usageData.extraHoursPurchased) >= 0.9 && !billingStatus.usageAlerts.alert90Sent && (
                      <div style={{ padding: '8px 12px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '6px', fontSize: '12px', color: '#d97706' }}>
                        ⚠️ 90% usage reached
                      </div>
                    )}
                    {usageData.hoursUsed >= (usageData.includedHours + usageData.extraHoursPurchased) && !billingStatus.usageAlerts.alert100Sent && (
                      <div style={{ padding: '8px 12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '6px', fontSize: '12px', color: '#dc2626' }}>
                        🚨 100% usage reached
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Spending Controls Modal */}
            {showSpendingControls && (
              <div style={{ 
                marginTop: '24px', 
                padding: '20px', 
                background: 'rgba(249, 250, 251, 0.8)', 
                borderRadius: '12px',
                border: '1px solid rgba(229, 231, 235, 0.8)'
              }}>
                <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '18px', fontWeight: 700 }}>Spending Controls & Alerts</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={spendingControls.hardStopAtLimit}
                      onChange={(e) => setSpendingControls({ ...spendingControls, hardStopAtLimit: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Hard stop at limit (prevent usage when balance reaches 0)</span>
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={spendingControls.autoPurchaseEnabled}
                      onChange={(e) => setSpendingControls({ ...spendingControls, autoPurchaseEnabled: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 500 }}>Auto-purchase next pack when balance reaches 0</span>
                  </label>

                  {spendingControls.autoPurchaseEnabled && (
                    <div style={{ marginLeft: '30px' }}>
                      <label style={{ fontSize: '14px', fontWeight: 500, marginBottom: '8px', display: 'block' }}>
                        Auto-purchase pack size:
                      </label>
                      <select
                        value={spendingControls.autoPurchasePackSize || ''}
                        onChange={(e) => setSpendingControls({ ...spendingControls, autoPurchasePackSize: e.target.value ? parseInt(e.target.value) : null })}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid rgba(229, 231, 235, 0.8)',
                          borderRadius: '8px',
                          fontSize: '14px',
                          width: '200px'
                        }}
                      >
                        <option value="">Select pack size</option>
                        <option value="5">5 hours ($175)</option>
                        <option value="10">10 hours ($350)</option>
                        <option value="25">25 hours ($875)</option>
                      </select>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                    <button
                      onClick={handleUpdateSpendingControls}
                      className="primary-button"
                      style={{ padding: '10px 20px', fontSize: '14px' }}
                    >
                      Save Controls
                    </button>
                    <button
                      onClick={() => setShowSpendingControls(false)}
                      style={{
                        padding: '10px 20px',
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '8px',
                        color: '#ef4444',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prepaid Time Packs */}
        <div 
          className="content-card" 
          style={{ 
            marginBottom: '32px',
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05) 0%, rgba(59, 130, 246, 0.02) 100%)',
            border: '1px solid rgba(139, 92, 246, 0.2)'
          }}
        >
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--gray-900)', marginBottom: '8px' }}>
              Prepaid Time Packs
            </h2>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--gray-600)' }}>
              Buy additional time upfront at the same rate. Unused time can roll over (6-12 months).
            </p>
            <div style={{ marginTop: '12px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--gray-600)' }}>
                <Check size={14} style={{ color: '#10b981' }} />
                <span>Predictable</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--gray-600)' }}>
                <Check size={14} style={{ color: '#10b981' }} />
                <span>No surprise bills</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--gray-600)' }}>
                <Check size={14} style={{ color: '#10b981' }} />
                <span>Easy to explain</span>
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '20px'
          }}>
            {/* 5 Hours Pack */}
            <div style={{
              padding: '20px',
              background: 'white',
              borderRadius: '12px',
              border: '2px solid rgba(139, 92, 246, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Package size={20} style={{ color: '#8b5cf6' }} />
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>5 Hours</h3>
                </div>
                <p style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6', margin: 0 }}>
                  $175
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', margin: 0 }}>
                  $35/hour
                </p>
              </div>
              <div style={{ flexGrow: 1, marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: 0 }}>
                  Perfect for occasional use or trying out the service.
                </p>
              </div>
              <button
                onClick={() => handlePurchaseTimePack(5)}
                disabled={purchasingPack === 5}
                className="primary-button"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: purchasingPack === 5 ? 0.6 : 1,
                  cursor: purchasingPack === 5 ? 'not-allowed' : 'pointer'
                }}
              >
                {purchasingPack === 5 ? (
                  <>
                    <div className="modern-spinner"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    <span>Purchase 5 Hours</span>
                  </>
                )}
              </button>
            </div>

            {/* 10 Hours Pack */}
            <div style={{
              padding: '20px',
              background: 'white',
              borderRadius: '12px',
              border: '2px solid rgba(139, 92, 246, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                padding: '4px 12px',
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                color: 'white',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                Popular
              </div>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Package size={20} style={{ color: '#8b5cf6' }} />
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>10 Hours</h3>
                </div>
                <p style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6', margin: 0 }}>
                  $350
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', margin: 0 }}>
                  $35/hour
                </p>
              </div>
              <div style={{ flexGrow: 1, marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: 0 }}>
                  Great value for regular users. Most popular choice.
                </p>
              </div>
              <button
                onClick={() => handlePurchaseTimePack(10)}
                disabled={purchasingPack === 10}
                className="primary-button"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
                  opacity: purchasingPack === 10 ? 0.6 : 1,
                  cursor: purchasingPack === 10 ? 'not-allowed' : 'pointer'
                }}
              >
                {purchasingPack === 10 ? (
                  <>
                    <div className="modern-spinner"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    <span>Purchase 10 Hours</span>
                  </>
                )}
              </button>
            </div>

            {/* 25 Hours Pack */}
            <div style={{
              padding: '20px',
              background: 'white',
              borderRadius: '12px',
              border: '2px solid rgba(139, 92, 246, 0.2)',
              display: 'flex',
              flexDirection: 'column',
              height: '100%'
            }}>
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <Package size={20} style={{ color: '#8b5cf6' }} />
                  <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--gray-900)' }}>25 Hours</h3>
                </div>
                <p style={{ fontSize: '32px', fontWeight: 800, color: '#8b5cf6', margin: 0 }}>
                  $875
                </p>
                <p style={{ fontSize: '12px', color: 'var(--gray-500)', marginTop: '4px', margin: 0 }}>
                  $35/hour
                </p>
              </div>
              <div style={{ flexGrow: 1, marginBottom: '16px' }}>
                <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: 0 }}>
                  Best value for heavy users. Maximum savings.
                </p>
              </div>
              <button
                onClick={() => handlePurchaseTimePack(25)}
                disabled={purchasingPack === 25}
                className="primary-button"
                style={{
                  width: '100%',
                  padding: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: purchasingPack === 25 ? 0.6 : 1,
                  cursor: purchasingPack === 25 ? 'not-allowed' : 'pointer'
                }}
              >
                {purchasingPack === 25 ? (
                  <>
                    <div className="modern-spinner"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard size={16} />
                    <span>Purchase 25 Hours</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Contract Language */}
          <div style={{ 
            marginTop: '24px', 
            padding: '16px', 
            background: 'rgba(249, 250, 251, 0.8)', 
            borderRadius: '8px',
            fontSize: '13px',
            color: 'var(--gray-600)',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: 0, fontWeight: 600, marginBottom: '8px', color: 'var(--gray-700)' }}>
              Contract Language:
            </p>
            <p style={{ margin: 0 }}>
              "Additional usage beyond the included monthly hours is billed at $35 per hour, calculated per minute. 
              Clients may pre-purchase additional hours at the same rate. Unused prepaid hours expire after 9 months."
            </p>
          </div>
        </div>

        {/* Plans Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '24px',
          marginBottom: '32px',
          alignItems: 'stretch' // Make all cards same height
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
                  padding: '24px',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
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

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px 0', flexGrow: 1 }}>
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

                {/* Button Container - All buttons aligned at bottom */}
                <div style={{ marginTop: 'auto', paddingTop: '16px' }}>

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
                        justifyContent: 'center',
                        padding: '12px 20px',
                        minHeight: '44px'
                      }}
                    >
                      Active Plan
                    </button>
                  ) : canActivate ? (
                    <>
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
                          opacity: activatingPlan === plan.id ? 0.7 : 1,
                          cursor: activatingPlan === plan.id ? 'not-allowed' : 'pointer',
                          color: '#ffffff',
                          textAlign: 'center',
                          padding: '12px 20px',
                          minHeight: '44px',
                          marginBottom: '12px'
                        }}
                      >
                        {activatingPlan === plan.id ? (
                          <>
                            <div className="modern-spinner"></div>
                            <span>Activating...</span>
                          </>
                        ) : (
                          <>
                            <span>Activate Plan</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                      <button
                        onClick={handleCreateCheckout}
                        disabled={checkoutLoading}
                        className="primary-button"
                        style={{ 
                          width: '100%',
                          background: '#475569',
                          color: '#ffffff',
                          border: 'none',
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px 20px',
                          minHeight: '44px',
                          opacity: checkoutLoading ? 0.7 : 1,
                          cursor: checkoutLoading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {checkoutLoading ? (
                          <>
                            <div className="modern-spinner"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <span>Add Credit First</span>
                        )}
                      </button>
                    </>
                  ) : (
                    <>
                      <p style={{ 
                        fontSize: '14px', 
                        color: 'var(--gray-600)', 
                        marginBottom: '12px',
                        textAlign: 'center',
                        fontWeight: 600
                      }}>
                        Need ${(plan.price - (billingStatus?.creditBalance || 0)).toFixed(2)} more credit
                      </p>
                      <button
                        onClick={handleCreateCheckout}
                        disabled={checkoutLoading}
                        className="primary-button"
                        style={{ 
                          width: '100%',
                          background: '#475569',
                          color: '#ffffff',
                          border: 'none',
                          textAlign: 'center',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: '12px 20px',
                          minHeight: '44px',
                          opacity: checkoutLoading ? 0.7 : 1,
                          cursor: checkoutLoading ? 'not-allowed' : 'pointer'
                        }}
                      >
                        {checkoutLoading ? (
                          <>
                            <div className="modern-spinner"></div>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <span>Add Credit First</span>
                        )}
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* 10X Billing FAQ Section */}
        <div 
          className="content-card" 
          style={{ 
            marginBottom: '32px',
            padding: '24px',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(139, 92, 246, 0.02) 100%)',
            border: '1px solid rgba(59, 130, 246, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <HelpCircle size={24} style={{ color: '#3b82f6' }} />
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--gray-900)' }}>
              10X Billing FAQ
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* FAQ Items - using the same expandable format as before */}
            {[
              {
                id: 1,
                question: 'How does billing work?',
                answer: 'We bill on a subscription basis, which includes a set number of hours/minutes each billing cycle. If you use more than your included time, you can either pre-purchase additional hours or be billed automatically for overage at a flat rate of $35 per hour.'
              },
              {
                id: 2,
                question: 'What happens if I exceed my included hours?',
                answer: (
                  <>
                    <p style={{ marginBottom: '12px', marginTop: 0 }}>
                      If you exceed your included usage:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      <li>Additional time is billed at $35 per hour ($0.5833 per minute)</li>
                      <li>Usage is calculated per minute (not rounded up to full hours)</li>
                      <li>You can choose to be billed automatically at the end of the billing period, or pre-purchase additional hours in advance</li>
                    </ul>
                  </>
                )
              },
              {
                id: 3,
                question: 'Can I pre-purchase additional hours?',
                answer: (
                  <>
                    <p style={{ marginBottom: '12px', marginTop: 0 }}>
                      Yes. You may pre-purchase additional hours at the same rate of $35 per hour. Common options include:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      <li>5 hours for $175</li>
                      <li>10 hours for $350</li>
                      <li>25 hours for $875</li>
                    </ul>
                    <p style={{ marginTop: '12px', marginBottom: 0 }}>
                      Pre-purchased hours are applied automatically as you use the service.
                    </p>
                  </>
                )
              },
              {
                id: 4,
                question: 'Do unused purchased hours roll over?',
                answer: 'Yes. Unused pre-purchased hours roll over and remain available for up to 9 months from the purchase date. Unused hours expire after that period.'
              },
              {
                id: 5,
                question: 'Will I be notified before I incur extra charges?',
                answer: (
                  <>
                    <p style={{ marginBottom: '12px', marginTop: 0 }}>
                      Yes. You can enable usage alerts to notify you when you reach:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      <li>75% of included usage</li>
                      <li>90% of included usage</li>
                      <li>100% of included usage</li>
                    </ul>
                    <p style={{ marginTop: '12px', marginBottom: 0 }}>
                      You can also set a monthly spending limit or hard stop in your account settings (Spending Controls).
                    </p>
                  </>
                )
              },
              {
                id: 6,
                question: 'Can I cap or control overage charges?',
                answer: (
                  <>
                    <p style={{ marginBottom: '12px', marginTop: 0 }}>
                      Yes. You may:
                    </p>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                      <li>Set a maximum monthly overage limit</li>
                      <li>Enable auto-purchase of additional hours</li>
                      <li>Disable overages entirely (service pauses once usage is exhausted)</li>
                    </ul>
                    <p style={{ marginTop: '12px', marginBottom: 0 }}>
                      You are always in control. Configure these settings in Spending Controls above.
                    </p>
                  </>
                )
              },
              {
                id: 7,
                question: 'When will I be billed?',
                answer: (
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    <li>Subscriptions are billed in advance at the start of each billing cycle</li>
                    <li>Overage charges (if any) are billed in arrears at the end of the billing cycle</li>
                    <li>Pre-purchased hours are billed at the time of purchase</li>
                    <li>All charges appear as line items on your invoice</li>
                  </ul>
                )
              },
              {
                id: 8,
                question: 'Are there refunds for unused time?',
                answer: 'Subscription fees are non-refundable. Pre-purchased hours are non-refundable but may be used until they expire (up to 9 months from purchase).'
              }
            ].map((faq) => (
              <div key={faq.id} style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid rgba(229, 231, 235, 0.8)',
                overflow: 'hidden'
              }}>
                <button
                  onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                  style={{
                    width: '100%',
                    padding: '16px 20px',
                    background: 'transparent',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--gray-900)'
                  }}
                >
                  <span>{faq.question}</span>
                  {expandedFaq === faq.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                {expandedFaq === faq.id && (
                  <div style={{ padding: '0 20px 20px 20px', fontSize: '14px', color: 'var(--gray-700)', lineHeight: '1.6' }}>
                    {typeof faq.answer === 'string' ? <p style={{ margin: 0 }}>{faq.answer}</p> : faq.answer}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Plans
