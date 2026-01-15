import { useState, useEffect } from 'react'
import { X, User, Mail, Calendar, CreditCard, Loader } from 'lucide-react'
import { api } from '../utils/api'
import './AccountModal.css'

interface AccountModalProps {
  onClose: () => void
}

interface UserData {
  name?: string
  email?: string
  createdAt?: string
  role?: string
}

interface BillingData {
  currentPlanName?: string | null
  accessStatus?: string
  trialDaysRemaining?: number | null
  trialEndDate?: string | null
  creditBalance?: number
}

const AccountModal = ({ onClose }: AccountModalProps) => {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchAccountData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Fetch user profile from API to get actual createdAt from database
        let userProfile = null
        try {
          userProfile = await api.get('/api/auth/me')
        } catch (profileError: any) {
          console.warn('Failed to fetch user profile, using localStorage data:', profileError)
        }

        // Get user data from localStorage as fallback
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
        let user = null
        if (userStr) {
          try {
            user = JSON.parse(userStr)
          } catch (e) {
            console.warn('Failed to parse user data from storage')
          }
        }

        // Use API data if available, otherwise fallback to localStorage
        setUserData({
          name: userProfile?.name || user?.name || 'User',
          email: userProfile?.email || user?.email || '',
          createdAt: userProfile?.createdAt || user?.createdAt || user?.created_at || null,
          role: userProfile?.role || user?.role || 'USER'
        })

        // Fetch billing status
        try {
          const billingStatus = await api.get('/api/billing/status')
          setBillingData(billingStatus)
        } catch (billingError: any) {
          console.warn('Failed to fetch billing status:', billingError)
          // Set default billing data if fetch fails
          setBillingData({
            currentPlanName: null,
            accessStatus: 'TRIAL_ACTIVE',
            trialDaysRemaining: null,
            creditBalance: 0
          })
        }
      } catch (err: any) {
        console.error('Error fetching account data:', err)
        setError('Failed to load account information. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchAccountData()
  }, [])

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    } catch {
      return 'N/A'
    }
  }

  const getPlanDisplay = (): string => {
    if (!billingData) return 'Loading...'
    
    if (billingData.currentPlanName) {
      return billingData.currentPlanName
    }
    
    if (billingData.trialDaysRemaining !== null && billingData.trialDaysRemaining !== undefined && billingData.trialDaysRemaining > 0) {
      return `Free Trial (${billingData.trialDaysRemaining} days remaining)`
    }
    
    if (billingData.accessStatus === 'TRIAL_EXPIRED') {
      return 'Trial Expired'
    }
    
    return 'No Active Plan'
  }

  const getPlanStatusColor = (): string => {
    if (!billingData) return '#6b7280'
    
    if (billingData.currentPlanName) {
      return '#10b981' // Green for active plan
    }
    
    if (billingData.trialDaysRemaining !== null && billingData.trialDaysRemaining !== undefined && billingData.trialDaysRemaining > 0) {
      return '#3b82f6' // Blue for active trial
    }
    
    return '#ef4444' // Red for expired/no plan
  }

  return (
    <div className="account-modal-overlay" onClick={onClose}>
      <div className="account-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="account-modal-header">
          <h2>Account Information</h2>
          <button className="account-modal-close" onClick={onClose} aria-label="Close">
            <X size={24} />
          </button>
        </div>

        <div className="account-modal-body">
          {loading ? (
            <div className="account-modal-loading">
              <Loader size={32} className="spinner" />
              <p>Loading account information...</p>
            </div>
          ) : error ? (
            <div className="account-modal-error">
              <p>{error}</p>
            </div>
          ) : (
            <>
              {/* Profile Info Section */}
              <div className="account-info-section">
                <div className="account-info-item">
                  <div className="account-info-icon">
                    <User size={20} />
                  </div>
                  <div className="account-info-content">
                    <label>Username</label>
                    <p>{userData?.name || 'N/A'}</p>
                  </div>
                </div>

                <div className="account-info-item">
                  <div className="account-info-icon">
                    <Mail size={20} />
                  </div>
                  <div className="account-info-content">
                    <label>Email Address</label>
                    <p>{userData?.email || 'N/A'}</p>
                  </div>
                </div>

                <div className="account-info-item">
                  <div className="account-info-icon">
                    <Calendar size={20} />
                  </div>
                  <div className="account-info-content">
                    <label>Signed Up Date</label>
                    <p>{formatDate(userData?.createdAt)}</p>
                  </div>
                </div>

                <div className="account-info-item">
                  <div className="account-info-icon">
                    <CreditCard size={20} />
                  </div>
                  <div className="account-info-content">
                    <label>Current Plan</label>
                    <p style={{ color: getPlanStatusColor(), fontWeight: 600 }}>
                      {getPlanDisplay()}
                    </p>
                    {billingData?.creditBalance !== undefined && billingData.creditBalance > 0 && (
                      <span className="account-credit-balance">
                        Credit Balance: ${billingData.creditBalance.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Account Role Badge */}
              {userData?.role && (
                <div className="account-role-badge">
                  <span className={`role-badge role-${userData.role.toLowerCase()}`}>
                    {userData.role}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        <div className="account-modal-footer">
          <button className="account-modal-button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default AccountModal

