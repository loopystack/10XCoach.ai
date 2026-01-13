import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  FileText,
  UsersRound,
  StickyNote,
  CheckSquare,
  ListTodo,
  BookOpen,
  HelpCircle,
  Menu,
  X,
  Sun,
  Moon,
  History as HistoryIcon,
  User,
  Home,
  Shield,
  LogOut,
  CreditCard
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import './DashboardLayout.css'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false)
  const profileDropdownRef = useRef<HTMLDivElement>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const { theme, toggleTheme } = useTheme()

  // Handle responsive sidebar behavior
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (mobile) {
        setSidebarOpen(false)
      } else {
        setSidebarOpen(true)
      }
    }

    // Set initial state
    checkMobile()

    // Listen for resize events
    window.addEventListener('resize', checkMobile)

    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [location, isMobile])

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

    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [profileDropdownOpen])

  const handleSignOut = () => {
    // Clear all auth data
    localStorage.removeItem('token')
    sessionStorage.removeItem('token')
    // Redirect to login
    navigate('/login')
  }
  const menuItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/scorecard', icon: FileText, label: '10X Scorecard' },
    { path: '/coaches', icon: Users, label: '10X Coaches' },
    { path: '/sessions', icon: HistoryIcon, label: 'My Sessions' },
    { path: '/quizzes', icon: FileText, label: '10X Business Quiz' },
    { path: '/huddles', icon: UsersRound, label: '10-Minute Huddles' },
    { path: '/notes', icon: StickyNote, label: '10X Coach Notetaking' },
    { path: '/action-steps', icon: CheckSquare, label: '10X Action Framework' },
    { path: '/todos', icon: ListTodo, label: '10X TO DO Lists' },
    { path: '/knowledge-center', icon: BookOpen, label: '10X Knowledge Center' },
    { path: '/discovery-questions', icon: HelpCircle, label: '10X Discovery Questions' },
    { path: '/plans', icon: CreditCard, label: 'My Plans' },
  ]

  return (
    <div className="dashboard-layout">
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
      
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <Link to="/dashboard" className="logo-link">
            <img 
              src={theme === 'dark' ? '/lightlogo.png' : '/draft (1).png'} 
              alt="10XCoach.ai" 
              className="logo-img"
            />
            {sidebarOpen && (
              <>
                <span className="logo-label">Dashboard</span>
                <img 
                  src={theme === 'dark' ? '/10X-BOS Logodark.png' : '/10X-BOS Logolight.png'} 
                  alt="10X-BOS" 
                  className="logo-bos"
                />
              </>
            )}
          </Link>
          <button 
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  // Close sidebar on mobile after navigation
                  if (isMobile) {
                    setSidebarOpen(false)
                  }
                }}
              >
                <Icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          <button
            className="nav-item theme-toggle-sidebar"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            {sidebarOpen && <span>Toggle Theme</span>}
          </button>
          <div className="profile-dropdown-container" ref={profileDropdownRef}>
            <button
              className="nav-item profile-button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              title="Profile"
            >
              <User size={20} />
              {sidebarOpen && <span>Profile</span>}
            </button>
            {profileDropdownOpen && (
              <div className="profile-dropdown">
                <button
                  className="profile-dropdown-item"
                  onClick={() => {
                    setProfileDropdownOpen(false)
                    navigate('/')
                  }}
                >
                  <Home size={16} />
                  <span>Homepage</span>
                </button>
                <button
                  className="profile-dropdown-item"
                  onClick={() => {
                    setProfileDropdownOpen(false)
                    navigate('/admin')
                  }}
                >
                  <Shield size={16} />
                  <span>Admin Panel</span>
                </button>
                <button
                  className="profile-dropdown-item"
                  onClick={handleSignOut}
                >
                  <LogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
      {/* Mobile menu button - always visible when sidebar is closed on mobile */}
      {isMobile && !sidebarOpen && (
        <button 
          className="mobile-menu-button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      )}
      
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default DashboardLayout

