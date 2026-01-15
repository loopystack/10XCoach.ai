import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Target,
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  Settings,
  Heart,
  Rocket,
  AlertCircle
} from 'lucide-react'
import { setAuthToken } from '../../utils/api'
import './Auth.css'

const Login = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  
  // Check if redirected due to expired session
  useEffect(() => {
    if (searchParams.get('expired') === 'true') {
      setError('Your session has expired. Please log in again.')
      // Remove the query parameter from URL
      navigate('/login', { replace: true })
    }
  }, [searchParams, navigate])

  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light'
    setTheme(saved || 'dark')
    
    // Listen for theme changes
    const handleStorageChange = () => {
      const current = localStorage.getItem('theme') as 'dark' | 'light'
      setTheme(current || 'dark')
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Also check on mount and periodically for same-tab changes
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    try {
      // Get user's timezone from browser
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      console.log('[LOGIN] Detected timezone:', userTimezone);
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, timezone: userTimezone }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store token
      if (data.token) {
        setAuthToken(data.token, rememberMe)
      }

      // Store user data - ensure we have the latest user data
      if (data.user) {
        // Ensure role is set, default to USER if not present
        // IMPORTANT: Preserve the exact role from backend (case-sensitive)
        const userData = {
          ...data.user,
          role: data.user.role ? data.user.role.toUpperCase() : 'USER'
        }
        console.log('[LOGIN] Storing user data:', userData);
        localStorage.setItem('user', JSON.stringify(userData))
        // Set login time for welcome notification
        sessionStorage.setItem('loginTime', Date.now().toString())
        // Dispatch custom event to notify navbar
        window.dispatchEvent(new CustomEvent('authStateChanged'))
      }

      // Redirect based on role
      // Daniel Rosario (danrosario0604@gmail.com) or any ADMIN role (ADMIN, SUPER_ADMIN, COACH_ADMIN) -> /app (can choose dashboard or admin)
      // All other users (USER role or undefined/null) -> /dashboard (direct access, no admin access)
      const userRole = (data.user?.role || 'USER').toUpperCase()
      const userEmail = (data.user?.email || '').toLowerCase()
      
      // Debug logging
      console.log('[LOGIN] User role:', userRole)
      console.log('[LOGIN] User email:', userEmail)
      console.log('[LOGIN] Raw role from backend:', data.user?.role)
      
      // Check if user is any type of admin
      const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'COACH_ADMIN'
      
      console.log('[LOGIN] Is admin?', isAdmin)
      console.log('[LOGIN] Admin check breakdown:', {
        isADMIN: userRole === 'ADMIN',
        isSUPER_ADMIN: userRole === 'SUPER_ADMIN',
        isCOACH_ADMIN: userRole === 'COACH_ADMIN',
        isDaniel: userEmail === 'danrosario0604@gmail.com'
      })
      
      // Only admins and Daniel Rosario can access /app
      // All other users (including USER role, null, or undefined) go to dashboard
      if (userEmail === 'danrosario0604@gmail.com' || isAdmin) {
        console.log('[LOGIN] Redirecting to /app')
        navigate('/app')
      } else {
        console.log('[LOGIN] Redirecting to /dashboard (not admin)')
        // Regular users go directly to dashboard
        navigate('/dashboard')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during login')
      setIsLoading(false)
    }
  }

  const pillars = [
    { icon: Target, label: 'Business Strategy' },
    { icon: TrendingUp, label: 'Sales' },
    { icon: BarChart3, label: 'Marketing' },
    { icon: Settings, label: 'Operations' },
    { icon: DollarSign, label: 'Finances' },
    { icon: Users, label: 'Culture' },
    { icon: Heart, label: 'Customer Centricity' },
    { icon: Rocket, label: 'Exit Strategies' }
  ]

  return (
    <div className="auth-page">
      {/* Animated Background */}
      <div className="auth-bg-effects">
        <div className="aurora aurora-1"></div>
        <div className="aurora aurora-2"></div>
        <div className="aurora aurora-3"></div>
        <div className="stars"></div>
        <div className="floating-particles">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i} 
              className="particle"
              style={{
                '--x': `${Math.random() * 100}%`,
                '--y': `${Math.random() * 100}%`,
                '--duration': `${15 + Math.random() * 20}s`,
                '--delay': `${Math.random() * -20}s`,
                '--size': `${2 + Math.random() * 4}px`
              } as React.CSSProperties}
            ></div>
          ))}
        </div>
      </div>

      {/* Left Panel - Brand & Info */}
      <div className="auth-brand-panel">
        <div className="brand-content">
          {/* Logo */}
          <Link to="/" className="auth-logo">
            <img 
              src={theme === 'dark' ? '/lightlogo.png' : '/draft (1).png'} 
              alt="10XCoach.ai" 
              className="auth-logo-img"
            />
          </Link>

          {/* Hero Text */}
          <div className="brand-hero">
            <h1 className="brand-title">
              Reclaim Your Time with
              <span className="gradient-text"> AI-Powered</span>
              <br />Business Coaching
            </h1>
            <p className="brand-subtitle">
              Running a business shouldn't mean sacrificing your peace of mind.
            </p>
          </div>

          {/* Coaching Areas */}
          <div className="coaching-areas">
            <p className="areas-intro">10XCoach.ai delivers structured, intelligent coaching in:</p>
            <div className="areas-grid">
              {pillars.map((pillar, index) => {
                const Icon = pillar.icon
                return (
                  <div 
                    key={index} 
                    className="area-item"
                    style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}
                  >
                    <Icon size={16} />
                    <span>{pillar.label}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bottom Text */}
          <p className="brand-footer">
            Helping you lead more effectively, scale faster, and regain control of your business and life.
          </p>
        </div>

        {/* 3D Crystal Elements */}
        <div className="crystal-container">
          <div className="crystal crystal-1">
            <div className="crystal-face face-1"></div>
            <div className="crystal-face face-2"></div>
            <div className="crystal-face face-3"></div>
            <div className="crystal-face face-4"></div>
            <div className="crystal-glow"></div>
          </div>
          <div className="crystal crystal-2">
            <div className="crystal-face face-1"></div>
            <div className="crystal-face face-2"></div>
            <div className="crystal-face face-3"></div>
            <div className="crystal-face face-4"></div>
            <div className="crystal-glow"></div>
          </div>
          <div className="crystal crystal-3">
            <div className="crystal-face face-1"></div>
            <div className="crystal-face face-2"></div>
            <div className="crystal-face face-3"></div>
            <div className="crystal-face face-4"></div>
            <div className="crystal-glow"></div>
          </div>
          <div className="crystal crystal-4">
            <div className="crystal-face face-1"></div>
            <div className="crystal-face face-2"></div>
            <div className="crystal-face face-3"></div>
            <div className="crystal-face face-4"></div>
            <div className="crystal-glow"></div>
          </div>
          <div className="crystal crystal-5">
            <div className="crystal-face face-1"></div>
            <div className="crystal-face face-2"></div>
            <div className="crystal-face face-3"></div>
            <div className="crystal-face face-4"></div>
            <div className="crystal-glow"></div>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="auth-form-panel">
        <div className="form-container">
          {/* Form Header */}
          <div className="form-header">
            <div className="form-logo-mobile">
              <img 
                src={theme === 'dark' ? '/lightlogo.png' : '/draft (1).png'} 
                alt="10XCoach.ai" 
                className="form-logo-img"
              />
            </div>
            <h2 className="form-title">
              Welcome to <span className="highlight">10</span><span className="highlight-x">X</span>Coach.ai
            </h2>
            <p className="form-subtitle">Sign in to transform how your business operates.</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Email Field */}
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

            {/* Password Field */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="form-input"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="input-glow"></div>
              </div>
            </div>

            {/* Remember & Forgot */}
            <div className="form-options">
              <label className="remember-checkbox">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-label">Remember Me</span>
              </label>
              <Link to="/forgot-password" className="forgot-link">
                Forgot Password?
              </Link>
            </div>

            {/* CTA Text */}
            <div className="cta-text">
              <p>Get ready to <span className="highlight">10</span><span className="highlight-x">X</span> Your Team</p>
            </div>

            {/* Submit Button */}
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
                    Log In
                    <ArrowRight size={20} />
                  </>
                )}
              </span>
              <div className="btn-shine"></div>
            </button>

            {/* Google Sign In */}
            <button type="button" className="google-btn">
              <svg viewBox="0 0 24 24" className="google-icon">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span>Continue with Google</span>
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="auth-switch">
            <span>or</span>
            <Link to="/signup" className="switch-link">Sign up</Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="auth-footer">
          <p>&copy; 2025 10XCoach.AI All rights reserved.</p>
        </footer>
      </div>
    </div>
  )
}

export default Login

