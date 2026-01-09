import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react'
import './Auth.css'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send reset email')
      }

      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="auth-page">
      {/* Animated Background */}
      <div className="auth-bg-effects">
        <div className="aurora aurora-1"></div>
        <div className="aurora aurora-2"></div>
        <div className="aurora aurora-3"></div>
        <div className="stars"></div>
      </div>

      {/* Form Panel */}
      <div className="auth-form-panel">
        <div className="form-container">
          <div className="form-header">
            <h2 className="form-title">Reset Your Password</h2>
            <p className="form-subtitle">
              Enter your email address and we'll send you a link to reset your password.
            </p>
          </div>

          {success ? (
            <div className="auth-success">
              <CheckCircle size={18} />
              <div>
                <p><strong>Check your email!</strong></p>
                <p>We've sent a password reset link to <strong>{email}</strong></p>
                <p style={{ fontSize: '14px', marginTop: '12px', opacity: 0.8 }}>
                  The link will expire in 1 hour. If you don't see the email, check your spam folder.
                </p>
              </div>
            </div>
          ) : (
            <>
              {error && (
                <div className="auth-error">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email</label>
                  <div className="input-wrapper">
                    <Mail size={18} className="input-icon" />
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hello@company.com"
                      className="form-input"
                      required
                    />
                    <div className="input-glow"></div>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className={`submit-btn ${isLoading ? 'loading' : ''}`}
                  disabled={isLoading}
                >
                  <span className="btn-bg"></span>
                  <span className="btn-content">
                    {isLoading ? (
                      <div className="spinner"></div>
                    ) : (
                      <>
                        Send Reset Link
                        <ArrowRight size={20} />
                      </>
                    )}
                  </span>
                  <div className="btn-shine"></div>
                </button>
              </form>
            </>
          )}

          <div className="auth-switch">
            <Link to="/login" className="switch-link">Back to Login</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ForgotPassword

