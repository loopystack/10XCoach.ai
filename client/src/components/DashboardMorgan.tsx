import { useState } from 'react'
import { Play, X, Bot, ExternalLink } from 'lucide-react'
import './DashboardMorgan.css'

// LOOM video URL - Replace with actual LOOM video URL (should be the share URL, not embed URL)
const LOOM_VIDEO_URL = import.meta.env.VITE_LOOM_ONBOARDING_URL || 'https://www.loom.com/share/YOUR_VIDEO_ID'

interface DashboardMorganProps {
  className?: string
}

const DashboardMorgan = ({ className = '' }: DashboardMorganProps) => {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <div className={`dashboard-morgan-card ${className}`}>
        <div className="morgan-avatar-container">
          <div className="morgan-avatar">
            <img 
              src="/avatars/Morgan.png" 
              alt="Morgan" 
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.style.display = 'none'
              }}
            />
            <div className="morgan-avatar-fallback">
              <Bot size={32} />
            </div>
          </div>
          <div className="morgan-pulse"></div>
        </div>
        
        <div className="morgan-content">
          <h3>Morgan, Your AI Chief of Staff</h3>
          <p>Your personal guide to 10XCoach.ai</p>
          <p className="morgan-description">
            Get started with our 10-minute onboarding narrated by Morgan. Learn how to maximize your coaching experience and achieve 10X results.
          </p>
          <button 
            className="morgan-watch-btn"
            onClick={() => {
              // Open LOOM video in a new tab since iframe embedding is blocked
              if (LOOM_VIDEO_URL && LOOM_VIDEO_URL.includes('loom.com')) {
                window.open(LOOM_VIDEO_URL, '_blank', 'noopener,noreferrer')
              } else {
                // Show modal with instructions if URL is not set
                setShowModal(true)
              }
            }}
          >
            <Play size={18} />
            <span>Watch 10X Onboarding</span>
          </button>
        </div>
      </div>

      {showModal && (
        <div className="morgan-video-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="morgan-video-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="morgan-video-header">
              <h2>10X Onboarding with Morgan</h2>
              <button
                className="morgan-video-close"
                onClick={() => setShowModal(false)}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            <div className="morgan-video-container" style={{ padding: '40px', textAlign: 'center' }}>
              {LOOM_VIDEO_URL && !LOOM_VIDEO_URL.includes('YOUR_VIDEO_ID') ? (
                <div>
                  <p style={{ marginBottom: '20px', fontSize: '16px', color: '#666' }}>
                    The onboarding video will open in a new tab.
                  </p>
                  <button
                    className="morgan-watch-btn"
                    onClick={() => {
                      window.open(LOOM_VIDEO_URL, '_blank', 'noopener,noreferrer')
                      setShowModal(false)
                    }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                  >
                    <ExternalLink size={18} />
                    <span>Open Video in New Tab</span>
                  </button>
                </div>
              ) : (
                <div>
                  <Bot size={48} style={{ marginBottom: '20px', opacity: 0.5, color: '#999' }} />
                  <p style={{ marginBottom: '10px', fontSize: '18px', fontWeight: 600, color: '#333' }}>
                    Video URL Not Configured
                  </p>
                  <p style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                    Please set the <code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>VITE_LOOM_ONBOARDING_URL</code> environment variable with your LOOM video share URL.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DashboardMorgan

