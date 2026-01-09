import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { BookOpen, Calendar, User, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import Navbar from '../../components/Navbar'
import MagicalCursor from '../../components/MagicalCursor'
import '../Landing.css'
import './LandingPages.css'

interface BlogPost {
  id: number
  title: string
  excerpt: string | null
  category: string | null
  author: string | null
  date: string
  readTime: string | null
  image: string | null
}

const Blog = () => {
  const [currentPage, setCurrentPage] = useState(1)
  const [allPosts, setAllPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const postsPerPage = 6

  useEffect(() => {
    fetchBlogPosts()
  }, [])

  const fetchBlogPosts = async () => {
    try {
      setLoading(true)
      // Fetch all posts (we'll handle pagination on frontend for now)
      const response = await fetch('/api/blogs?limit=100')
      if (response.ok) {
        const data = await response.json()
        setAllPosts(data.posts || [])
      }
    } catch (error) {
      console.error('Failed to fetch blog posts:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(allPosts.length / postsPerPage)
  const startIndex = (currentPage - 1) * postsPerPage
  const endIndex = startIndex + postsPerPage
  const currentPosts = allPosts.slice(startIndex, endIndex)

  if (loading) {
    return (
      <div className="landing-page">
        <MagicalCursor />
        <Navbar />
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '60vh' 
        }}>
          <div className="loading"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="landing-page">
      <MagicalCursor />
      <Navbar />
      
      {/* Hero Section */}
      <section className="page-hero">
        <div className="hero-bg">
          <div className="hero-gradient"></div>
          <div className="hero-grid"></div>
          <div className="hero-glow glow-1"></div>
          <div className="hero-glow glow-2"></div>
        </div>
        
        <div className="page-hero-content">
          <div className="hero-badge">
            <BookOpen size={16} />
            <span>Knowledge Center</span>
          </div>
          <h1 className="page-hero-title">
            Insights for <span className="hero-title-gradient">10X Growth</span>
          </h1>
          <p className="page-hero-subtitle">
            Expert advice, proven strategies, and actionable insights 
            to help you achieve exponential business growth.
          </p>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="features-section">
        <div className="section-container">
          <div className="blog-grid">
            {currentPosts.map((post, index) => (
              <Link 
                key={post.id} 
                to={`/blog/${post.id}`}
                className="blog-card"
                style={{ '--index': index } as React.CSSProperties}
              >
                <div className="blog-card-image">
                  {post.image ? (
                    <img 
                      src={post.image} 
                      alt={post.title}
                      loading="lazy"
                    />
                  ) : (
                    <BookOpen size={60} />
                  )}
                </div>
                <div className="blog-card-content">
                  {post.category && (
                    <span className="blog-card-category">{post.category}</span>
                  )}
                  <h3 className="blog-card-title">{post.title}</h3>
                  {post.excerpt && (
                    <p className="blog-card-excerpt">{post.excerpt}</p>
                  )}
                  <div className="blog-card-meta">
                    {post.author && (
                      <span><User size={14} /> {post.author}</span>
                    )}
                    <span><Calendar size={14} /> {post.date}</span>
                    {post.readTime && (
                      <span>{post.readTime}</span>
                    )}
                  </div>
                  <div className="blog-card-read-more">
                    <span>Read More <ArrowRight size={14} /></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
          
          {/* Pagination */}
          <div className="blog-pagination">
            <button 
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft size={18} />
              Previous
            </button>
            
            <div className="pagination-numbers">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
            </div>
            
            <button 
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              Next
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* Newsletter Section */}
      <section className="cta-section">
        <div className="cta-bg">
          <div className="cta-glow"></div>
        </div>
        <div className="cta-content">
          <h2 className="cta-title">Get Weekly Growth Insights</h2>
          <p className="cta-subtitle">
            Subscribe to our newsletter for the latest strategies and tips delivered to your inbox.
          </p>
          <div className="newsletter-form">
            <input 
              type="email" 
              placeholder="Enter your email"
              className="newsletter-input"
            />
            <button className="cta-btn">
              Subscribe
              <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Blog
