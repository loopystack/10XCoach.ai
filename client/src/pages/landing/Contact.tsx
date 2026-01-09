import { useState } from 'react'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import Navbar from '../../components/Navbar'
import MagicalCursor from '../../components/MagicalCursor'
import '../Landing.css'
import './LandingPages.css'

const Contact = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    subject: '',
    message: ''
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate form submission
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 3000)
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
            <Mail size={16} />
            <span>Get in Touch</span>
          </div>
          <h1 className="page-hero-title">
            Let's <span className="hero-title-gradient">Connect</span>
          </h1>
          <p className="page-hero-subtitle">
            Have questions about 10XCoach.ai? We're here to help you 
            start your journey to exponential growth.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="section-container">
          <div className="contact-grid">
            {/* Contact Info */}
            <div className="contact-info">
              <h2>Get in Touch</h2>
              <p>
                Whether you're curious about features, pricing, or want to schedule a demo, 
                our team is ready to answer all your questions.
              </p>
              
              <div className="contact-methods">
                <div className="contact-method">
                  <div className="contact-method-icon">
                    <Mail size={24} />
                  </div>
                  <div className="contact-method-info">
                    <h4>Email Us</h4>
                    <p>hello@10xcoach.ai</p>
                  </div>
                </div>
                
                <div className="contact-method">
                  <div className="contact-method-icon">
                    <Phone size={24} />
                  </div>
                  <div className="contact-method-info">
                    <h4>Call Us</h4>
                    <p>+1 (555) 123-4567</p>
                  </div>
                </div>
                
                <div className="contact-method">
                  <div className="contact-method-icon">
                    <MapPin size={24} />
                  </div>
                  <div className="contact-method-info">
                    <h4>Visit Us</h4>
                    <p>123 AI Boulevard, San Francisco, CA 94102</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-card">
              {submitted ? (
                <div className="form-success">
                  <div className="success-icon">
                    <Send size={32} />
                  </div>
                  <h3 className="success-title">Message Sent!</h3>
                  <p className="success-text">
                    We'll get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <form className="contact-form" onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>First Name</label>
                      <input 
                        type="text" 
                        required
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        placeholder="John"
                      />
                    </div>
                    <div className="form-group">
                      <label>Last Name</label>
                      <input 
                        type="text" 
                        required
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        placeholder="Doe"
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>Email</label>
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        placeholder="john@company.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>Company</label>
                      <input 
                        type="text"
                        value={formData.company}
                        onChange={(e) => setFormData({...formData, company: e.target.value})}
                        placeholder="Your Company"
                      />
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Subject</label>
                    <select 
                      required
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    >
                      <option value="">Select a topic</option>
                      <option value="demo">Schedule a Demo</option>
                      <option value="pricing">Pricing Questions</option>
                      <option value="enterprise">Enterprise Inquiry</option>
                      <option value="support">Technical Support</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Message</label>
                    <textarea 
                      required
                      value={formData.message}
                      onChange={(e) => setFormData({...formData, message: e.target.value})}
                      placeholder="Tell us how we can help you..."
                    />
                  </div>
                  
                  <button type="submit" className="form-submit">
                    Send Message
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default Contact
