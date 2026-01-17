import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { 
  Sparkles,  
  Target, 
  Zap,
  ArrowRight,
  Check,
  Star,
  BarChart3,
  Shield,
  Play,
  ChevronDown,
  TrendingUp,
  Users,
  Heart,
  Settings,
  DollarSign,
  Rocket,
  BookOpen,
  Compass,
  GraduationCap,
  Trophy
} from 'lucide-react'
import Navbar from '../components/Navbar'
import MagicalCursor from '../components/MagicalCursor'
import CookieModal from '../components/CookieModal'
import MorganChatWidget from '../components/MorganChatWidget'
import QuickTryOut from '../components/QuickTryOut'
import './Landing.css'

const Landing = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isVisible, setIsVisible] = useState(false)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const [activePlanTab, setActivePlanTab] = useState('foundation')
  
  // 3D Carousel State
  const [carouselRotation, setCarouselRotation] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [autoRotate, setAutoRotate] = useState(true)
  const carouselRef = useRef<HTMLDivElement>(null)
  const [showFooterButton, setShowFooterButton] = useState(false)
  const footerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setIsVisible(true)
    // Throttle mouse position updates for cursor glow
    let rafId: number
    const mousePos = { x: 0, y: 0 }
    
    const handleMouseMove = (e: MouseEvent) => {
      mousePos.x = e.clientX
      mousePos.y = e.clientY
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          setMousePosition({ x: mousePos.x, y: mousePos.y })
          rafId = 0
        })
      }
    }
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  // Scroll to footer button visibility
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY
      const windowHeight = window.innerHeight
      const documentHeight = document.documentElement.scrollHeight
      
      // Show button when scrolled down at least 300px and not near the bottom
      const showButton = scrollPosition > 300 && scrollPosition < documentHeight - windowHeight - 100
      setShowFooterButton(showButton)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToFooter = () => {
    footerRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Auto-rotate carousel
  useEffect(() => {
    if (!autoRotate || isDragging) return
    const interval = setInterval(() => {
      setCarouselRotation(prev => prev - 0.3)
    }, 50)
    return () => clearInterval(interval)
  }, [autoRotate, isDragging])

  // Carousel drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setStartX(e.clientX)
    setAutoRotate(false)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return
    const deltaX = e.clientX - startX
    setCarouselRotation(prev => prev + deltaX * 0.5)
    setStartX(e.clientX)
  }

  const handleMouseUp = () => {
    setIsDragging(false)
    setTimeout(() => setAutoRotate(true), 3000)
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true)
    setStartX(e.touches[0].clientX)
    setAutoRotate(false)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    const deltaX = e.touches[0].clientX - startX
    setCarouselRotation(prev => prev + deltaX * 0.5)
    setStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    setTimeout(() => setAutoRotate(true), 3000)
  }

  const coaches = [
    { name: 'Alan Wozniak', role: 'Strategy', avatar: '/avatars/Alan-Wozniak-CEC.jpg', color: '#00d4ff' },
    { name: 'Rob Mercer', role: 'Sales', avatar: '/avatars/Robertini-Rob-Mercer.jpg', color: '#7c3aed' },
    { name: 'Teresa Lane', role: 'Marketing', avatar: '/avatars/Teresa-Lane.jpg', color: '#ff006e' },
    { name: 'Camille Quinn', role: 'CX', avatar: '/avatars/Camille-Quinn.jpg', color: '#00d4ff' },
    { name: 'Jeffrey Wells', role: 'Operations', avatar: '/avatars/Jeffrey-Wells.jpg', color: '#7c3aed' },
    { name: 'Chelsea Fox', role: 'Culture', avatar: '/avatars/Chelsea-Fox.jpg', color: '#ff006e' },
    { name: 'Hudson Jaxon', role: 'Finance', avatar: '/avatars/Hudson-Jaxson.jpg', color: '#00d4ff' },
    { name: 'Tanner Chase', role: 'Exit Strategy', avatar: '/avatars/Tanner-Chase.jpg', color: '#7c3aed' },
  ]

  const pillars = [
    {
      icon: Target,
      title: 'Business Strategy & Problem Solving',
      description: 'Align your mission and market fit. Solve problems before they cost you momentum.',
      gradient: 'linear-gradient(135deg, #00d4ff, #0099cc)'
    },
    {
      icon: TrendingUp,
      title: 'Sales',
      description: 'Build repeatable, scalable sales processes. Practice in AI-powered simulations. Close with confidence.',
      gradient: 'linear-gradient(135deg, #7c3aed, #5b21b6)'
    },
    {
      icon: BarChart3,
      title: 'Marketing',
      description: 'Learn to position, target, and attract with data-backed campaigns that align with customer intent.',
      gradient: 'linear-gradient(135deg, #ff006e, #cc0058)'
    },
    {
      icon: Heart,
      title: 'Customer Centricity',
      description: 'Design every experience around the customer. Turn satisfaction into loyalty, and loyalty into referrals.',
      gradient: 'linear-gradient(135deg, #10b981, #059669)'
    },
    {
      icon: Settings,
      title: 'Operations',
      description: 'Optimize internal processes. Streamline workflows. Boost productivity and reduce cost.',
      gradient: 'linear-gradient(135deg, #f59e0b, #d97706)'
    },
    {
      icon: Users,
      title: 'Culture',
      description: 'Create a values-driven team. Foster engagement, innovation, and collaboration across departments.',
      gradient: 'linear-gradient(135deg, #6366f1, #4f46e5)'
    },
    {
      icon: DollarSign,
      title: 'Finances',
      description: 'Master financial planning, KPIs, and strategic investment with guided fiscal modeling and risk management.',
      gradient: 'linear-gradient(135deg, #14b8a6, #0d9488)'
    },
    {
      icon: Rocket,
      title: 'BIG EXIT Strategy',
      description: "Whether it's succession or acquisition, plan your ultimate exit from Day 1 with our structured roadmap.",
      gradient: 'linear-gradient(135deg, #ec4899, #db2777)'
    }
  ]

  const [pricingPlans, setPricingPlans] = useState([
    {
      name: 'Foundation',
      tagline: 'Solopreneurs, students',
      monthlyPrice: 39,
      yearlyPrice: 29,
      features: [
        'Access to 10 business coach modules',
        'Access to unlimited Business Health Assessments',
        'Written and oral quizzes',
        'Community forum'
      ],
      popular: false,
      cta: 'Start your free trial'
    },
    {
      name: 'Momentum',
      tagline: 'Entrepreneurs, Executives, SMB owners',
      monthlyPrice: 99,
      yearlyPrice: 74,
      features: [
        'ALL Foundation +',
        'Verbal AI exams',
        'Live webinars',
        'AI scoring reports'
      ],
      popular: true,
      cta: 'Start your free trial'
    },
    {
      name: 'Elite/Exit',
      tagline: 'Growth-minded CEOs',
      monthlyPrice: 299,
      yearlyPrice: 224,
      features: [
        'All Momentum features +',
        '1:1 coaching (monthly)',
        'Exit readiness workshop'
      ],
      popular: false,
      cta: 'Start your free trial'
    }
  ])

  useEffect(() => {
    fetch('/api/plans')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const mappedPlans = data.map((plan: any) => ({
            name: plan.name,
            tagline: plan.tier === 'FOUNDATION' 
              ? 'Solopreneurs, students'
              : plan.tier === 'MOMENTUM'
              ? 'Entrepreneurs, Executives, SMB owners'
              : 'Growth-minded CEOs',
            monthlyPrice: plan.price,
            yearlyPrice: plan.yearlyPrice,
            features: plan.featuresJson?.features || [],
            popular: plan.tier === 'MOMENTUM',
            cta: 'Start your free trial'
          }))
          setPricingPlans(mappedPlans)
        }
      })
      .catch(error => {
        console.error('Failed to load plans:', error)
      })
  }, [])

  const planFeatures = [
    { feature: 'Access to 10 Business Coaching modules', foundation: true, momentum: true, elite: true },
    { feature: 'AI text agents', foundation: true, momentum: true, elite: true },
    { feature: 'Written quizzes', foundation: true, momentum: true, elite: true },
    { feature: 'Community forum', foundation: true, momentum: true, elite: true },
    { feature: 'Essentials', foundation: true, momentum: true, elite: true },
    { feature: 'Verbal AI exams', foundation: false, momentum: true, elite: true },
    { feature: 'Live webinars', foundation: false, momentum: true, elite: true },
    { feature: 'AI scoring reports', foundation: false, momentum: true, elite: true },
    { feature: 'All Pro features', foundation: false, momentum: false, elite: true },
    { feature: '1:1 coaching (monthly)', foundation: false, momentum: false, elite: true },
    { feature: 'Exit readiness workshop', foundation: false, momentum: false, elite: true },
  ]

  const planDetails = {
    foundation: {
      title: 'Foundation Plan',
      price: '$39/month',
      ideal: 'Solopreneurs, freelancers, aspiring entrepreneurs, and students.',
      benefits: [
        {
          title: 'Access to 9 Core Modules',
          description: "Covering all eight business health pillars plus the BIG EXIT capstone. Each module includes real-world examples, learning tools, and self-assessments."
        },
        {
          title: 'AI Coaching Agent Q&A',
          description: "Ask questions anytime and receive intelligent, context-aware responses from digital agents trained on Alan Wozniak's framework."
        },
        {
          title: 'Peer-to-Peer Learning Community',
          description: "Engage with a curated online community of fellow learners. Share strategies, ask questions, and get peer support and insights."
        }
      ],
      value: "This plan is perfect if you're just getting started and need flexible, on-demand guidance without the cost of a live coach. It offers the fundamental education you need to build a strong business foundation—at your pace."
    },
    momentum: {
      title: 'Momentum Plan',
      price: '$99/month',
      ideal: 'Entrepreneurs, executives, and growing SMB owners.',
      benefits: [
        {
          title: 'Everything in Foundation',
          description: "All 9 core modules, AI coaching agents, and community access included."
        },
        {
          title: 'Verbal AI Exams',
          description: "Test your knowledge through interactive verbal assessments that simulate real coaching conversations."
        },
        {
          title: 'Live Webinars & AI Scoring',
          description: "Join expert-led sessions and get detailed AI-powered performance reports on your progress."
        }
      ],
      value: "Perfect for entrepreneurs ready to accelerate their learning with advanced AI interactions and real-time feedback on their business mastery."
    },
    elite: {
      title: 'Elite Exit Plan',
      price: '$299/month',
      ideal: 'Growth-minded CEOs preparing for acquisition or succession.',
      benefits: [
        {
          title: 'Everything in Momentum',
          description: "Full access to all modules, AI exams, webinars, and scoring reports."
        },
        {
          title: '1:1 Monthly Coaching',
          description: "Personal sessions with certified business coaches for tailored strategic guidance."
        },
        {
          title: 'Exit Readiness Workshop',
          description: "Exclusive access to structured workshops designed to prepare your business for a successful exit."
        }
      ],
      value: "The ultimate program for CEOs serious about building a business that's ready for acquisition, merger, or succession planning."
    },
    educator: {
      title: 'Educator / Institution Plan',
      price: 'Custom Pricing',
      ideal: 'Universities, colleges, and educational institutions.',
      benefits: [
        {
          title: 'Bulk Student Licensing',
          description: "Special pricing for educational institutions with scalable seat licenses."
        },
        {
          title: 'Curriculum Integration',
          description: "Designed to complement business and entrepreneurship courses with structured learning paths."
        },
        {
          title: 'Instructor Dashboard',
          description: "Track student progress, assignments, and engagement across your institution."
        }
      ],
      value: "Bring world-class AI business coaching to your students and prepare the next generation of entrepreneurs."
    }
  }

  const testimonials = [
    {
      quote: "I've known Alan first as a customer, and later as a friend. From the start, I admired how he ran his business—lean, efficient, and with a strong team spirit that stood out. For years, I wondered what his 'secret sauce' was. Reading The Big Exit felt like finally getting those answers, straight from him. The book is written in such a clear and personal way that it feels like Alan is sitting across the table, sharing his journey. It's not just theory—it's practical wisdom drawn from someone who has built and led a company the right way. If you're an entrepreneur or business leader looking to scale, this book is a must-read. Inspiring, authentic, and highly actionable.",
      author: "Ram Chellamuthu",
      role: "President, REVON",
      avatar: "RC",
      rating: 5,
      metric: "Practical Wisdom"
    },
    {
      quote: "This inspirational book is built on the proven systems Alan Wozniak used to create value and achieve a successful exit. He makes the process straightforward by breaking it into simple, actionable steps any business owner can follow.",
      author: "David Bennett",
      role: "President, Unify Financial",
      avatar: "DB",
      rating: 5,
      metric: "Wisdom Rooted in Experience"
    },
    {
      quote: "A must-read for entrepreneurs seeking a strategic and profitable exit—clear, actionable, and refreshingly honest. 'The Small Business Big Exit' delivers real-world insights that demystify the process and empower owners to plan with confidence. Brilliantly written and packed with value from start to finish.",
      author: "Dr. Rajiv Sahay",
      role: "President, Sahay Scientific",
      avatar: "RS",
      rating: 5,
      metric: "Essential Guide"
    },
    {
      quote: "A true story about finding a way to win. There are no substitutions for hard work, but there are must-have tools that, when combined with hard work, can serve as rocket fuel for the small business owner. Read this book closely and know that the insight and advice comes from someone who has lived the entrepreneurial grind for more than four decades.",
      author: "Frank Santini",
      role: "President, Santini Law",
      avatar: "FS",
      rating: 5,
      metric: "The G.O.A.T."
    },
    {
      quote: "The Small Business Big Exit was an absolutely fantastic read. Unlike many books in the business and exit planning category, this one really stood out—it's practical, engaging, and refreshingly clear. The author doesn't just talk theory; they offer actionable steps and real-world insights that feel tailor-made for owners who are genuinely invested in building long-term value and preparing for a successful transition. What I appreciated most was how the book breaks down complex concepts without dumbing them down. Whether you're years away from selling or just beginning to think about what comes next, this book gives you a clear roadmap and the right mindset to make confident decisions.",
      author: "Tanner Wozniak",
      role: "Fellowes HVAC Executive",
      avatar: "TW",
      rating: 5,
      metric: "Must-Read Guide"
    }
  ]

  const bookTestimonials = [
    {
      quote: "I've known Alan first as a customer, and later as a friend. From the start, I admired how he ran his business—lean, efficient, and with a strong team spirit that stood out. For years, I wondered what his 'secret sauce' was. Reading The Big Exit felt like finally getting those answers, straight from him. The book is written in such a clear and personal way that it feels like Alan is sitting across the table, sharing his journey. It's not just theory—it's practical wisdom drawn from someone who has built and led a company the right way. If you're an entrepreneur or business leader looking to scale, this book is a must-read. Inspiring, authentic, and highly actionable.",
      author: "Ram Chellamuthu",
      role: "President, REVON",
      avatar: "RC"
    },
    {
      quote: "This inspirational book is built on the proven systems Alan Wozniak used to create value and achieve a successful exit. He makes the process straightforward by breaking it into simple, actionable steps any business owner can follow.",
      author: "David Bennett",
      role: "President, Unify Financial",
      avatar: "DB"
    },
    {
      quote: "A must-read for entrepreneurs seeking a strategic and profitable exit—clear, actionable, and refreshingly honest. 'The Small Business Big Exit' delivers real-world insights that demystify the process and empower owners to plan with confidence. Brilliantly written and packed with value from start to finish.",
      author: "Dr. Rajiv Sahay",
      role: "President, Sahay Scientific",
      avatar: "RS"
    },
    {
      quote: "A true story about finding a way to win. There are no substitutions for hard work, but there are must-have tools that, when combined with hard work, can serve as rocket fuel for the small business owner. Read this book closely and know that the insight and advice comes from someone who has lived the entrepreneurial grind for more than four decades.",
      author: "Frank Santini",
      role: "President, Santini Law",
      avatar: "FS"
    },
    {
      quote: "The Small Business Big Exit was an absolutely fantastic read. Unlike many books in the business and exit planning category, this one really stood out—it's practical, engaging, and refreshingly clear. The author doesn't just talk theory; they offer actionable steps and real-world insights that feel tailor-made for owners who are genuinely invested in building long-term value and preparing for a successful transition. What I appreciated most was how the book breaks down complex concepts without dumbing them down. Whether you're years away from selling or just beginning to think about what comes next, this book gives you a clear roadmap and the right mindset to make confident decisions. Highly recommend to any small business owner who wants to be proactive about their future. This is not just another business book—it's one you'll come back to again and again.",
      author: "Tanner Wozniak",
      role: "Fellowes HVAC Executive",
      avatar: "TW"
    }
  ]

  const securityCredentials = [
    { icon: Shield, label: 'SOC 2 Type II', description: 'Certified' },
    { icon: Shield, label: 'GDPR Compliant', description: 'Data Protection' },
    { icon: Shield, label: 'ISO 27001', description: 'Information Security' },
    { icon: Shield, label: 'HIPAA Ready', description: 'Healthcare Data' }
  ]

  return (
    <div className="landing-page">
      <MagicalCursor />
      
      {/* Cursor Glow Effect */}
      <div 
        className="cursor-glow"
        style={{
          left: mousePosition.x - 200,
          top: mousePosition.y - 200
        }}
      />

      {/* Animated Background */}
      <div className="animated-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
        <div className="grid-overlay"></div>
        <div className="noise-overlay"></div>
      </div>

      <Navbar />
      
      {/* Cookie Modal */}
      <CookieModal />
      
      {/* Hero Section */}
      <section className="hero-section">
        <div className={`hero-content ${isVisible ? 'visible' : ''}`}>
          <div className="hero-badge animate-float">
            <div className="badge-glow"></div>
            <Sparkles size={16} className="badge-icon" />
            <span>10X COACHES AI</span>
            <div className="badge-pulse"></div>
          </div>
          
          <h1 className="hero-title">
            <span className="title-line">
              <span className="word" style={{ '--delay': '0.1s' } as React.CSSProperties}>Your</span>
              <span className="word gradient-word" style={{ '--delay': '0.15s' } as React.CSSProperties}>Affordable,</span>
            </span>
            <span className="title-line">
              <span className="word" style={{ '--delay': '0.2s' } as React.CSSProperties}>24/7</span>
              <span className="word gradient-word" style={{ '--delay': '0.25s' } as React.CSSProperties}>AI</span>
            </span>
            <span className="title-line">
              <span className="word" style={{ '--delay': '0.3s' } as React.CSSProperties}>Business</span>
              <span className="word gradient-word" style={{ '--delay': '0.35s' } as React.CSSProperties}>Coaches</span>
            </span>
          </h1>
          
          <p className="hero-subtitle">
            10XCoach.ai delivers elite business coaching—powered by 8 digital agents—to accelerate every part of your business, 24/7.
          </p>

          <div className="hero-taglines">
            <span className="tagline-item">Grounded in Experience.</span>
            <span className="tagline-divider">•</span>
            <span className="tagline-item">Designed for Your Success.</span>
          </div>
          
          <div className="hero-cta">
            <Link to="/app" className="btn-primary magnetic">
              <span className="btn-bg"></span>
              <span className="btn-content">
                GET STARTED
                <ArrowRight size={20} className="btn-arrow" />
              </span>
              <div className="btn-shine"></div>
            </Link>
            <button className="btn-secondary magnetic">
              <Play size={18} className="play-icon" />
              <span>Watch Demo</span>
            </button>
          </div>
          
          <div className="hero-stats">
            {securityCredentials.map((credential, index) => {
              const Icon = credential.icon;
              return (
                <div 
                  key={index} 
                  className="stat-item security-credential"
                  style={{ '--delay': `${0.8 + index * 0.1}s` } as React.CSSProperties}
                >
                  <div className="credential-icon-wrapper">
                    <Icon size={24} className="credential-icon" />
                  </div>
                  <div className="credential-content">
                    <div className="stat-label credential-title">{credential.label}</div>
                    <div className="credential-description">{credential.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Hero Visual - 3D Coach Carousel */}
        <div className={`hero-visual ${isVisible ? 'visible' : ''}`}>
          <div className="hero-carousel-wrapper">
            <div className="carousel-hint-hero">
              <span className="drag-icon">↔</span>
              Drag to explore coaches
            </div>
            
            <div 
              className="hero-carousel-container"
              ref={carouselRef}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                className="hero-carousel-3d"
                style={{ transform: `rotateY(${carouselRotation}deg)` }}
              >
                {coaches.map((coach, index) => {
                  const angle = (360 / coaches.length) * index
                  return (
                    <div
                      key={coach.name}
                      className="hero-carousel-card"
                      style={{
                        '--angle': `${angle}deg`,
                        '--accent': coach.color
                      } as React.CSSProperties}
                    >
                      <div className="hero-card-inner">
                        <div className="hero-card-glow"></div>
                        <div className="hero-coach-photo">
                          <img 
                            src={coach.avatar} 
                            alt={coach.name}
                            draggable="false"
                            onDragStart={(e) => e.preventDefault()}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <div className="hero-photo-fallback">
                            {coach.name.split(' ').map(n => n[0]).join('')}
                          </div>
                        </div>
                        <div className="hero-coach-info">
                          <h4 className="hero-coach-name">{coach.name}</h4>
                          <span className="hero-coach-role">{coach.role}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Carousel Dots */}
            <div className="hero-carousel-dots">
              {coaches.map((_, index) => (
                <button
                  key={index}
                  className={`hero-dot ${Math.abs(((carouselRotation % 360) + 360) % 360 - (360 / coaches.length) * index) < 25 ? 'active' : ''}`}
                  onClick={() => {
                    setCarouselRotation(-((360 / coaches.length) * index))
                    setAutoRotate(false)
                    setTimeout(() => setAutoRotate(true), 3000)
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="scroll-indicator">
          <ChevronDown size={24} />
        </div>
      </section>

      {/* BIG EXIT Blueprint Section */}
      <section className="blueprint-section">
        <div className="blueprint-bg-pattern"></div>
        <div className="blueprint-orb-1"></div>
        <div className="blueprint-orb-2"></div>
        <div className="blueprint-content-wrapper">
          <div className="blueprint-content">
            <div className="blueprint-text">
              <div className="blueprint-badge">
                <BookOpen size={16} />
                <span>BIG EXIT Blueprint</span>
                <div className="badge-shimmer"></div>
              </div>
              <h2 className="blueprint-title">
                From the desk of <span className="gradient-text">Alan Wozniak</span>
              </h2>
              <p className="blueprint-description">
                comes a game-changing business development course built on his bestselling book, 
                <strong> The Small Business BIG EXIT</strong>.
              </p>
              <div className="blueprint-new-badge">
                <span className="new-tag">
                  <Sparkles size={12} />
                  New
                </span>
                <h3>Master. Simulate. Succeed.</h3>
              </div>
              <p className="blueprint-sub-description">
                This subscription-based platform leverages AI-powered Digital Coaching Agents to help you 
                master the 8 essential business pillars, test your strengths, and simulate real-world 
                decisions through interactive role-playing scenarios.
              </p>
              <Link to="/app" className="btn-primary blueprint-cta">
                <span className="btn-bg"></span>
                <span className="btn-content">
                  Start Learning Now
                  <ArrowRight size={20} />
                </span>
                <div className="btn-shine"></div>
              </Link>
            </div>
            <div className="blueprint-visual">
              <div className="blueprint-image-showcase">
                <div className="blueprint-image-glow"></div>
                <div className="blueprint-image-border"></div>
                <img 
                  src="/intro-1000x1000.jpg" 
                  alt="The Small Business BIG EXIT" 
                  className="blueprint-book-image"
                />
                <div className="blueprint-floating-elements">
                  <div className="floating-element element-1"></div>
                  <div className="floating-element element-2"></div>
                  <div className="floating-element element-3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 8 Pillars Section */}
      <section className="pillars-section">
        <div className="pillars-bg-layer"></div>
        <div className="pillars-connector-lines"></div>
        <div className="pillars-wrapper">
          <div className="pillars-header">
            <div className="pillars-badge">
              <Shield size={18} />
              <span>Core Framework</span>
              <div className="badge-pulse-ring"></div>
            </div>
            <h2 className="pillars-title">
              The 8 Pillars of a <span className="gradient-text">Healthy Business</span>
            </h2>
            <p className="pillars-subtitle">
              Built into Every Subscription. Powered by AI. Backed by Results.
            </p>
          </div>
          
          <div className="pillars-grid">
            {pillars.map((pillar, index) => {
              const Icon = pillar.icon
              return (
                <div 
                  key={index} 
                  className="pillar-card"
                  style={{ 
                    '--delay': `${index * 0.1}s`,
                    '--pillar-color': pillar.gradient.split(',')[0].split('(')[1]
                  } as React.CSSProperties}
                >
                  <div className="pillar-card-inner">
                    <div className="pillar-gradient-orb"></div>
                    <div className="pillar-number-ring">
                      <span className="pillar-number">{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="pillar-icon-wrapper">
                      <div className="pillar-icon-glow"></div>
                      <div className="pillar-icon" style={{ background: pillar.gradient }}>
                        <Icon size={32} />
                      </div>
                    </div>
                    <div className="pillar-content">
                      <h3 className="pillar-title">{pillar.title}</h3>
                      <p className="pillar-description">{pillar.description}</p>
                    </div>
                    <div className="pillar-hover-effect"></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <div className="pricing-bg-gradient"></div>
        <div className="pricing-particles">
          <div className="particle particle-1"></div>
          <div className="particle particle-2"></div>
          <div className="particle particle-3"></div>
          <div className="particle particle-4"></div>
          <div className="particle particle-5"></div>
        </div>
        <div className="pricing-orb-1"></div>
        <div className="pricing-orb-2"></div>
        <div className="pricing-wrapper">
          <div className="pricing-header">
            <h2 className="pricing-title">
              Learn Through <span className="gradient-text">Action</span>
            </h2>
            <p className="pricing-subtitle">
              Scalable solutions to drive business growth. 10XCoach.ai plans give startups, entrepreneurs, 
              companies, and academia, the expert digital coaches they need to grow their business end-to-end.
            </p>
          </div>

          {/* Billing Toggle */}
          <div className="billing-toggle">
            <span className="save-badge">
              <Star size={14} />
              Save 25%
              <div className="save-badge-shine"></div>
            </span>
            <div className="toggle-wrapper">
              <button 
                className={`toggle-option ${billingCycle === 'monthly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('monthly')}
              >
                Pay Monthly
              </button>
              <button 
                className={`toggle-option ${billingCycle === 'yearly' ? 'active' : ''}`}
                onClick={() => setBillingCycle('yearly')}
              >
                Pay Yearly
              </button>
              <div className={`toggle-slider ${billingCycle}`}></div>
            </div>
          </div>

          {/* Pricing Cards */}
          <div className="pricing-grid">
            {pricingPlans.map((plan, index) => (
              <div 
                key={plan.name}
                className={`pricing-card ${plan.popular ? 'popular' : ''}`}
                style={{ '--delay': `${index * 0.15}s` } as React.CSSProperties}
              >
                {plan.popular && (
                  <div className="popular-badge">
                    <div className="badge-sparkle"></div>
                    <Sparkles size={14} />
                    <span>Most Popular</span>
                    <div className="badge-glow-pulse"></div>
                  </div>
                )}
                <div className="pricing-card-glow"></div>
                <div className="pricing-card-shine"></div>
                <div className="pricing-card-border-glow"></div>
                <div className="pricing-card-content">
                  <div className="plan-header-section">
                    <div className="plan-icon-wrapper">
                      {plan.name === 'Foundation' && <Star size={24} />}
                      {plan.name === 'Momentum' && <Zap size={24} />}
                      {plan.name === 'Elite/Exit' && <Trophy size={24} />}
                    </div>
                    <h3 className="plan-name">{plan.name}</h3>
                    <p className="plan-tagline">{plan.tagline}</p>
                  </div>
                  <div className="plan-price-wrapper">
                    <div className="plan-price">
                      <span className="price-currency">$</span>
                      <span className="price-amount">
                        {billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice}
                      </span>
                      <span className="price-period">/ mo</span>
                    </div>
                    {billingCycle === 'yearly' && (
                      <div className="yearly-savings">
                        <span>Save ${(plan.monthlyPrice - plan.yearlyPrice) * 12} annually</span>
                      </div>
                    )}
                  </div>
                  <div className="plan-features">
                    <span className="features-label">Key Features</span>
                    <ul>
                      {plan.features.map((feature, i) => (
                        <li key={i}>
                          <div className="feature-check">
                            <Check size={18} />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link to="/app" className={`plan-cta ${plan.popular ? 'primary' : ''}`}>
                    <span className="cta-text">{plan.cta}</span>
                    <ArrowRight size={18} className="cta-arrow" />
                    <div className="cta-shine"></div>
                    <div className="cta-glow"></div>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Educator Plan Banner */}
          <div className="educator-banner">
            <div className="educator-banner-glow"></div>
            <div className="educator-icon">
              <GraduationCap size={28} />
            </div>
            <div className="educator-content">
              <span className="educator-text">ASK ABOUT OUR EDUCATOR PLAN</span>
              <Link to="/contact" className="educator-link">
                <span>Contact Sales</span>
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <p className="pricing-note">
            All prices are in USD and charged per site with applicable taxes added at checkout.
          </p>
        </div>
      </section>

      {/* Features Comparison Table */}
      <section className="comparison-section">
        <div className="comparison-bg-gradient"></div>
        <div className="comparison-orb-1"></div>
        <div className="comparison-orb-2"></div>
        <div className="comparison-particles">
          <div className="comp-particle comp-particle-1"></div>
          <div className="comp-particle comp-particle-2"></div>
          <div className="comp-particle comp-particle-3"></div>
        </div>
        <div className="comparison-wrapper">
          <div className="comparison-header">
            <div className="comparison-badge">
              <div className="comparison-badge-glow"></div>
              <BarChart3 size={18} />
              <span>Feature Comparison</span>
              <div className="comparison-badge-pulse"></div>
            </div>
            <h2 className="comparison-title">
              All Plan <span className="gradient-text">Features</span>
            </h2>
            <p className="comparison-subtitle">Compare features across all plans at a glance</p>
          </div>
          <div className="comparison-table-wrapper">
            <div className="comparison-table-container">
              <div className="table-glow-effect"></div>
              <table className="comparison-table">
                <thead>
                  <tr>
                    <th className="feature-header">
                      <div className="header-content">
                        <Target size={18} />
                        <span>Overview</span>
                      </div>
                    </th>
                    <th>
                      <div className="plan-header-cell">
                        <Star size={20} />
                        <span className="plan-name-header">Foundation</span>
                      </div>
                    </th>
                    <th className="popular-plan">
                      <div className="plan-header-cell">
                        <div className="popular-indicator"></div>
                        <Zap size={20} />
                        <span className="plan-name-header">Momentum</span>
                        <div className="popular-badge-small">Most Popular</div>
                      </div>
                    </th>
                    <th>
                      <div className="plan-header-cell">
                        <Trophy size={20} />
                        <span className="plan-name-header">Elite/Exit</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {planFeatures.map((item, index) => (
                    <tr key={index} className="comparison-row">
                      <td className="feature-name">
                        <span className="feature-text">{item.feature}</span>
                      </td>
                      <td className={item.foundation ? 'feature-yes' : 'feature-no'}>
                        {item.foundation ? (
                          <div className="check-container">
                            <div className="check-bg"></div>
                            <Check size={20} className="check-icon" />
                            <div className="check-ripple"></div>
                          </div>
                        ) : (
                          <div className="dash-container">
                            <span className="dash">—</span>
                          </div>
                        )}
                      </td>
                      <td className={`${item.momentum ? 'feature-yes' : 'feature-no'} popular-plan-cell`}>
                        {item.momentum ? (
                          <div className="check-container">
                            <div className="check-bg"></div>
                            <Check size={20} className="check-icon" />
                            <div className="check-ripple"></div>
                          </div>
                        ) : (
                          <div className="dash-container">
                            <span className="dash">—</span>
                          </div>
                        )}
                      </td>
                      <td className={item.elite ? 'feature-yes' : 'feature-no'}>
                        {item.elite ? (
                          <div className="check-container">
                            <div className="check-bg"></div>
                            <Check size={20} className="check-icon" />
                            <div className="check-ripple"></div>
                          </div>
                        ) : (
                          <div className="dash-container">
                            <span className="dash">—</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Free Trial CTA */}
          {/* <div className="trial-cta-box">
            <div className="trial-cta-glow"></div>
            <div className="trial-icon">
              <div className="trial-icon-glow"></div>
              <Rocket size={40} />
            </div>
            <h3>Start your 14-day <span className="gradient-text">FREE TRIAL</span></h3>
            <p>No contracts. Cancel anytime.</p>
            <Link to="/app" className="trial-btn">
              <span className="trial-btn-text">START NOW</span>
              <ArrowRight size={20} className="trial-btn-arrow" />
            </Link>
          </div> */}
        </div>
      </section>

      {/* Business Health Assessment Section */}
      <section className="bha-section">
        <div className="bha-background-effects">
          <div className="bha-orb-1"></div>
          <div className="bha-orb-2"></div>
          <div className="bha-orb-3"></div>
          <div className="bha-grid-pattern"></div>
        </div>
        <div className="bha-container">
          <div className="bha-content">
            <div className="bha-badge">
              <Sparkles size={14} />
              <span>FREE WITH EVERY PLAN</span>
            </div>
            <div className="bha-icon-wrapper">
              <div className="bha-icon-glow"></div>
              <div className="bha-icon-pulse"></div>
              <Compass size={48} className="bha-icon" />
            </div>
            <h2 className="bha-title">
              Know Where You Stand
              <span className="bha-title-accent"> – Start With the </span>
              <span className="gradient-text">Business Health Assessment™</span>
            </h2>
            <p className="bha-description">
              A powerful diagnostic tool to benchmark where your business is today and what you must do to scale or exit successfully.
            </p>
            <div className="bha-features">
              <div className="bha-feature">
                <Check size={18} />
                <span>Benchmark your baseline</span>
              </div>
              <div className="bha-feature">
                <Check size={18} />
                <span>Monitor your growth</span>
              </div>
              <div className="bha-feature">
                <Check size={18} />
                <span>Track progress over time</span>
              </div>
            </div>
            <Link to="/app" className="bha-cta">
              <span className="bha-cta-bg"></span>
              <span className="bha-cta-content">
                <span>Start Assessment</span>
                <ArrowRight size={18} />
              </span>
              <div className="bha-cta-shine"></div>
            </Link>
          </div>
        </div>
      </section>

      {/* Plan Details Section */}
      <section className="plan-details-section">
        <div className="plan-details-bg-gradient"></div>
        <div className="plan-details-orb-1"></div>
        <div className="plan-details-orb-2"></div>
        <div className="plan-details-particles">
          <div className="plan-particle plan-particle-1"></div>
          <div className="plan-particle plan-particle-2"></div>
          <div className="plan-particle plan-particle-3"></div>
        </div>
        <div className="plan-details-wrapper">
          <div className="plan-details-header">
            <div className="plan-details-badge">
              <div className="plan-badge-glow"></div>
              <Rocket size={18} />
              <span>Smart Growth Plans</span>
              <div className="plan-badge-pulse"></div>
            </div>
            <h2 className="plan-details-title">
              Don't Just Grow. <span className="gradient-text">Grow Smart</span> With Our 
              Highly Trained AI in Business Coaching.
            </h2>
            <p className="plan-details-subtitle">
              Get the confidence, clarity, and business expertise to make your BIG EXIT a reality.
            </p>
            <div className="plan-details-highlight">
              <Sparkles size={16} />
              <span>Your business deserves better than burnout and guesswork.</span>
            </div>
          </div>

          {/* Plan Tabs */}
          <div className="plan-tabs">
            {[
              { id: 'foundation', label: 'Foundation Plan', icon: Star },
              { id: 'momentum', label: 'Momentum Plan', icon: Zap },
              { id: 'elite', label: 'Elite Exit Plan', icon: Trophy },
              { id: 'educator', label: 'Educator Plan', icon: GraduationCap }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.id}
                  className={`plan-tab ${activePlanTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActivePlanTab(tab.id as any)}
                >
                  <div className="tab-icon-wrapper">
                    <Icon size={18} />
                  </div>
                  <span>{tab.label}</span>
                  {activePlanTab === tab.id && (
                    <>
                      <div className="tab-indicator"></div>
                      <div className="tab-glow"></div>
                    </>
                  )}
                </button>
              );
            })}
          </div>

          {/* Plan Detail Content */}
          <div className="plan-detail-content">
            <div className="plan-detail-glow"></div>
            <div className="plan-detail-shine"></div>
            <div className="plan-detail-border-glow"></div>
            <div className="plan-detail-header">
              <div className="plan-detail-title-section">
                <div className="plan-title-icon">
                  {activePlanTab === 'foundation' && <Star size={28} />}
                  {activePlanTab === 'momentum' && <Zap size={28} />}
                  {activePlanTab === 'elite' && <Trophy size={28} />}
                  {activePlanTab === 'educator' && <GraduationCap size={28} />}
                </div>
                <div className="plan-title-content">
                  <h3>{planDetails[activePlanTab as keyof typeof planDetails].title}</h3>
                  <span className="plan-detail-price">{planDetails[activePlanTab as keyof typeof planDetails].price}</span>
                </div>
              </div>
            </div>
            <div className="plan-ideal-box">
              <div className="ideal-icon">
                <Target size={20} />
              </div>
              <p className="plan-ideal">
                <strong>Ideal for:</strong> {planDetails[activePlanTab as keyof typeof planDetails].ideal}
              </p>
            </div>
            <div className="plan-benefits">
              <div className="benefits-header">
                <Sparkles size={20} />
                <h4>What You Get:</h4>
              </div>
              <div className="benefits-list">
                {planDetails[activePlanTab as keyof typeof planDetails].benefits.map((benefit, index) => (
                  <div key={index} className="benefit-item">
                    <div className="benefit-check">
                      <div className="check-bg-circle"></div>
                      <Check size={20} className="check-icon-benefit" />
                    </div>
                    <div className="benefit-content">
                      <h5>{benefit.title}</h5>
                      <p>{benefit.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="plan-value">
              <div className="value-header">
                <TrendingUp size={20} />
                <h4>Why it's valuable:</h4>
              </div>
              <p>{planDetails[activePlanTab as keyof typeof planDetails].value}</p>
            </div>
            <Link to="/app" className="plan-detail-cta">
              <span className="cta-text">Start Your Free Trial</span>
              <ArrowRight size={20} className="cta-arrow" />
              <div className="cta-bg-glow"></div>
            </Link>
          </div>
        </div>
      </section>

      {/* Book Testimonials Section */}
      <section className="book-testimonials-section">
        <div className="book-reviews-bg-gradient"></div>
        <div className="book-reviews-orb-1"></div>
        <div className="book-reviews-orb-2"></div>
        <div className="book-reviews-wrapper">
          <div className="book-reviews-header">
            <div className="book-reviews-badge">
              <div className="book-badge-glow"></div>
              <BookOpen size={18} />
              <span>Book Reviews</span>
              <div className="book-badge-pulse"></div>
            </div>
            <h2 className="book-reviews-title">
              What they are saying about the 
              <span className="gradient-text"> BIG EXIT book</span>
            </h2>
          </div>
          
          <div className="book-testimonials-grid">
            {bookTestimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="book-testimonial-card"
                style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}
              >
                <div className="book-card-glow"></div>
                <div className="book-card-shine"></div>
                <div className="book-card-border-glow"></div>
                <div className="quote-icon-wrapper">
                  <div className="quote-icon-bg"></div>
                  <div className="quote-icon">"</div>
                </div>
                <blockquote className="book-quote">
                  {testimonial.quote}
                </blockquote>
                <div className="book-author">
                  <div className="book-author-avatar">
                    <div className="avatar-glow"></div>
                    <span>{testimonial.avatar}</span>
                  </div>
                  <div className="book-author-info">
                    <span className="book-author-name">{testimonial.author}</span>
                    <span className="book-author-role">{testimonial.role}</span>
                  </div>
                </div>
                <div className="book-card-accent"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform Testimonials Section */}
      <section className="testimonials-section">
        <div className="success-stories-bg-gradient"></div>
        <div className="success-stories-orb-1"></div>
        <div className="success-stories-orb-2"></div>
        <div className="success-stories-particles">
          <div className="story-particle story-particle-1"></div>
          <div className="story-particle story-particle-2"></div>
          <div className="story-particle story-particle-3"></div>
          <div className="story-particle story-particle-4"></div>
        </div>
        <div className="success-stories-wrapper">
          <div className="success-stories-header">
            <div className="success-stories-badge">
              <div className="success-badge-glow"></div>
              <Trophy size={20} />
              <span>Success Stories</span>
              <div className="success-badge-pulse"></div>
              <div className="success-badge-shine"></div>
            </div>
            <h2 className="success-stories-title">
              Praised by 
              <span className="gradient-text"> Business Leaders</span>
            </h2>
            <p className="success-stories-subtitle">
              Real reviews from presidents and executives about "The Small Business BIG EXIT"
            </p>
          </div>
          
          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className="testimonial-card-wrapper"
                style={{ '--delay': `${index * 0.1}s` } as React.CSSProperties}
              >
                <div className="testimonial-card">
                  <div className="testimonial-card-glow"></div>
                  <div className="testimonial-card-shine"></div>
                  <div className="testimonial-card-border-glow"></div>
                  <div className="testimonial-card-pattern"></div>
                  <div className="testimonial-stars">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <div key={i} className="star-wrapper">
                        <Star size={18} fill="currentColor" className="star-icon" />
                        <div className="star-glow"></div>
                      </div>
                    ))}
                  </div>
                  <div className="quote-mark-top">
                    <span>"</span>
                  </div>
                  <blockquote className="testimonial-quote">
                    {testimonial.quote}
                  </blockquote>
                  <div className="testimonial-author">
                    <div className="author-avatar">
                      <div className="avatar-ring"></div>
                      <div className="avatar-glow-success"></div>
                      {typeof testimonial.avatar === 'string' && testimonial.avatar.length > 3 && (
                        <img 
                          src={testimonial.avatar} 
                          alt={testimonial.author}
                          className="author-avatar-image"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const fallback = target.nextElementSibling as HTMLElement;
                            if (fallback) fallback.style.display = 'flex';
                          }}
                        />
                      )}
                      <span className="author-avatar-fallback" style={{ display: typeof testimonial.avatar === 'string' && testimonial.avatar.length <= 3 ? 'flex' : 'none' }}>
                        {typeof testimonial.avatar === 'string' && testimonial.avatar.length <= 3 ? testimonial.avatar : testimonial.author.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div className="author-info">
                      <span className="author-name">{testimonial.author}</span>
                      <span className="author-role">{testimonial.role}</span>
                    </div>
                  </div>
                  <div className="testimonial-accent-line"></div>
                  <div className="testimonial-corner-decoration"></div>
                </div>
                <div className="testimonial-metric">
                  <div className="metric-icon-wrapper">
                    <TrendingUp size={16} />
                  </div>
                  <span className="metric-text">{testimonial.metric}</span>
                  <div className="metric-glow"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="final-cta-section">
        <div className="final-cta-container">
          <div className="final-cta-bg">
            <div className="cta-orb orb-1"></div>
            <div className="cta-orb orb-2"></div>
            <div className="cta-orb orb-3"></div>
          </div>
          <div className="final-cta-content">
            <div className="final-cta-icon">
              <Sparkles size={48} />
            </div>
            <h2 className="final-cta-title">
              The World's First AI Coach to <span className="gradient-text">10x Your Business</span>
            </h2>
            <p className="final-cta-subtitle">
              The 10XCoach.ai system provides the roadmap to increase your company's net worth, 
              while the AI coaches hold you accountable at every step.
            </p>
            <div className="final-cta-features">
              {['14-day free trial', 'No credit card required', 'Cancel anytime'].map((feature, i) => (
                <div key={i} className="final-cta-feature">
                  <Check size={20} />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <Link to="/app" className="final-cta-btn">
              <span className="btn-bg"></span>
              <span className="btn-content">
                Start Your Free Trial
                <ArrowRight size={22} />
              </span>
              <div className="btn-shine"></div>
            </Link>
          </div>
        </div>
      </section>

      {/* Scroll to Footer Button */}
      <button
        className={`scroll-to-footer-btn ${showFooterButton ? 'visible' : ''}`}
        onClick={scrollToFooter}
        aria-label="Scroll to footer"
      >
        <div className="footer-btn-glow"></div>
        <ChevronDown size={24} className="footer-btn-icon" />
        <div className="footer-btn-pulse"></div>
      </button>

      {/* Footer */}
      <footer className="landing-footer" ref={footerRef}>
        <div className="footer-container">
          <div className="footer-brand">
            <div className="footer-logo">
              <Sparkles size={24} />
              <span>10XCoach<span className="accent">.ai</span></span>
            </div>
            <p className="footer-tagline">AI-powered business coaching for exponential growth.</p>
            <div className="footer-social">
              {['Twitter', 'LinkedIn', 'YouTube'].map((social, i) => (
                <a key={i} href="#" className="social-link">{social[0]}</a>
              ))}
            </div>
          </div>
          
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <Link to="/ai-coaches">AI Coaches</Link>
              <Link to="/pricing">Pricing</Link>
              <Link to="/business">Enterprise</Link>
              <Link to="#">Features</Link>
            </div>
            <div className="footer-column">
              <h4>Resources</h4>
              <Link to="/blog">Blog</Link>
              <Link to="#">Help Center</Link>
              <Link to="#">Webinars</Link>
              <Link to="#">Case Studies</Link>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <Link to="#">About Us</Link>
              <Link to="/contact">Contact</Link>
              <Link to="#">Careers</Link>
              <Link to="#">Press</Link>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <Link to="#">Privacy</Link>
              <Link to="#">Terms</Link>
              <Link to="#">Security</Link>
              <Link to="#">GDPR</Link>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 10XCoach.ai. All rights reserved.</p>
          <div className="footer-badges">
            <span className="badge">SOC 2</span>
            <span className="badge">GDPR</span>
            <span className="badge">ISO 27001</span>
          </div>
        </div>
      </footer>
      
      {/* Morgan Chat Widget */}
      <MorganChatWidget />
      
      {/* Quick Try Out Widget */}
      <QuickTryOut />
    </div>
  )
}

export default Landing
