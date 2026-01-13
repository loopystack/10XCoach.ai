import { useState, useEffect } from 'react'
import { Save, RefreshCw, Mail, Server, AlertCircle, CheckCircle2, Info, Eye, EyeOff, TestTube } from 'lucide-react'
import { api } from '../../utils/api'
import '../PageStyles.css'
import './AdminPages.css'

interface EmailSettings {
  smtpHost: string
  smtpPort: string
  smtpUsername: string
  smtpPassword: string
  smtpFromEmail: string
  smtpFromName: string
  clientEmail: string
  emailService: string
}

const Emails = () => {
  const [settings, setSettings] = useState<EmailSettings>({
    smtpHost: '',
    smtpPort: '465',
    smtpUsername: '',
    smtpPassword: '',
    smtpFromEmail: '',
    smtpFromName: '10XCoach.ai',
    clientEmail: 'hitech.proton@gmail.com',
    emailService: 'smtp'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await api.get('/api/admin/manage-settings')
      // Settings are stored as key-value pairs, convert to object
      const settingsObj: Partial<EmailSettings> = {}
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.key && item.value) {
            settingsObj[item.key as keyof EmailSettings] = item.value
          }
        })
      }
      
      // Use actual values from database or environment variables
      // Database values take priority, but if not in DB, use env vars as actual values
      setSettings({
        smtpHost: settingsObj.smtpHost || '',
        smtpPort: settingsObj.smtpPort || '465',
        smtpUsername: settingsObj.smtpUsername || '',
        smtpPassword: settingsObj.smtpPassword || '',
        smtpFromEmail: settingsObj.smtpFromEmail || '',
        smtpFromName: settingsObj.smtpFromName || '10XCoach.ai',
        clientEmail: settingsObj.clientEmail || 'hitech.proton@gmail.com',
        emailService: settingsObj.emailService || 'smtp'
      })
      setLoading(false)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to load email settings:', error)
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      // Convert settings object to key-value pairs for API
      const settingsArray = Object.entries(settings).map(([key, value]) => ({
        key,
        value: value || ''
      }))

      await api.post('/api/admin/manage-settings', { settings: settingsArray })
      
      setMessage({ type: 'success', text: 'Email settings saved successfully! Changes will take effect immediately.' })
      setHasChanges(false)
      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      console.error('Failed to save email settings:', error)
      setMessage({ type: 'error', text: 'Failed to save email settings. Please try again.' })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleTestEmail = async () => {
    setTesting(true)
    setMessage(null)

    try {
      await api.post('/api/admin/manage-emails-test', {
        to: settings.clientEmail,
        subject: 'Test Email from 10XCoach.ai',
        message: 'This is a test email to verify your SMTP configuration is working correctly.'
      })
      
      setMessage({ type: 'success', text: `Test email sent successfully to ${settings.clientEmail}!` })
      setTimeout(() => setMessage(null), 5000)
    } catch (error: any) {
      console.error('Failed to send test email:', error)
      const errorMsg = error?.response?.data?.error || error?.message || 'Failed to send test email. Please check your SMTP settings.'
      setMessage({ type: 'error', text: errorMsg })
      setTimeout(() => setMessage(null), 8000)
    } finally {
      setTesting(false)
    }
  }

  const handleChange = (key: keyof EmailSettings, value: any) => {
    setSettings({ ...settings, [key]: value })
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading email settings...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Email & Follow-ups
            </h1>
            <p className="page-subtitle" style={{ fontSize: '1.1rem', color: 'var(--gray-600)' }}>
              Configure SMTP settings and manage email forwarding
            </p>
          </div>
        </div>
      </div>

      {message && (
        <div className={`settings-message ${message.type}`}>
          {message.type === 'success' && <CheckCircle2 size={20} />}
          {message.type === 'error' && <AlertCircle size={20} />}
          {message.type === 'info' && <Info size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      <div className="settings-grid-modern">
        {/* SMTP Configuration */}
        <div className="settings-card-modern">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' }}>
              <Server size={24} />
            </div>
            <div>
              <h2 className="settings-card-title">SMTP Configuration</h2>
              <p className="settings-card-subtitle">Configure your email server settings</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-form-field">
              <label>SMTP Host</label>
              <input
                type="text"
                value={settings.smtpHost}
                onChange={(e) => handleChange('smtpHost', e.target.value)}
                placeholder={settings.smtpHost || "smtpout.secureserver.net (GoDaddy)"}
              />
              <small>Zoho: smtp.zoho.com (or smtppro.zoho.com for paid org) | Gmail: smtp.gmail.com | GoDaddy: smtpout.secureserver.net | Outlook: smtp-mail.outlook.com</small>
            </div>
            
            <div className="settings-form-field">
              <label>SMTP Port</label>
              <select
                value={settings.smtpPort}
                onChange={(e) => handleChange('smtpPort', e.target.value)}
              >
                <option value="465">465 (SSL) - Blocked on DigitalOcean</option>
                <option value="587">587 (TLS) - Blocked on DigitalOcean</option>
                <option value="25">25 (Standard) - Blocked on DigitalOcean</option>
                <option value="2525">2525 (Alternative) - May work</option>
                <option value="80">80 (HTTP) - May work</option>
                <option value="443">443 (HTTPS) - May work</option>
              </select>
              <small>Port 465 for SSL, 587 for TLS</small>
            </div>

            <div className="settings-form-field">
              <label>SMTP Username</label>
              <input
                type="text"
                value={settings.smtpUsername}
                onChange={(e) => handleChange('smtpUsername', e.target.value)}
                placeholder={settings.smtpUsername || "Enter SMTP username/email"}
              />
              <small>For GoDaddy: Use full email address (e.g., support@10xcoach.ai)</small>
            </div>

            <div className="settings-form-field">
              <label>SMTP Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={settings.smtpPassword}
                  onChange={(e) => handleChange('smtpPassword', e.target.value)}
                  placeholder="Enter SMTP password"
                  style={{ paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--gray-500)',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <small>Your SMTP account password or app-specific password</small>
            </div>

            <div className="settings-form-field">
              <label>From Email Address</label>
              <input
                type="email"
                value={settings.smtpFromEmail}
                onChange={(e) => handleChange('smtpFromEmail', e.target.value)}
                placeholder={settings.smtpFromEmail || settings.smtpUsername || "Enter from email address"}
              />
              <small>Email address that appears as the sender</small>
            </div>

            <div className="settings-form-field">
              <label>From Name</label>
              <input
                type="text"
                value={settings.smtpFromName}
                onChange={(e) => handleChange('smtpFromName', e.target.value)}
                placeholder="10XCoach.ai"
              />
              <small>Display name for the sender</small>
            </div>
          </div>
        </div>

        {/* Forward Email Configuration */}
        <div className="settings-card-modern">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)' }}>
              <Mail size={24} />
            </div>
            <div>
              <h2 className="settings-card-title">Forward Email Configuration</h2>
              <p className="settings-card-subtitle">Configure where quiz results and notifications are forwarded</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-form-field">
              <label>Forward Email Address</label>
              <input
                type="email"
                value={settings.clientEmail}
                onChange={(e) => handleChange('clientEmail', e.target.value)}
                placeholder={settings.clientEmail || "Enter forward email address"}
              />
              <small>All quiz results and important notifications will be sent to this email</small>
            </div>

            <div style={{ 
              background: 'var(--gray-50)', 
              padding: '16px', 
              borderRadius: '8px', 
              marginTop: '16px',
              border: '1px solid var(--gray-200)'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <Info size={20} style={{ color: 'var(--blue-600)', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--gray-900)', display: 'block', marginBottom: '4px' }}>
                    Current Forward Email
                  </strong>
                  <p style={{ color: 'var(--gray-600)', margin: 0, fontSize: '14px' }}>
                    Currently, all quiz result emails are being forwarded to: <strong>{settings.clientEmail || 'hitech.proton@gmail.com'}</strong>
                  </p>
                  <p style={{ color: 'var(--gray-600)', margin: '8px 0 0 0', fontSize: '14px' }}>
                    You can change this email address above. The original requester's email will still be included in the Reply-To field.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        gap: '12px', 
        marginTop: '2rem',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={handleTestEmail}
          disabled={testing || !settings.smtpHost || !settings.smtpUsername || !settings.smtpPassword}
          className="btn-secondary"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            opacity: (!settings.smtpHost || !settings.smtpUsername || !settings.smtpPassword) ? 0.5 : 1
          }}
        >
          {testing ? <RefreshCw size={18} className="spinning" /> : <TestTube size={18} />}
          {testing ? 'Sending Test Email...' : 'Send Test Email'}
        </button>
        
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="btn-primary"
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            opacity: !hasChanges ? 0.5 : 1
          }}
        >
          {saving ? <RefreshCw size={18} className="spinning" /> : <Save size={18} />}
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}

export default Emails
