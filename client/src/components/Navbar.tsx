import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Sun, Moon, User, Settings, LogOut, LayoutDashboard, Shield } from 'lucide-react'
import { isAuthenticated, clearAuthToken } from '../utils/api'
import './Navbar.css'

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [userName, setUserName] = useState<string>('')
  const [userRole, setUserRole] = useState<string>('')
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme') as 'dark' | 'light'
    return saved || 'dark'
  })

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const prevPathnameRef = useRef(location.pathname)

  useEffect(() => {
    setIsMobileMenuOpen(false)
    // Scroll to top when navigating TO the landing page from another route
    if (location.pathname === '/' && prevPathnameRef.current !== '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    prevPathnameRef.current = location.pathname
  }, [location])

  // Apply theme to document and save to localStorage
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Listen for storage changes from other tabs/pages
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue) {
        setTheme(e.newValue as 'dark' | 'light')
      }
      // Check auth state changes
      if (e.key === 'token' || e.key === 'user') {
        checkAuthState()
      }
    }
    
    // Listen for custom auth change events (from same tab)
    const handleAuthChange = () => {
      checkAuthState()
    }
    
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('authStateChanged', handleAuthChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('authStateChanged', handleAuthChange)
    }
  }, [])

  // Check authentication state
  const checkAuthState = () => {
    const authenticated = isAuthenticated()
    setIsLoggedIn(authenticated)
    
    if (authenticated) {
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
      if (userStr) {
        try {
          const user = JSON.parse(userStr)
          setUserName(user.name || 'User')
          setUserRole((user.role || 'USER').toUpperCase())
        } catch (error) {
          setUserName('User')
          setUserRole('USER')
        }
      }
    } else {
      setUserName('')
      setUserRole('')
    }
  }

  // Check auth state on mount and when location changes
  useEffect(() => {
    checkAuthState()
  }, [location])

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false)
      }
    }

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [profileDropdownOpen])

  const handleSignOut = () => {
    clearAuthToken()
    localStorage.removeItem('user')
    sessionStorage.removeItem('user')
    // Clear notification flags so they show again on next login
    sessionStorage.removeItem('welcomeNotificationShown')
    sessionStorage.removeItem('welcomeNotificationShownAdmin')
    sessionStorage.removeItem('loginTime')
    setProfileDropdownOpen(false)
    setIsLoggedIn(false)
    setUserName('')
    setUserRole('')
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('authStateChanged'))
    navigate('/')
  }

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLogoClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/') {
      e.preventDefault()
      scrollToTop()
    }
  }

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.pathname === '/') {
      e.preventDefault()
      scrollToTop()
    }
  }

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/ai-coaches', label: 'AI Coaches' },
    { path: '/business', label: 'Business' },
    { path: '/blog', label: 'Blog' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/contact', label: 'Contact' },
  ]

  return (
    <nav className={`navbar ${isScrolled ? 'scrolled' : ''} ${theme}`} data-theme={theme}>
      <div className="navbar-container">
        <Link to="/" className="navbar-logo" onClick={handleLogoClick}>
          <img 
            src={theme === 'dark' ? '/lightlogo.png' : '/draft (1).png'} 
            alt="10XCoach.ai" 
            className="navbar-logo-img"
          />
        </Link>

        <div className={`navbar-links ${isMobileMenuOpen ? 'open' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={link.path === '/' ? handleHomeClick : undefined}
            >
              <span className="link-text">{link.label}</span>
              <span className="link-indicator"></span>
            </Link>
          ))}
        </div>

        <div className="navbar-actions">
          {/* Theme Toggle Button */}
          <button 
            className="navbar-theme-toggle" 
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          {isLoggedIn ? (
            <div 
              className={`navbar-profile-container ${profileDropdownOpen ? 'profile-open' : ''}`}
              ref={profileDropdownRef}
            >
              <button 
                className="navbar-profile-btn"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                aria-label="Profile"
                aria-expanded={profileDropdownOpen}
              >
                <div className="navbar-profile-avatar">
                  <span className="navbar-profile-initial">
                    {userName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="navbar-profile-info">
                  <span className="navbar-user-name">{userName}</span>
                  {userRole === 'ADMIN' && (
                    <span className="navbar-user-badge">Admin</span>
                  )}
                </div>
                <div className="navbar-profile-arrow">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </button>
              {profileDropdownOpen && (
                <div className="navbar-profile-dropdown">
                  <button 
                    className="navbar-profile-dropdown-item"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      navigate('/dashboard')
                    }}
                  >
                    <LayoutDashboard size={16} />
                    <span>Dashboard</span>
                  </button>
                  {(userRole === 'ADMIN' || userName.toLowerCase().includes('daniel') || localStorage.getItem('user')?.includes('danrosario0604@gmail.com')) && (
                    <button 
                      className="navbar-profile-dropdown-item"
                      onClick={() => {
                        setProfileDropdownOpen(false)
                        navigate('/admin')
                      }}
                    >
                      <Shield size={16} />
                      <span>Admin</span>
                    </button>
                  )}
                  <button 
                    className="navbar-profile-dropdown-item"
                    onClick={() => {
                      setProfileDropdownOpen(false)
                      // Navigate to settings page when implemented
                      // navigate('/settings')
                    }}
                  >
                    <Settings size={16} />
                    <span>Settings</span>
                  </button>
                  <button 
                    className="navbar-profile-dropdown-item"
                    onClick={handleSignOut}
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="navbar-login-btn">
                Login
              </Link>
              <Link to="/signup" className="navbar-cta-btn">
                <span>Get Started</span>
                <div className="btn-shine"></div>
              </Link>
            </>
          )}
        </div>

        <button 
          className="navbar-mobile-toggle"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          <span className={`hamburger ${isMobileMenuOpen ? 'open' : ''}`}>
            <span></span>
            <span></span>
            <span></span>
          </span>
        </button>
      </div>

      {/* Mobile Menu */}
      <div className={`navbar-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="mobile-menu-content">
          {navLinks.map((link, index) => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-mobile-link ${location.pathname === link.path ? 'active' : ''}`}
              style={{ '--delay': `${index * 0.05}s` } as React.CSSProperties}
              onClick={link.path === '/' ? handleHomeClick : undefined}
            >
              {link.label}
            </Link>
          ))}
          <div className="navbar-mobile-actions">
            {/* Mobile Theme Toggle */}
            <button 
              className="navbar-mobile-theme-toggle" 
              onClick={toggleTheme}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            {isLoggedIn ? (
              <>
                <div className="navbar-mobile-profile">
                  <User size={20} />
                  <span>{userName}</span>
                </div>
                <button 
                  className="navbar-mobile-signout"
                  onClick={handleSignOut}
                >
                  <LogOut size={20} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="navbar-mobile-login">Login</Link>
                <Link to="/signup" className="navbar-mobile-cta">Get Started</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navbar
