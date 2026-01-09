import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Users, 
  GraduationCap,
  FileText,
  MessageSquare,
  BarChart3,
  Mail,
  Settings,
  UsersRound,
  Menu,
  X,
  LogOut,
  Sun,
  Moon,
  User,
  Home
} from 'lucide-react'
import { useTheme } from '../contexts/ThemeContext'
import { clearAuthToken } from '../utils/api'
import './AdminLayout.css'

interface AdminLayoutProps {
  children: React.ReactNode
}

const AdminLayout = ({ children }: AdminLayoutProps) => {
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
    
    checkMobile()
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
    // Dispatch custom event to notify navbar
    window.dispatchEvent(new CustomEvent('authStateChanged'))
    navigate('/')
  }

  const [userRole, setUserRole] = useState<string>('USER')

  useEffect(() => {
    // Get current user role
    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user')
    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        const role = (user.role || 'USER').toUpperCase()
        const userEmail = (user.email || '').toLowerCase()
        // Daniel Rosario is always super admin
        if (userEmail === 'danrosario0604@gmail.com') {
          setUserRole('SUPER_ADMIN')
        } else {
          setUserRole(role)
        }
      } catch (e) {
        console.error('Error parsing user data:', e)
      }
    }
  }, [])

  // Define all menu items with their required roles
  const allMenuItems = [
    { path: '/admin', icon: LayoutDashboard, label: 'Overview', roles: ['SUPER_ADMIN', 'COACH_ADMIN', 'ADMIN'] },
    { path: '/admin/users', icon: Users, label: 'Users & Subscriptions', roles: ['SUPER_ADMIN'] },
    { path: '/admin/plans', icon: FileText, label: 'Plans', roles: ['SUPER_ADMIN'] },
    { path: '/admin/coaches', icon: GraduationCap, label: 'Coaches & Knowledge', roles: ['SUPER_ADMIN', 'COACH_ADMIN', 'ADMIN'] },
    { path: '/admin/quizzes', icon: FileText, label: 'Quizzes & Diagnostics', roles: ['SUPER_ADMIN', 'COACH_ADMIN', 'ADMIN'] },
    { path: '/admin/sessions', icon: MessageSquare, label: 'Sessions & Notes', roles: ['SUPER_ADMIN', 'COACH_ADMIN', 'ADMIN'] },
    { path: '/admin/analytics', icon: BarChart3, label: 'Analytics & KPIs', roles: ['SUPER_ADMIN'] },
    { path: '/admin/emails', icon: Mail, label: 'Email & Follow-ups', roles: ['SUPER_ADMIN'] },
    { path: '/admin/system', icon: Settings, label: 'Settings', roles: ['SUPER_ADMIN'] },
    { path: '/admin/huddles', icon: UsersRound, label: 'Ops - Huddles', roles: ['SUPER_ADMIN', 'COACH_ADMIN', 'ADMIN'] },
  ]

  // Filter menu items based on user role
  const menuItems = allMenuItems.filter(item => {
    return item.roles.includes(userRole)
  })

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close sidebar"
        />
      )}
      
      {/* Mobile menu button */}
      {isMobile && !sidebarOpen && (
        <button 
          className="admin-mobile-menu-button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={24} />
        </button>
      )}
      
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="admin-sidebar-header">
          <Link to="/admin" className="admin-logo-link">
            <img 
              src={theme === 'dark' ? '/lightlogo.png' : '/draft (1).png'} 
              alt="10XCoach.ai" 
              className="admin-logo-img"
            />
            {sidebarOpen && <span className="admin-logo-label">Admin Panel</span>}
          </Link>
          <button 
            className="admin-sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        <nav className="admin-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`admin-nav-item ${isActive ? 'active' : ''}`}
                onClick={() => {
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
        <div className="admin-sidebar-footer">
          <button 
            className="admin-nav-item admin-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            {sidebarOpen && <span>Toggle Theme</span>}
          </button>
          <div className="admin-profile-dropdown-container" ref={profileDropdownRef}>
            <button 
              className="admin-nav-item admin-profile-button"
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              title="Profile"
            >
              <User size={20} />
              {sidebarOpen && <span>Profile</span>}
            </button>
            {profileDropdownOpen && (
              <div className="admin-profile-dropdown">
                <button 
                  className="admin-profile-dropdown-item"
                  onClick={() => {
                    setProfileDropdownOpen(false)
                    navigate('/')
                  }}
                >
                  <Home size={16} />
                  <span>Homepage</span>
                </button>
                <button 
                  className="admin-profile-dropdown-item"
                  onClick={() => {
                    setProfileDropdownOpen(false)
                    navigate('/dashboard')
                  }}
                >
                  <LayoutDashboard size={16} />
                  <span>Dashboard</span>
                </button>
                <button 
                  className="admin-profile-dropdown-item"
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
                  className="admin-profile-dropdown-item"
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
      <main className="admin-main-content">
        {children}
      </main>
    </div>
  )
}

export default AdminLayout

