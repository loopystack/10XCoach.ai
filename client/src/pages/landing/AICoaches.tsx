import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, MessageSquare, Brain, Sparkles, Zap, Target, TrendingUp, Users, Award, Rocket, CheckCircle2 } from 'lucide-react'
import Navbar from '../../components/Navbar'
import MagicalCursor from '../../components/MagicalCursor'
import '../Landing.css'
import './LandingPages.css'
import './AICoaches.css'

interface Coach {
  id: number
  name: string
  email: string
  specialty: string
  description: string
  tagline: string
  avatar: string
}

const AICoaches = () => {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetch('/api/coaches')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setCoaches(data)
          setSelectedCoach(data[0])
        }
      })
      .catch(() => {
        // Fallback data
        const fallbackCoaches = [
          { id: 1, name: 'Alan Wozniak', email: 'alan@10xcoach.ai', specialty: 'Business Strategy & Problem-Solving Coach', description: 'Confident visionary strategist bringing sharp clarity, decisive action steps, and uplifting intensity.', tagline: "Let's think bigger and move faster—with focus.", avatar: '/avatars/Alan-Wozniak-CEC.jpg' },
          { id: 2, name: 'Rob Mercer', email: 'rob@10xcoach.ai', specialty: 'Sales Coach', description: 'Charismatic closer—smooth, gritty, high-confidence. Turns objections into opportunities.', tagline: 'Turn problems into conversions.', avatar: '/avatars/Robertini-Rob-Mercer.jpg' },
          { id: 3, name: 'Teresa Lane', email: 'teresa@10xcoach.ai', specialty: 'Marketing Coach', description: 'Persuasive, feminine creative who makes brands irresistible. Elegant, high-emotion, and deeply intuitive.', tagline: "Let's make your message magnetic.", avatar: '/avatars/Teresa-Lane.jpg' },
          { id: 4, name: 'Camille Quinn', email: 'camille@10xcoach.ai', specialty: 'Customer Experience (CX) Coach', description: 'Luxury experience architect—poised, warm, and emotionally attuned. Builds brands people fall in love with.', tagline: 'Every touchpoint should feel unforgettable.', avatar: '/avatars/Camille-Quinn.jpg' },
          { id: 5, name: 'Jeffrey Wells', email: 'jeffrey@10xcoach.ai', specialty: 'Operations Coach', description: 'Tactical powerhouse—disciplined, structured, and efficiency-driven. Makes complexity feel simple.', tagline: 'We build businesses that run without you.', avatar: '/avatars/Jeffrey-Wells.jpg' },
          { id: 6, name: 'Chelsea Fox', email: 'chelsea@10xcoach.ai', specialty: 'Culture / HR Coach', description: 'Blends feminine authority with compassion. Helps leaders grow, teams align, and cultures evolve with purpose.', tagline: "Culture isn't what you say—it's what you build.", avatar: '/avatars/Chelsea-Fox.jpg' },
          { id: 7, name: 'Hudson Jaxon', email: 'hudson@10xcoach.ai', specialty: 'Finance Coach', description: 'Boardroom presence—sharp, intentional, and investor-minded. Sees numbers like a strategist sees a chessboard.', tagline: 'Profit is power.', avatar: '/avatars/Hudson-Jaxson.jpg' },
          { id: 8, name: 'Tanner Chase', email: 'tanner@10xcoach.ai', specialty: 'Business Value & BIG EXIT Coach', description: 'Calm, authoritative, and future-focused. Speaks like a seasoned M&A advisor building legacy-level companies.', tagline: "We don't just grow companies—we build buyable ones.", avatar: '/avatars/Tanner-Chase.jpg' }
        ]
        setCoaches(fallbackCoaches)
        setSelectedCoach(fallbackCoaches[0])
      })
  }, [])

  const getCoachColor = (index: number) => {
    const colors = ['#00d4ff', '#7c3aed', '#ff006e', '#00d4ff', '#7c3aed', '#ff006e', '#00d4ff', '#7c3aed']
    return colors[index % colors.length]
  }

  const getCoachIcon = (specialty: string) => {
    if (specialty.includes('Strategy') || specialty.includes('Problem')) return <Target size={24} />
    if (specialty.includes('Sales')) return <TrendingUp size={24} />
    if (specialty.includes('Marketing')) return <Zap size={24} />
    if (specialty.includes('Customer') || specialty.includes('CX')) return <Users size={24} />
    if (specialty.includes('Operations')) return <Rocket size={24} />
    if (specialty.includes('Culture') || specialty.includes('HR')) return <Award size={24} />
    if (specialty.includes('Finance')) return <TrendingUp size={24} />
    if (specialty.includes('EXIT') || specialty.includes('Value')) return <Award size={24} />
    return <Brain size={24} />
  }

  return (
    <div className="landing-page ai-coaches-page-compact">
      <MagicalCursor />
      <Navbar />
      
      {/* Compact Hero Header */}
      <section className="ai-coaches-hero-compact">
        <div className="hero-bg-compact">
          <div className="hero-orb-compact orb-1"></div>
          <div className="hero-orb-compact orb-2"></div>
        </div>
        <div className="hero-content-compact">
          <div className="hero-badge-compact">
            <Brain size={14} />
            <span>AI Advisory Board</span>
          </div>
          <h1 className="hero-title-compact">
            Meet Your <span className="gradient-text-animated">Elite AI Coaches</span>
          </h1>
          <div className="hero-stats-compact">
            <div className="stat-compact">
              <span className="stat-num">8</span>
              <span className="stat-text">Coaches</span>
            </div>
            <div className="stat-compact">
              <span className="stat-num">24/7</span>
              <span className="stat-text">Available</span>
            </div>
            <div className="stat-compact">
              <span className="stat-num">∞</span>
              <span className="stat-text">Unlimited</span>
            </div>
          </div>
        </div>
      </section>

      {/* Compact Main Content - Side by Side */}
      <section className="coaches-main-compact">
        <div className="main-container-compact">
          {/* Left: Coach Cards Grid */}
          <div className="coaches-grid-compact">
            <div className="grid-header-compact">
              <h2 className="grid-title-compact">Choose Your Coach</h2>
            </div>
            <div className="coaches-cards-compact">
              {coaches.map((coach, index) => {
                const isSelected = selectedCoach?.id === coach.id
                const coachColor = getCoachColor(index)
                
                return (
                  <div
                    key={coach.id}
                    className={`coach-card-compact ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedCoach(coach)}
                    style={{
                      '--coach-color': coachColor,
                      '--index': index
                    } as React.CSSProperties}
                  >
                    <div className="card-glow-compact"></div>
                    <div className="card-content-compact">
                      <div className="coach-avatar-compact">
                        <div className="avatar-glow-compact"></div>
                        {!imageErrors.has(coach.id) ? (
                          <img 
                            src={coach.avatar} 
                            alt={coach.name}
                            onError={() => {
                              setImageErrors(prev => new Set(prev).add(coach.id))
                            }}
                          />
                        ) : null}
                        {imageErrors.has(coach.id) && (
                          <div className="avatar-fallback-compact">
                            {coach.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                        <div className="avatar-icon-compact">
                          {getCoachIcon(coach.specialty)}
                        </div>
                      </div>
                      <div className="coach-info-compact">
                        <h3 className="coach-name-compact">{coach.name}</h3>
                        <p className="coach-specialty-compact">{coach.specialty}</p>
                      </div>
                      {isSelected && (
                        <div className="selected-badge-compact">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Coach Detail Panel */}
          {selectedCoach && (
            <div className="coach-detail-wrapper-compact" key={selectedCoach.id}>
              <div className="detail-header-section-compact">
                <h2 className="detail-header-title-compact">Information</h2>
              </div>
              
              <div className="coach-detail-compact">
                <div className="detail-header-compact">
                <div className="detail-avatar-compact">
                  <div className="detail-avatar-glow"></div>
                  {!imageErrors.has(selectedCoach.id) ? (
                    <img 
                      src={selectedCoach.avatar} 
                      alt={selectedCoach.name}
                      onError={() => {
                        setImageErrors(prev => new Set(prev).add(selectedCoach.id))
                      }}
                    />
                  ) : null}
                  {imageErrors.has(selectedCoach.id) && (
                    <div className="detail-avatar-fallback-compact">
                      {selectedCoach.name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  <div className="detail-icon-compact">
                    {getCoachIcon(selectedCoach.specialty)}
                  </div>
                </div>
                <div className="detail-title-compact">
                  <h2 className="detail-name-compact">{selectedCoach.name}</h2>
                  <p className="detail-specialty-compact">{selectedCoach.specialty}</p>
                </div>
              </div>
              
              <div className="detail-body-compact">
                <div className="tagline-compact">
                  <Sparkles size={16} />
                  <span>"{selectedCoach.tagline}"</span>
                </div>
                
                <p className="description-compact">{selectedCoach.description}</p>
                
                <div className="capabilities-compact">
                  <div className="capability-compact">
                    <CheckCircle2 size={14} />
                    <span>Strategic Planning</span>
                  </div>
                  <div className="capability-compact">
                    <CheckCircle2 size={14} />
                    <span>Problem Solving</span>
                  </div>
                  <div className="capability-compact">
                    <CheckCircle2 size={14} />
                    <span>Goal Setting</span>
                  </div>
                  <div className="capability-compact">
                    <CheckCircle2 size={14} />
                    <span>Action Steps</span>
                  </div>
                  <div className="capability-compact">
                    <CheckCircle2 size={14} />
                    <span>Accountability</span>
                  </div>
                  <div className="capability-compact">
                    <CheckCircle2 size={14} />
                    <span>24/7 Support</span>
                  </div>
                </div>
                
                <Link to="/app" className="start-btn-compact">
                  <MessageSquare size={18} />
                  <span>Start with {selectedCoach.name.split(' ')[0]}</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

export default AICoaches

