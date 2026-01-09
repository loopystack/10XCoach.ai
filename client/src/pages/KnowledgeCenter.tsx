import { Calendar, User, ArrowRight } from 'lucide-react'
import './PageStyles.css'

const KnowledgeCenter = () => {
  const blogPosts = [
    {
      id: 1,
      title: '10X Growth Principles: Scaling Your Business',
      author: 'John Smith',
      date: '2024-01-15',
      excerpt: 'Learn the fundamental principles of 10X growth and how to apply them to scale your business effectively.',
      category: 'Growth Strategy'
    },
    {
      id: 2,
      title: 'Effective Team Huddles: Making Every Minute Count',
      author: 'Sarah Johnson',
      date: '2024-01-12',
      excerpt: 'Discover how to run productive 10-minute huddles that drive results and keep your team aligned.',
      category: 'Team Management'
    },
    {
      id: 3,
      title: 'Action Step Framework: From Planning to Execution',
      author: 'Mike Davis',
      date: '2024-01-10',
      excerpt: 'Master the art of creating actionable steps that lead to real business outcomes.',
      category: 'Execution'
    },
    {
      id: 4,
      title: 'Building a High-Performance Culture',
      author: 'Emily Wilson',
      date: '2024-01-08',
      excerpt: 'Explore strategies for creating a culture that drives exceptional performance and results.',
      category: 'Culture'
    },
    {
      id: 5,
      title: 'The Power of Discovery Questions',
      author: 'David Brown',
      date: '2024-01-05',
      excerpt: 'Learn how to ask the right questions to uncover opportunities and drive business growth.',
      category: 'Coaching'
    }
  ]

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>10X Knowledge Center</h1>
        <p className="page-subtitle">Educational blog posts and resources</p>
      </div>

      <div className="knowledge-grid">
        {blogPosts.map(post => (
          <article key={post.id} className="blog-card">
            <div className="blog-header">
              <span className="blog-category">{post.category}</span>
              <div className="blog-meta">
                <div className="blog-author">
                  <User size={14} />
                  <span>{post.author}</span>
                </div>
                <div className="blog-date">
                  <Calendar size={14} />
                  <span>{new Date(post.date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <h2>{post.title}</h2>
            <p className="blog-excerpt">{post.excerpt}</p>
            <a href="#" className="blog-link">
              Read More <ArrowRight size={16} />
            </a>
          </article>
        ))}
      </div>
    </div>
  )
}

export default KnowledgeCenter

