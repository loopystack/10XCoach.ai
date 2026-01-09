import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, User, ArrowLeft, Facebook, Twitter, Linkedin, Link2 } from 'lucide-react'
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
  content: string | null
}

const BlogDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      fetchBlogPost()
    }
  }, [id])

  const fetchBlogPost = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch(`/api/blogs/${id}`)
      if (response.ok) {
        const data = await response.json()
        console.log('Blog post data:', data) // Debug log
        console.log('Blog content:', data.content) // Debug log
        setPost(data)
      } else {
        setError('Blog post not found')
      }
    } catch (error) {
      console.error('Failed to fetch blog post:', error)
      setError('Failed to load blog post')
    } finally {
      setLoading(false)
    }
  }

  const formatContent = (content: string | null, blogId: number) => {
    if (!content) return null

    // Split content into paragraphs
    const paragraphs = content.split('\n\n').filter(p => p.trim())
    const imageBasePath = `/blogs/${blogId}`
    let imageInserted = false
    const result: React.ReactNode[] = []
    
    paragraphs.forEach((para, index) => {
      const trimmedPara = para.trim()
      
      // Check if paragraph is a heading (starts with ### or ##)
      if (trimmedPara.startsWith('###')) {
        const heading = trimmedPara.replace(/^###\s*/, '').trim()
        result.push(
          <h3 key={index} className="blog-content-heading">
            {heading}
          </h3>
        )
      } else if (trimmedPara.startsWith('##')) {
        const heading = trimmedPara.replace(/^##\s*/, '').trim()
        result.push(
          <h2 key={index} className="blog-content-heading-main">
            {heading}
          </h2>
        )
        
        // Insert image after first major heading (h2) - after "A Miraculous Beginning"
        if (!imageInserted && index >= 2) {
          result.push(
            <div key={`img-main-${index}`} className="blog-content-image-wrapper">
              <img 
                src={`${imageBasePath}/1-5-683x1024.png`}
                alt="Blog illustration"
                className="blog-content-image"
                onError={(e) => {
                  // Hide image if it doesn't exist
                  e.currentTarget.style.display = 'none'
                }}
              />
            </div>
          )
          imageInserted = true
        }
      } else if (trimmedPara.startsWith('http')) {
        // URL links - make them clickable
        result.push(
          <p key={index} className="blog-content-paragraph">
            <a href={trimmedPara} target="_blank" rel="noopener noreferrer" className="blog-content-link">
              {trimmedPara}
            </a>
          </p>
        )
      } else if (trimmedPara.includes('\n') && trimmedPara.split('\n').length > 1) {
        // Multiple lines - could be a list
        const lines = trimmedPara.split('\n').filter(l => l.trim())
        // Check if it looks like a list (starts with capital letters and colon, or has consistent patterns)
        const firstLine = lines[0]
        if (firstLine.endsWith(':') && lines.length > 1) {
          // This is a list with a heading
          result.push(
            <p key={`${index}-intro`} className="blog-content-paragraph">
              {firstLine}
            </p>
          )
          result.push(
            <ul key={index} className="blog-content-list">
              {lines.slice(1).map((line, lineIndex) => (
                <li key={lineIndex}>{line.trim()}</li>
              ))}
            </ul>
          )
        } else {
          // Regular multi-line paragraph
          result.push(
            <p key={index} className="blog-content-paragraph">
              {trimmedPara.split('\n').map((line, lineIndex) => (
                <React.Fragment key={lineIndex}>
                  {line.trim()}
                  {lineIndex < trimmedPara.split('\n').length - 1 && <br />}
                </React.Fragment>
              ))}
            </p>
          )
        }
      } else {
        result.push(
          <p key={index} className="blog-content-paragraph">
            {trimmedPara}
          </p>
        )
      }
    })
    
    return result
  }

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

  if (error || !post) {
    return (
      <div className="landing-page">
        <MagicalCursor />
        <Navbar />
        <div className="blog-detail-container">
          <div className="blog-error">
            <h2>{error || 'Blog post not found'}</h2>
            <button onClick={() => navigate('/blog')} className="blog-back-button">
              <ArrowLeft size={18} />
              Back to Blog
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="landing-page">
      <MagicalCursor />
      <Navbar />
      
      <div className="blog-detail-container">
        {/* Back Button */}
        <button onClick={() => navigate('/blog')} className="blog-back-button">
          <ArrowLeft size={18} />
          Back to Blog
        </button>

        {/* Article */}
        <article className="blog-detail-article">
          {/* Header */}
          <header className="blog-detail-header">
            {post.category && (
              <span className="blog-detail-category">{post.category}</span>
            )}
            <h1 className="blog-detail-title">{post.title}</h1>
            <div className="blog-detail-meta">
              <div className="blog-detail-meta-item">
                <Calendar size={18} />
                <span>{post.date}</span>
              </div>
              {post.author && (
                <div className="blog-detail-meta-item">
                  <User size={18} />
                  <span>{post.author}</span>
                </div>
              )}
              {post.readTime && (
                <div className="blog-detail-meta-item">
                  <span>{post.readTime}</span>
                </div>
              )}
            </div>

            {/* Social Share */}
            <div className="blog-share-buttons">
              <span className="blog-share-label">Share:</span>
              <button className="blog-share-btn" title="Share on Facebook">
                <Facebook size={18} />
              </button>
              <button className="blog-share-btn" title="Share on Twitter">
                <Twitter size={18} />
              </button>
              <button className="blog-share-btn" title="Share on LinkedIn">
                <Linkedin size={18} />
              </button>
              <button className="blog-share-btn" title="Copy Link">
                <Link2 size={18} />
              </button>
            </div>
          </header>

          {/* Content */}
          <div className="blog-detail-content">
            {post.content ? (
              formatContent(post.content, post.id)
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <p>No content available for this blog post.</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>Content may need to be loaded from the database. Please run: cd server && npm run seed</p>
              </div>
            )}
          </div>

          {/* Footer with QR Code and Banner */}
          <footer className="blog-detail-footer">
            <div className="blog-qr-section">
              <p className="blog-qr-text">Feel free to reach out to me by scanning my QR code below:</p>
              <div className="blog-qr-wrapper">
                <img 
                  src="/blogs/qr.png" 
                  alt="QR Code"
                  className="blog-qr-image"
                />
              </div>
            </div>
            
            <div className="blog-banner-section">
              <img 
                src="/blogs/banner.png" 
                alt="Banner"
                className="blog-banner-image"
              />
            </div>
          </footer>
        </article>
      </div>
    </div>
  )
}

export default BlogDetail

