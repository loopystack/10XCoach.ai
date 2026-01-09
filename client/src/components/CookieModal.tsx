import { useState, useEffect } from 'react'
import { Cookie, X, Loader2 } from 'lucide-react'
import './CookieModal.css'

const CookieModal = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [loading, setLoading] = useState<'accept' | 'decline' | 'notnow' | null>(null)

  useEffect(() => {
    // Check if user has already accepted cookies
    const cookieAccepted = localStorage.getItem('cookiesAccepted')
    if (!cookieAccepted) {
      // Show modal after a short delay for better UX
      const timer = setTimeout(() => {
        setIsVisible(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAction = async (action: 'accept' | 'decline' | 'notnow') => {
    setLoading(action)
    
    // Simulate a brief loading effect for professional look
    await new Promise(resolve => setTimeout(resolve, 800))
    
    if (action === 'accept') {
      // Store acceptance in localStorage
      localStorage.setItem('cookiesAccepted', 'true')
      // Also set a cookie for server-side if needed
      document.cookie = 'cookiesAccepted=true; path=/; max-age=31536000' // 1 year
    } else if (action === 'decline') {
      // Store decline preference
      localStorage.setItem('cookiesAccepted', 'false')
      document.cookie = 'cookiesAccepted=false; path=/; max-age=31536000' // 1 year
    } else if (action === 'notnow') {
      // Just close the modal, don't store preference
      // It will show again on next visit
    }
    
    setIsVisible(false)
    setLoading(null)
  }

  const handleClose = () => {
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="cookie-modal-overlay">
      <div className="cookie-modal">
        <button 
          className="cookie-modal-close"
          onClick={handleClose}
          aria-label="Close cookie modal"
        >
          <X size={18} />
        </button>
        <div className="cookie-modal-icon">
          <Cookie size={24} />
        </div>
        <div className="cookie-modal-content">
          <h3 className="cookie-modal-title">We use cookies</h3>
          <p className="cookie-modal-text">
            We use cookies to enhance your browsing experience and analyze our traffic. 
            By clicking "Accept", you consent to our use of cookies.
          </p>
        </div>
        <div className="cookie-modal-buttons">
          <button 
            className="cookie-modal-button cookie-modal-accept"
            onClick={() => handleAction('accept')}
            disabled={loading !== null}
          >
            {loading === 'accept' ? (
              <>
                <Loader2 size={16} className="button-loader" />
                <span>Accepting...</span>
              </>
            ) : (
              'Accept'
            )}
          </button>
          <button 
            className="cookie-modal-button cookie-modal-decline"
            onClick={() => handleAction('decline')}
            disabled={loading !== null}
          >
            {loading === 'decline' ? (
              <>
                <Loader2 size={16} className="button-loader" />
                <span>Declining...</span>
              </>
            ) : (
              'Decline'
            )}
          </button>
          <button 
            className="cookie-modal-button cookie-modal-notnow"
            onClick={() => handleAction('notnow')}
            disabled={loading !== null}
          >
            {loading === 'notnow' ? (
              <>
                <Loader2 size={16} className="button-loader" />
                <span>Processing...</span>
              </>
            ) : (
              'Not Now'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default CookieModal

