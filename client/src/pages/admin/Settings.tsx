import { useState, useEffect } from 'react'
import { Save, RefreshCw, Database, Mail, Globe, Shield, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { api } from '../../utils/api'
import '../PageStyles.css'
import './AdminPages.css'

interface Settings {
  siteName: string
  siteUrl: string
  emailService: string
  fromEmail: string
  dashboardUrl: string
  mycoachUrl: string
  sendgridApiKey?: string
  awsRegion?: string
  awsAccessKeyId?: string
}

const Settings = () => {
  const [settings, setSettings] = useState<Partial<Settings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const data = await api.get('/api/admin/manage-settings')
      // Settings are stored as key-value pairs, convert to object
      const settingsObj: Partial<Settings> = {}
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item.key && item.value) {
            settingsObj[item.key as keyof Settings] = item.value
          }
        })
      }
      
      // Set defaults if not found
      setSettings({
        siteName: settingsObj.siteName || '10XCoach.ai',
        siteUrl: settingsObj.siteUrl || 'https://95.216.225.37:3000',
        emailService: settingsObj.emailService || 'console',
        fromEmail: settingsObj.fromEmail || 'coach@10xcoach.ai',
        dashboardUrl: settingsObj.dashboardUrl || 'https://95.216.225.37:3000',
        mycoachUrl: settingsObj.mycoachUrl || 'https://95.216.225.37:5000',
        sendgridApiKey: settingsObj.sendgridApiKey || '',
        awsRegion: settingsObj.awsRegion || 'us-east-1',
        awsAccessKeyId: settingsObj.awsAccessKeyId || '',
        ...settingsObj
      })
      setLoading(false)
      setHasChanges(false)
    } catch (error) {
      console.error('Failed to load settings:', error)
      // Use defaults if API fails
      setSettings({
        siteName: '10XCoach.ai',
        siteUrl: 'https://95.216.225.37:3000',
        emailService: 'console',
        fromEmail: 'coach@10xcoach.ai',
        dashboardUrl: 'https://95.216.225.37:3000',
        mycoachUrl: 'https://95.216.225.37:5000',
        sendgridApiKey: '',
        awsRegion: 'us-east-1',
        awsAccessKeyId: ''
      })
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
        value
      }))

      await api.post('/api/admin/manage-settings', { settings: settingsArray })
      
      setMessage({ type: 'success', text: 'Settings saved successfully! Changes will take effect after server restart.' })
      setHasChanges(false)
      setTimeout(() => setMessage(null), 5000)
    } catch (error) {
      console.error('Failed to save settings:', error)
      setMessage({ type: 'error', text: 'Failed to save settings. Please try again.' })
      setTimeout(() => setMessage(null), 5000)
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (key: keyof Settings, value: any) => {
    setSettings({ ...settings, [key]: value })
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Settings
            </h1>
            <p className="page-subtitle" style={{ fontSize: '1.1rem', color: 'var(--gray-600)' }}>
              Configure system settings, integrations, and application behavior
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
        {/* General Settings */}
        <div className="settings-card-modern">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)' }}>
              <Globe size={24} style={{ color: '#3b82f6' }} />
            </div>
            <div>
              <h3>General Settings</h3>
              <p>Configure site information and URLs</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-form-field">
              <label>Site Name</label>
              <input
                type="text"
                value={settings.siteName || ''}
                onChange={(e) => handleChange('siteName', e.target.value)}
                placeholder="10XCoach.ai"
              />
            </div>
            <div className="settings-form-field">
              <label>Site URL</label>
              <input
                type="url"
                value={settings.siteUrl || ''}
                onChange={(e) => handleChange('siteUrl', e.target.value)}
                placeholder="https://95.216.225.37:3000"
              />
            </div>
            <div className="settings-form-field">
              <label>Dashboard URL</label>
              <input
                type="url"
                value={settings.dashboardUrl || ''}
                onChange={(e) => handleChange('dashboardUrl', e.target.value)}
                placeholder="https://95.216.225.37:3000"
              />
            </div>
            <div className="settings-form-field">
              <label>MyCoach URL</label>
              <input
                type="url"
                value={settings.mycoachUrl || ''}
                onChange={(e) => handleChange('mycoachUrl', e.target.value)}
                placeholder="https://95.216.225.37:5000"
              />
            </div>
          </div>
        </div>

        {/* Email Settings */}
        <div className="settings-card-modern">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)' }}>
              <Mail size={24} style={{ color: '#ef4444' }} />
            </div>
            <div>
              <h3>Email Settings</h3>
              <p>Configure email service and sender information</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-form-field">
              <label>Email Service</label>
              <select
                value={settings.emailService || 'console'}
                onChange={(e) => handleChange('emailService', e.target.value)}
              >
                <option value="console">Console (Development)</option>
                <option value="sendgrid">SendGrid</option>
                <option value="ses">AWS SES</option>
              </select>
              <small>Emails will be logged to console in development mode</small>
            </div>
            <div className="settings-form-field">
              <label>From Email Address</label>
              <input
                type="email"
                value={settings.fromEmail || ''}
                onChange={(e) => handleChange('fromEmail', e.target.value)}
                placeholder="coach@10xcoach.ai"
              />
              <small>This email will appear as the sender</small>
            </div>
            {settings.emailService === 'sendgrid' && (
              <div className="settings-form-field">
                <label>SendGrid API Key</label>
                <input
                  type="password"
                  value={settings.sendgridApiKey || ''}
                  onChange={(e) => handleChange('sendgridApiKey', e.target.value)}
                  placeholder="SG.xxxxxxxxxxxxx"
                />
                <small>Get your API key from SendGrid dashboard</small>
              </div>
            )}
            {settings.emailService === 'ses' && (
              <>
                <div className="settings-form-field">
                  <label>AWS Region</label>
                  <input
                    type="text"
                    value={settings.awsRegion || 'us-east-1'}
                    onChange={(e) => handleChange('awsRegion', e.target.value)}
                    placeholder="us-east-1"
                  />
                </div>
                <div className="settings-form-field">
                  <label>AWS Access Key ID</label>
                  <input
                    type="password"
                    value={settings.awsAccessKeyId || ''}
                    onChange={(e) => handleChange('awsAccessKeyId', e.target.value)}
                    placeholder="AKIAxxxxxxxxxxxxx"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Security Settings */}
        <div className="settings-card-modern">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(217, 119, 6, 0.05) 100%)' }}>
              <Shield size={24} style={{ color: '#eab308' }} />
            </div>
            <div>
              <h3>Security Settings</h3>
              <p>Manage authentication and security configuration</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-form-field">
              <label>JWT Secret</label>
              <input
                type="password"
                value="••••••••••••••••"
                disabled
                style={{ opacity: 0.6 }}
              />
              <small style={{ color: '#ef4444' }}>
                ⚠️ JWT Secret is managed in environment variables for security. Changes require server restart.
              </small>
            </div>
            <div className="settings-info-box">
              <Info size={18} />
              <div>
                <strong>Security Note:</strong>
                <p>For security reasons, sensitive credentials like JWT secrets and API keys should be managed through environment variables or a secure secrets manager.</p>
              </div>
            </div>
          </div>
        </div>

        {/* System Information */}
        <div className="settings-card-modern">
          <div className="settings-card-header">
            <div className="settings-card-icon" style={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)' }}>
              <Database size={24} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <h3>System Information</h3>
              <p>View system status and version information</p>
            </div>
          </div>
          <div className="settings-card-body">
            <div className="settings-info-row">
              <span className="settings-info-label">Environment:</span>
              <span className="settings-info-value">{import.meta.env.MODE || 'development'}</span>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">API Version:</span>
              <span className="settings-info-value">v1.0.0</span>
            </div>
            <div className="settings-info-row">
              <span className="settings-info-label">Server Status:</span>
              <span className="settings-info-value" style={{ color: '#22c55e' }}>● Online</span>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-footer">
        <div className="settings-footer-info">
          {hasChanges && (
            <div className="settings-changes-indicator">
              <AlertCircle size={16} />
              <span>You have unsaved changes</span>
            </div>
          )}
        </div>
        <div className="settings-footer-actions">
          <button 
            className="settings-reset-button" 
            onClick={loadSettings} 
            disabled={saving || !hasChanges}
          >
            <RefreshCw size={18} />
            <span>Reset</span>
          </button>
          <button 
            className="settings-save-button" 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
          >
            <Save size={18} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Settings
