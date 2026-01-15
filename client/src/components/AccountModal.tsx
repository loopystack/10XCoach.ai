import { useState, useEffect } from 'react'
import { X, User, Mail, Calendar, CreditCard, Loader, Phone, MapPin, Building2, Edit2 } from 'lucide-react'
import { api } from '../utils/api'
import { notify } from '../utils/notification'
import './AccountModal.css'

interface AccountModalProps {
  onClose: () => void
}

interface UserData {
  name?: string
  email?: string
  createdAt?: string
  role?: string
  businessName?: string
  industry?: string
  phone?: string
  address?: string
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
  const [showAccountInfo, setShowAccountInfo] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    industry: '',
    phone: '',
    address: ''
  })
  const [saving, setSaving] = useState(false)

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
        const userDataObj = {
          name: userProfile?.name || user?.name || 'User',
          email: userProfile?.email || user?.email || '',
          createdAt: userProfile?.createdAt || user?.createdAt || user?.created_at || null,
          role: userProfile?.role || user?.role || 'USER',
          businessName: userProfile?.businessName || user?.businessName || '',
          industry: userProfile?.industry || user?.industry || '',
          phone: userProfile?.phone || user?.phone || '',
          address: userProfile?.address || user?.address || ''
        }
        setUserData(userDataObj)
        
        // Set form data for editing
        setFormData({
          businessName: userDataObj.businessName || '',
          industry: userDataObj.industry || '',
          phone: userDataObj.phone || '',
          address: userDataObj.address || ''
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

  const handleSaveAccountInfo = async () => {
    setSaving(true)
    try {
      const response = await api.put('/api/auth/profile', formData)
      if (response.success) {
        notify.success('Account information updated successfully')
        // Update local user data
        setUserData(prev => prev ? {
          ...prev,
          businessName: formData.businessName,
          industry: formData.industry,
          phone: formData.phone,
          address: formData.address
        } : null)
        setIsEditing(false)
      }
    } catch (error: any) {
      console.error('Failed to update account info:', error)
      notify.error(error.message || 'Failed to update account information')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    // Reset form data to current user data
    setFormData({
      businessName: userData?.businessName || '',
      industry: userData?.industry || '',
      phone: userData?.phone || '',
      address: userData?.address || ''
    })
    setIsEditing(false)
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

              {/* Account Information Button */}
              <div className="account-info-button-container">
                <button 
                  className="account-info-button"
                  onClick={() => setShowAccountInfo(!showAccountInfo)}
                >
                  <Edit2 size={18} />
                  <span>ACCOUNT Information</span>
                </button>
              </div>

              {/* Additional Account Information Section */}
              {showAccountInfo && (
                <div className="account-info-expanded">
                  {isEditing ? (
                    <div className="account-info-form">
                      <div className="account-form-group">
                        <label>
                          <Building2 size={18} />
                          Business Name
                        </label>
                        <input
                          type="text"
                          value={formData.businessName}
                          onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                          placeholder="Enter your business name"
                        />
                      </div>

                      <div className="account-form-group">
                        <label>
                          <Building2 size={18} />
                          Industry
                        </label>
                        <input
                          type="text"
                          value={formData.industry}
                          onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                          placeholder="Enter your industry"
                        />
                      </div>

                      <div className="account-form-group">
                        <label>
                          <Phone size={18} />
                          Cell Number <span className="field-hint">(for text messages from coaches)</span>
                        </label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="Enter your cell phone number"
                        />
                      </div>

                      <div className="account-form-group">
                        <label>
                          <MapPin size={18} />
                          Address
                        </label>
                        <textarea
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          placeholder="Enter your address"
                          rows={3}
                        />
                      </div>

                      <div className="account-form-actions">
                        <button 
                          className="account-form-button account-form-button-save"
                          onClick={handleSaveAccountInfo}
                          disabled={saving}
                        >
                          {saving ? <Loader size={16} className="spinner" /> : 'Save'}
                        </button>
                        <button 
                          className="account-form-button account-form-button-cancel"
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="account-info-display">
                      <div className="account-info-item">
                        <div className="account-info-icon">
                          <Building2 size={20} />
                        </div>
                        <div className="account-info-content">
                          <label>Business Name</label>
                          <p>{userData?.businessName || 'Not set'}</p>
                        </div>
                      </div>

                      <div className="account-info-item">
                        <div className="account-info-icon">
                          <Building2 size={20} />
                        </div>
                        <div className="account-info-content">
                          <label>Industry</label>
                          <p>{userData?.industry || 'Not set'}</p>
                        </div>
                      </div>

                      <div className="account-info-item">
                        <div className="account-info-icon">
                          <Phone size={20} />
                        </div>
                        <div className="account-info-content">
                          <label>Cell Number <span className="field-hint">(for text messages)</span></label>
                          <p>{userData?.phone || 'Not set'}</p>
                        </div>
                      </div>

                      <div className="account-info-item">
                        <div className="account-info-icon">
                          <MapPin size={20} />
                        </div>
                        <div className="account-info-content">
                          <label>Address</label>
                          <p>{userData?.address || 'Not set'}</p>
                        </div>
                      </div>

                      <button 
                        className="account-edit-button"
                        onClick={() => setIsEditing(true)}
                      >
                        <Edit2 size={16} />
                        Edit Information
                      </button>
                    </div>
                  )}
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

