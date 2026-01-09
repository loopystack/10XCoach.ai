import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ArrowRight,
  User,
  Building2,
  Briefcase,
  ChevronDown,
  Target,
  TrendingUp,
  BarChart3,
  Users,
  DollarSign,
  Settings,
  Heart,
  Rocket,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { setAuthToken } from '../../utils/api'
import './Auth.css'

const Signup = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    industry: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

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

  const industries = [
    'Professional Services',
    'Finance & Insurance',
    'Home Services',
    'Real Estate & Construction',
    'Healthcare & Wellness',
    'Education & Training',
    'Technology & Software',
    'Retail & E-Commerce',
    'Manufacturing & Industrial',
    'Hospitality, Food & Travel',
    'Media, Marketing & Creative',
    'Nonprofit & Social Enterprise',
    'Transportation & Automotive',
    'Energy & Utilities'
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setIsLoading(true)
    
    try {
      // Validate password length
      if (formData.password.length < 6) {
        throw new Error('Password must be at least 6 characters')
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          businessName: formData.company,
          industry: formData.industry,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle validation errors
        if (data.errors && Array.isArray(data.errors)) {
          const errorMessages = data.errors.map((err: any) => err.msg || err.message).join(', ')
          throw new Error(errorMessages)
        }
        throw new Error(data.error || 'Registration failed')
      }

      // Don't store token if verification is required
      if (data.requiresVerification) {
        setSuccess(true)
        setError(null)
        setIsLoading(false) // Stop loading state
        // Show success message and stay on page
        return
      }

      // Store token (for backward compatibility if verification is disabled)
      if (data.token) {
        setAuthToken(data.token, true) // Remember signup users
      }

      // Store user data
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
      }

      setSuccess(true)
      
      // Navigate to login page after a brief success message
      setTimeout(() => {
        navigate('/login')
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration')
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
    <div className="auth-page signup-page">
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

      {/* Right Panel - Signup Form */}
      <div className="auth-form-panel">
        <div className="form-container signup-container">
          {/* Form Header */}
          <div className="form-header">
            <div className="signup-logo-mobile">
              <img 
                src={theme === 'dark' ? '/lightlogo.png' : '/draft (1).png'} 
                alt="10XCoach.ai" 
                className="signup-logo-img"
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

          {/* Success Message */}
          {success && (
            <div className="auth-success">
              <CheckCircle size={18} />
              <span>
                Account created successfully! Please check your email to verify your account before logging in.
              </span>
            </div>
          )}

          {/* Signup Form */}
          <form onSubmit={handleSubmit} className="auth-form">
            {/* Name Field */}
            <div className="form-group">
              <label htmlFor="name" className="form-label">Name</label>
              <div className="input-wrapper">
                <User size={18} className="input-icon" />
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="John Smith"
                  className="form-input"
                  required
                />
                <div className="input-glow"></div>
              </div>
            </div>

            {/* Email Field */}
            <div className="form-group">
              <label htmlFor="email" className="form-label">Email</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="hello@company.com"
                  className="form-input"
                  required
                />
                <div className="input-glow"></div>
              </div>
            </div>

            {/* Company Field */}
            <div className="form-group">
              <label htmlFor="company" className="form-label">Company</label>
              <div className="input-wrapper">
                <Building2 size={18} className="input-icon" />
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Your Company Inc."
                  className="form-input"
                  required
                />
                <div className="input-glow"></div>
              </div>
            </div>

            {/* Industry Field */}
            <div className="form-group">
              <label htmlFor="industry" className="form-label">Industry</label>
              <div className="input-wrapper select-wrapper">
                <Briefcase size={18} className="input-icon" />
                <select
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="form-input form-select"
                  required
                >
                  <option value="">Select your industry</option>
                  {industries.map((industry, index) => (
                    <option key={index} value={industry}>{industry}</option>
                  ))}
                </select>
                <ChevronDown size={18} className="select-arrow" />
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
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
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

            {/* CTA Text */}
            <div className="cta-text">
              <h3>Ready to <span className="highlight">10</span><span className="highlight-x">X</span> Your Team?</h3>
              <p>Create your account to get started.</p>
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
                    Create an Account
                    <ArrowRight size={20} />
                  </>
                )}
              </span>
              <div className="btn-shine"></div>
            </button>

            {/* Google Sign Up */}
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

          {/* Login Link */}
          <div className="auth-switch">
            <span>Already have an account?</span>
            <Link to="/login" className="switch-link">Log in</Link>
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

export default Signup

