import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutDashboard, Shield, ArrowRight, Sparkles, Sun, Moon, Home, X } from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import './Homepage.css'

const Homepage = () => {
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()
  const [showWelcomeNotification, setShowWelcomeNotification] = useState(false)
  const [userName, setUserName] = useState<string>('')

  // Check for login and show welcome notification (ONLY for admins)
  useEffect(() => {
    let autoHideTimer: ReturnType<typeof setTimeout> | null = null

    const checkLoginAndShowNotification = () => {
      try {
        const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
        if (userStr) {
          const user = JSON.parse(userStr)
          const userRole = (user.role || 'USER').toUpperCase()
          const userEmail = (user.email || '').toLowerCase()
          
          // Only show notification for admins on this page
          // Check if user is any type of admin (ADMIN, SUPER_ADMIN, COACH_ADMIN)
          const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN' || userRole === 'COACH_ADMIN' || userEmail === 'danrosario0604@gmail.com'
          
          if (isAdmin) {
            const name = user.name || user.email?.split('@')[0] || 'Admin'
            setUserName(name)
            
            // Check if notification was already shown in this session
            const notificationShown = sessionStorage.getItem('welcomeNotificationShownAdmin')
            const loginTime = sessionStorage.getItem('loginTime')
            
            // Show notification if not shown yet
            if (!notificationShown) {
              // Check if login was recent (within last 60 seconds) or if loginTime exists
              const shouldShow = loginTime ? (Date.now() - parseInt(loginTime)) < 60000 : true
              
              if (shouldShow) {
                setShowWelcomeNotification(true)
                sessionStorage.setItem('welcomeNotificationShownAdmin', 'true')
                
                // Auto-hide after 5 seconds
                autoHideTimer = setTimeout(() => {
                  setShowWelcomeNotification(false)
                }, 5000)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error reading user data:', error)
      }
    }

    // Check immediately and also listen for auth state changes
    checkLoginAndShowNotification()
    
    // Listen for auth state changes (e.g., after login)
    const handleAuthChange = () => {
      setTimeout(checkLoginAndShowNotification, 100)
    }
    window.addEventListener('authStateChanged', handleAuthChange)

    return () => {
      window.removeEventListener('authStateChanged', handleAuthChange)
      if (autoHideTimer) {
        clearTimeout(autoHideTimer)
      }
    }
  }, [])

  return (
    <div className="homepage-container">
      {/* Welcome Notification for Admins */}
      {showWelcomeNotification && (
        <div className="welcome-notification">
          <div className="welcome-notification-content">
            <div className="welcome-icon">
              <Sparkles size={20} />
            </div>
            <div className="welcome-text">
              <div className="welcome-title">Welcome back, {userName}! 🎉</div>
              <div className="welcome-message">Login successful!</div>
            </div>
            <button 
              className="welcome-close"
              onClick={() => setShowWelcomeNotification(false)}
              aria-label="Close notification"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      <div className="homepage-background">
        <div className="homepage-background-shape shape-1"></div>
        <div className="homepage-background-shape shape-2"></div>
        <div className="homepage-background-shape shape-3"></div>
      </div>
      
      <div className="homepage-content">
        <div className="homepage-header">
          <div className="homepage-header-top">
            <div className="homepage-logo">
              <img 
                src={theme === 'dark' ? '/lightlogo.png' : '/draft (1).png'} 
                alt="10XCoach.ai" 
                className="homepage-logo-img"
              />
            </div>
            <div className="homepage-header-actions">
              <button 
                className="homepage-button"
                onClick={() => navigate('/')}
                aria-label="Go to homepage"
                title="Go to homepage"
              >
                <Home size={24} />
                <span>Homepage</span>
              </button>
              <button 
                className="theme-toggle-button"
                onClick={toggleTheme}
                aria-label="Toggle theme"
                title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
              >
                {theme === 'light' ? <Moon size={24} /> : <Sun size={24} />}
              </button>
            </div>
          </div>
          <p className="homepage-subtitle">Choose your platform!</p>
        </div>

        <div className="dashboard-options">
          <div 
            className="dashboard-option dashboard-option-primary"
            onClick={() => navigate('/dashboard')}
          >
            <div className="option-icon-wrapper">
              <LayoutDashboard size={48} className="option-icon" />
            </div>
            <div className="option-content">
              <h2 className="option-title">10X Dashboard</h2>
              <p className="option-description">
                Access your personalized coaching dashboard with quizzes, huddles, action steps, and insights from your AI coaches.
              </p>
              <div className="option-features">
                <span className="feature-tag">Business Health Quiz</span>
                <span className="feature-tag">10-Minute Huddles</span>
                <span className="feature-tag">Action Steps</span>
                <span className="feature-tag">AI Coaches</span>
              </div>
            </div>
            <div className="option-arrow">
              <ArrowRight size={24} />
            </div>
          </div>

          <div 
            className="dashboard-option dashboard-option-admin"
            onClick={() => navigate('/admin')}
          >
            <div className="option-icon-wrapper admin-icon">
              <Shield size={48} className="option-icon" />
            </div>
            <div className="option-content">
              <h2 className="option-title">Admin Panel</h2>
              <p className="option-description">
                Manage users, subscriptions, coaches, sessions, analytics, and system configuration. Full administrative control.
              </p>
              <div className="option-features">
                <span className="feature-tag">User Management</span>
                <span className="feature-tag">Analytics & KPIs</span>
                <span className="feature-tag">Coach Configuration</span>
                <span className="feature-tag">System Settings</span>
              </div>
            </div>
            <div className="option-arrow">
              <ArrowRight size={24} />
            </div>
          </div>
        </div>

        <div className="homepage-footer">
          <p className="footer-text">Select a dashboard to continue</p>
        </div>
      </div>
    </div>
  )
}

export default Homepage

