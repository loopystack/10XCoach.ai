import { useState } from 'react'
import { Play, X, Bot } from 'lucide-react'
import './DashboardMorgan.css'

// LOOM video URL - Replace with actual LOOM video URL
const LOOM_VIDEO_URL = process.env.REACT_APP_LOOM_ONBOARDING_URL || 'https://www.loom.com/embed/YOUR_VIDEO_ID'

interface DashboardMorganProps {
  className?: string
}

const DashboardMorgan = ({ className = '' }: DashboardMorganProps) => {
  const [showVideo, setShowVideo] = useState(false)

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
            onClick={() => setShowVideo(true)}
          >
            <Play size={18} />
            <span>Watch 10X Onboarding</span>
          </button>
        </div>
      </div>

      {showVideo && (
        <div className="morgan-video-modal-overlay" onClick={() => setShowVideo(false)}>
          <div className="morgan-video-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="morgan-video-header">
              <h2>10X Onboarding with Morgan</h2>
              <button
                className="morgan-video-close"
                onClick={() => setShowVideo(false)}
                aria-label="Close video"
              >
                <X size={24} />
              </button>
            </div>
            <div className="morgan-video-container">
              <iframe
                src={LOOM_VIDEO_URL}
                frameBorder="0"
                allowFullScreen
                title="10X Onboarding with Morgan"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '12px'
                }}
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default DashboardMorgan

