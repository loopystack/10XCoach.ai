import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { CheckCircle, XCircle } from 'lucide-react'
import { setAuthToken } from '../../utils/api'
import './Auth.css'

const VerifyEmail = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light'
    setTheme(saved || 'dark')
    
    const handleStorageChange = () => {
      const current = localStorage.getItem('theme') as 'dark' | 'light'
      setTheme(current || 'dark')
    }
    window.addEventListener('storage', handleStorageChange)
    
    const interval = setInterval(() => {
      const current = localStorage.getItem('theme') as 'dark' | 'light'
      if (current !== theme) {
        setTheme(current || 'dark')
      }
    }, 100)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [theme])

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token')
      
      if (!token) {
        setStatus('error')
        setMessage('Verification token is missing.')
        return
      }

      try {
        const response = await fetch(`/api/auth/verify-email?token=${token}`)
        const data = await response.json()

        if (response.ok) {
          setStatus('success')
          setMessage(data.message || 'Email verified successfully!')
          
          // If token and user data are provided, auto-login and redirect to dashboard
          if (data.token && data.user) {
            // Store token and user data
            setAuthToken(data.token, true) // Remember user
            localStorage.setItem('user', JSON.stringify(data.user))
            
            // Dispatch auth state change event
            window.dispatchEvent(new CustomEvent('authStateChanged'))
            
            // Redirect to dashboard after a brief delay
            setTimeout(() => {
              navigate('/dashboard')
            }, 1500)
          } else {
            // No token provided, redirect to login
            setTimeout(() => {
              navigate('/login')
            }, 3000)
          }
        } else {
          setStatus('error')
          setMessage(data.error || 'Email verification failed.')
        }
      } catch (error) {
        setStatus('error')
        setMessage('An error occurred while verifying your email.')
      }
    }

    verifyEmail()
  }, [searchParams, navigate])

  return (
    <div className="auth-page">
      {/* Animated Background */}
      <div className="auth-bg-effects">
        <div className="aurora aurora-1"></div>
        <div className="aurora aurora-2"></div>
        <div className="aurora aurora-3"></div>
        <div className="stars"></div>
      </div>

      {/* Center Panel */}
      <div className="auth-form-panel" style={{ justifyContent: 'center' }}>
        <div className="form-container" style={{ maxWidth: '500px' }}>
          <div className="form-header">
            <div className="form-logo-mobile">
              <img 
                src={theme === 'dark' ? '/lightlogo.png' : '/draft (1).png'} 
                alt="10XCoach.ai" 
                className="form-logo-img"
              />
            </div>
            <h2 className="form-title">
              Email Verification
            </h2>
          </div>

          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            background: 'var(--bg-card)',
            borderRadius: '16px',
            border: '1px solid var(--border-color)'
          }}>
            {status === 'loading' && (
              <>
                <div className="spinner" style={{ margin: '0 auto 1.5rem' }}></div>
                <p style={{ color: 'var(--text-secondary)' }}>Verifying your email...</p>
              </>
            )}

            {status === 'success' && (
              <>
                <CheckCircle size={64} style={{ color: '#22c55e', margin: '0 auto 1.5rem' }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  Email Verified!
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                  {message}
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {message.includes('dashboard') ? 'Redirecting to dashboard...' : 'Redirecting to login page...'}
                </p>
              </>
            )}

            {status === 'error' && (
              <>
                <XCircle size={64} style={{ color: '#ef4444', margin: '0 auto 1.5rem' }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
                  Verification Failed
                </h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                  {message}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
                  <Link to="/login" className="submit-btn" style={{ textDecoration: 'none', display: 'inline-block' }}>
                    <span className="btn-bg"></span>
                    <span className="btn-content">Go to Login</span>
                  </Link>
                  <Link to="/signup" style={{ color: 'var(--primary)', textDecoration: 'none' }}>
                    Sign up again
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyEmail

