import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, Check, X as XIcon, Sparkles, Crown, Zap, DollarSign, Mic, Users, Target, BarChart3, Shield } from 'lucide-react'
import { api } from '../../utils/api'
import '../PageStyles.css'
import './AdminPages.css'

interface Plan {
  id: number
  name: string
  tier: string
  price: number
  yearlyPrice: number | null
  featuresJson: {
    features: string[]
    voiceHours?: number
    coaches?: string[]
    restrictions?: string[]
    positioning?: string
    idealFor?: string
  }
  maxMinutes: number | null
  active: boolean
}

// Default plans structure based on the new 3-tier model
const DEFAULT_PLANS = [
  {
    name: 'Foundation',
    tier: 'FOUNDATION',
    price: 69,
    yearlyPrice: null,
    maxMinutes: 120, // 2 hours = 120 minutes
    active: true,
    featuresJson: {
      features: [
        '10X Action Step Framework',
        '10X Discovery Questions',
        '10X Coach Notetaking (session-based)',
        'Personal TO-DO List',
        'Calendar at-a-Glance',
        '10X Business Success Quizzes (limited frequency)'
      ],
      voiceHours: 2,
      coaches: ['Strategy Coach', 'Sales Coach'],
      restrictions: [
        'No team huddles',
        'No shared accountability',
        'No advanced dashboards'
      ],
      positioning: 'Your AI business coach for clarity, confidence, and next steps.',
      idealFor: 'Solo founders, early-stage businesses, and first-time AI coach users'
    }
  },
  {
    name: 'Execution',
    tier: 'EXECUTION',
    price: 179,
    yearlyPrice: null,
    maxMinutes: 240, // 4 hours = 240 minutes
    active: true,
    featuresJson: {
      features: [
        'Unlimited 10X Action Steps',
        '10X 10-Minute Huddles (agenda → notes → actions)',
        'Shared TO-DO Lists (team accountability)',
        'Advanced 10X Coach Notetaking',
        'Calendar with execution overlays',
        'Full access to 10X Business Success Quizzes',
        'Weekly execution summaries',
        'Multiple users',
        'Shared visibility',
        'Role-based ownership'
      ],
      voiceHours: 4,
      coaches: ['Strategy Coach', 'Sales Coach', 'Marketing Coach', 'Operations Coach', 'Finance Coach', 'Culture Coach'],
      restrictions: [],
      positioning: 'Where strategy turns into disciplined execution.',
      idealFor: 'Growing teams, managers, consultants, and execution-focused leaders'
    }
  },
  {
    name: 'Scale',
    tier: 'SCALE',
    price: 399,
    yearlyPrice: null,
    maxMinutes: 480, // 8 hours = 480 minutes
    active: true,
    featuresJson: {
      features: [
        'Cross-coach intelligence (Full)',
        'Long-term memory & pattern recognition',
        'Enterprise execution dashboards',
        'Multi-team and department huddles',
        'Long-term performance tracking',
        'Enterprise value & exit readiness scoring',
        'Customer experience maturity mapping',
        'Historical action intelligence',
        'Priority orchestration across departments',
        'Admin roles & permissions',
        'Execution audit trail',
        'Data export for investors/advisors',
        'Quarterly execution review (AI-Generated)'
      ],
      voiceHours: 8,
      coaches: ['Strategy Coach', 'Sales Coach', 'Marketing Coach', 'Operations Coach', 'Finance Coach', 'Culture Coach', 'Customer Centricity Coach', 'Exit Readiness Coach'],
      restrictions: [],
      positioning: 'Build a business that runs without you—and is valuable with or without you.',
      idealFor: 'Scaling companies, PE-backed firms, franchisors, and exit-minded owners'
    }
  }
]

const Plans = () => {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingPlan, setEditingPlan] = useState<Partial<Plan> | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newPlan, setNewPlan] = useState<Partial<Plan>>({
    name: '',
    tier: 'FOUNDATION',
    price: 0,
    yearlyPrice: null,
    featuresJson: { features: [] },
    maxMinutes: null,
    active: true
  })
  const [newFeature, setNewFeature] = useState('')
  const [viewMode, setViewMode] = useState<'cards' | 'comparison'>('comparison')

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const data = await api.get('/api/plans')
      const plansData = Array.isArray(data) ? data : []
      
      // If no plans exist, initialize with default plans
      if (plansData.length === 0) {
        // Optionally create default plans via API
        console.log('No plans found. Default plans structure:', DEFAULT_PLANS)
      }
      
      setPlans(plansData)
      setLoading(false)
    } catch (error) {
      console.error('Failed to load plans:', error)
      setLoading(false)
    }
  }

  const handleEdit = (plan: Plan) => {
    setEditingId(plan.id)
    setEditingPlan({ ...plan })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditingPlan(null)
    setShowAddForm(false)
    setNewPlan({
      name: '',
      tier: 'FOUNDATION',
      price: 0,
      yearlyPrice: null,
      featuresJson: { features: [] },
      maxMinutes: null,
      active: true
    })
    setNewFeature('')
  }

  const handleSave = async (id: number) => {
    if (!editingPlan) return

    try {
      const updated = await api.put(`/api/plans/${id}`, editingPlan)
      setPlans(plans.map(p => p.id === id ? updated : p))
      handleCancel()
    } catch (error) {
      console.error('Failed to update plan:', error)
      alert('Failed to update plan')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this plan?')) return

    try {
      await api.delete(`/api/plans/${id}`)
      setPlans(plans.filter(p => p.id !== id))
    } catch (error) {
      console.error('Failed to delete plan:', error)
      alert('Failed to delete plan')
    }
  }

  const handleCreate = async () => {
    try {
      const created = await api.post('/api/plans', newPlan)
      setPlans([...plans, created])
      handleCancel()
    } catch (error) {
      console.error('Failed to create plan:', error)
      alert('Failed to create plan')
    }
  }

  // Unused function - kept for future use
  // const toggleActive = async (plan: Plan) => {
  //   try {
  //     const updated = await api.put(`/api/plans/${plan.id}`, {
  //       ...plan,
  //       active: !plan.active
  //     })
  //     setPlans(plans.map(p => p.id === plan.id ? updated : p))
  //   } catch (error) {
  //     console.error('Failed to toggle plan:', error)
  //   }
  // }

  const addFeature = (planId: number | null, feature: string) => {
    if (!feature.trim()) return

    if (planId === null) {
      setNewPlan({
        ...newPlan,
        featuresJson: {
          features: [...(newPlan.featuresJson?.features || []), feature]
        }
      })
    } else if (editingPlan) {
      setEditingPlan({
        ...editingPlan,
        featuresJson: {
          ...editingPlan.featuresJson,
          features: [...(editingPlan.featuresJson?.features || []), feature]
        }
      })
    }
    setNewFeature('')
  }

  const removeFeature = (planId: number | null, index: number) => {
    if (planId === null) {
      setNewPlan({
        ...newPlan,
        featuresJson: {
          features: (newPlan.featuresJson?.features || []).filter((_, i) => i !== index)
        }
      })
    } else if (editingPlan) {
      setEditingPlan({
        ...editingPlan,
        featuresJson: {
          ...editingPlan.featuresJson,
          features: (editingPlan.featuresJson?.features || []).filter((_, i) => i !== index)
        }
      })
    }
  }

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'FOUNDATION':
        return <Zap className="plan-tier-icon" />
      case 'EXECUTION':
        return <Sparkles className="plan-tier-icon" />
      case 'SCALE':
        return <Crown className="plan-tier-icon" />
      default:
        return <Zap className="plan-tier-icon" />
    }
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'FOUNDATION':
        return '#3b82f6' // Blue
      case 'EXECUTION':
        return '#8b5cf6' // Purple
      case 'SCALE':
        return '#ec4899' // Pink/Rose (Premium tier)
      default:
        return '#3b82f6'
    }
  }

  const getTierGradient = (tier: string) => {
    switch (tier) {
      case 'FOUNDATION':
        return 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)'
      case 'EXECUTION':
        return 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.1) 100%)'
      case 'SCALE':
        return 'linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(219, 39, 119, 0.1) 100%)'
      default:
        return 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)'
    }
  }

  const getTierSummary = (tier: string) => {
    switch (tier) {
      case 'FOUNDATION':
        return 'Think better'
      case 'EXECUTION':
        return 'Execute better'
      case 'SCALE':
        return 'Build enterprise value'
      default:
        return ''
    }
  }

  // Feature categories for comparison table
  const featureCategories = [
    {
      category: 'Voice-to-Voice AI Coaching',
      icon: <Mic size={18} />,
      features: [
        { name: 'Monthly Voice Hours', foundation: '2 hrs', execution: '4 hrs', scale: '8 hrs' },
        { name: 'Strategy Coach', foundation: true, execution: true, scale: true },
        { name: 'Sales Coach', foundation: true, execution: true, scale: true },
        { name: 'Marketing Coach', foundation: false, execution: true, scale: true },
        { name: 'Operations Coach', foundation: false, execution: true, scale: true },
        { name: 'Finance Coach', foundation: false, execution: true, scale: true },
        { name: 'Culture Coach', foundation: false, execution: true, scale: true },
        { name: 'Customer Centricity Coach', foundation: false, execution: false, scale: true },
        { name: 'Exit Readiness Coach', foundation: false, execution: false, scale: true },
        { name: 'Cross-Coach Intelligence', foundation: false, execution: 'Limited', scale: 'Full' },
        { name: 'Long-Term Memory & Pattern Recognition', foundation: false, execution: false, scale: true }
      ]
    },
    {
      category: '10X-BOS Business Operating System',
      icon: <Target size={18} />,
      features: [
        { name: '10X Action Step Framework', foundation: true, execution: true, scale: true },
        { name: '10X Discovery Questions', foundation: true, execution: true, scale: true },
        { name: '10X Business Success Quizzes', foundation: 'Limited', execution: true, scale: 'Advanced' },
        { name: '10X Coach Notetaking', foundation: true, execution: 'Advanced', scale: 'Enterprise' },
        { name: 'Personal TO-DO List', foundation: true, execution: true, scale: true },
        { name: 'Shared Team TO-DO Lists', foundation: false, execution: true, scale: true },
        { name: 'Calendar at-a-Glance', foundation: true, execution: true, scale: true },
        { name: 'Execution Dashboards', foundation: false, execution: 'Standard', scale: 'Advanced' },
        { name: 'Historical Performance Tracking', foundation: false, execution: false, scale: true }
      ]
    },
    {
      category: 'Meetings, Accountability & Execution',
      icon: <Users size={18} />,
      features: [
        { name: '10X 10-Minute Huddles', foundation: false, execution: true, scale: true },
        { name: 'Agenda → Notes → Actions Flow', foundation: false, execution: true, scale: true },
        { name: 'Team Accountability', foundation: false, execution: true, scale: true },
        { name: 'Multi-Team / Department Huddles', foundation: false, execution: false, scale: true },
        { name: 'Execution Audit Trail', foundation: false, execution: false, scale: true },
        { name: 'Weekly Execution Summary', foundation: false, execution: true, scale: true },
        { name: 'Quarterly Execution Review (AI-Generated)', foundation: false, execution: false, scale: true }
      ]
    },
    {
      category: 'Governance, Scale & Exit Readiness',
      icon: <Shield size={18} />,
      features: [
        { name: 'Admin Controls & Permissions', foundation: false, execution: false, scale: true },
        { name: 'Enterprise Value Drivers Tracking', foundation: false, execution: false, scale: true },
        { name: 'Exit Readiness Scoring', foundation: false, execution: false, scale: true },
        { name: 'Customer Experience Maturity Mapping', foundation: false, execution: false, scale: true },
        { name: 'Data Export & Advisor Access', foundation: false, execution: false, scale: true }
      ]
    }
  ]

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading plans...</div>
      </div>
    )
  }

  // Get plans sorted by tier order
  const sortedPlans = [...plans].sort((a, b) => {
    const order = { 'FOUNDATION': 1, 'EXECUTION': 2, 'SCALE': 3 }
    return (order[a.tier as keyof typeof order] || 99) - (order[b.tier as keyof typeof order] || 99)
  })

  return (
    <div className="page-container">
      <div className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 50%, #ec4899 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              3-Tier Subscription Model
            </h1>
            <p className="page-subtitle" style={{ fontSize: '1.1rem', color: 'var(--gray-600)', maxWidth: '900px', lineHeight: '1.6' }}>
              Voice-to-Voice + 10X-BOS: Foundation ($69), Execution ($179), and Scale ($399) tiers designed to drive value, accountability, and enterprise growth
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setViewMode('comparison')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: viewMode === 'comparison' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'comparison' ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                Comparison
              </button>
              <button
                onClick={() => setViewMode('cards')}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: viewMode === 'cards' ? 'var(--primary)' : 'transparent',
                  color: viewMode === 'cards' ? 'white' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
              >
                Cards
              </button>
            </div>
            <button
              className="plan-add-button"
              onClick={() => setShowAddForm(true)}
            >
              <Plus size={20} />
              <span>Create Plan</span>
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'comparison' ? (
        <div className="content-card" style={{ padding: '32px', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-primary)' }}>
            <BarChart3 size={28} />
            Feature Comparison Table
          </h2>
          
          <div style={{ overflowX: 'auto', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
            <table className="plan-comparison-table">
              <thead>
                <tr>
                  <th>Feature</th>
                  {sortedPlans.map(plan => (
                    <th key={plan.id} style={{ background: getTierGradient(plan.tier), color: getTierColor(plan.tier) }}>
                      <div className="tier-header">
                        <div className="tier-header-name">
                          {getTierIcon(plan.tier)}
                          <span>{plan.name}</span>
                        </div>
                        <div className="tier-header-price" style={{ color: getTierColor(plan.tier) }}>
                          ${plan.price}
                          <span>/mo</span>
                        </div>
                        <div className="tier-header-summary">
                          {getTierSummary(plan.tier)}
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {featureCategories.map((category, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr className="category-row">
                      <td colSpan={sortedPlans.length + 1}>
                        {category.icon}
                        {category.category}
                      </td>
                    </tr>
                    {category.features.map((feature, featIdx) => (
                      <tr key={featIdx}>
                        <td>{feature.name}</td>
                        {sortedPlans.map(plan => {
                          const planTier = plan.tier
                          let value: boolean | string = false
                          if (planTier === 'FOUNDATION') value = feature.foundation
                          else if (planTier === 'EXECUTION') value = feature.execution
                          else if (planTier === 'SCALE') value = feature.scale
                          
                          return (
                            <td key={plan.id}>
                              {typeof value === 'boolean' ? (
                                value ? (
                                  <Check size={20} className="feature-check" />
                                ) : (
                                  <XIcon size={20} className="feature-x" />
                                )
                              ) : (
                                <span className={`feature-badge ${value.toLowerCase().replace(/\s+/g, '-')}`}>
                                  {value}
                                </span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Plan Cards View */}
      {viewMode === 'cards' ? (
      <div className="plans-grid-modern">
        {sortedPlans.map((plan) => (
          <div 
            key={plan.id} 
            className={`plan-card-modern ${!plan.active ? 'plan-inactive' : ''} ${editingId === plan.id ? 'plan-editing' : ''}`}
            style={{ 
              '--tier-color': getTierColor(plan.tier),
              '--tier-gradient': getTierGradient(plan.tier)
            } as React.CSSProperties}
          >
            {editingId === plan.id ? (
              <div className="plan-edit-mode">
                <div className="plan-edit-header">
                  <h3>Edit Plan</h3>
                  <button className="plan-close-button" onClick={handleCancel}>
                    <X size={20} />
                  </button>
                </div>
                <div className="plan-form-grid">
                  <div className="plan-form-field">
                    <label>Name</label>
                    <input
                      type="text"
                      value={editingPlan?.name || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    />
                  </div>
                  <div className="plan-form-field">
                    <label>Tier</label>
                    <select
                      value={editingPlan?.tier || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, tier: e.target.value })}
                    >
                      <option value="FOUNDATION">Foundation</option>
                      <option value="EXECUTION">Execution</option>
                      <option value="SCALE">Scale</option>
                    </select>
                  </div>
                  <div className="plan-form-field">
                    <label>Monthly Price ($)</label>
                    <input
                      type="number"
                      value={editingPlan?.price || 0}
                      onChange={(e) => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })}
                    />
                  </div>
                  <div className="plan-form-field">
                    <label>Max Minutes (Voice Hours × 60)</label>
                    <input
                      type="number"
                      value={editingPlan?.maxMinutes || ''}
                      onChange={(e) => setEditingPlan({ ...editingPlan, maxMinutes: e.target.value ? parseInt(e.target.value) : null })}
                    />
                  </div>
                </div>
                <div className="plan-features-section">
                  <label>Features</label>
                  <div className="plan-feature-input">
                    <input
                      type="text"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addFeature(plan.id, newFeature)}
                      placeholder="Add a feature..."
                    />
                    <button className="plan-feature-add-btn" onClick={() => addFeature(plan.id, newFeature)}>
                      <Plus size={16} />
                    </button>
                  </div>
                  <div className="plan-features-list">
                    {(editingPlan?.featuresJson?.features || []).map((feature, idx) => (
                      <div key={idx} className="plan-feature-tag">
                        <Check size={14} />
                        <span>{feature}</span>
                        <button className="plan-feature-remove" onClick={() => removeFeature(plan.id, idx)}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="plan-edit-actions">
                  <button className="plan-save-button" onClick={() => handleSave(plan.id)}>
                    <Save size={18} />
                    <span>Save Changes</span>
                  </button>
                  <button className="plan-cancel-button" onClick={handleCancel}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="plan-card-header">
                  <div className="plan-card-badge" style={{ background: getTierGradient(plan.tier) }}>
                    {getTierIcon(plan.tier)}
                    <span>{plan.tier}</span>
                  </div>
                </div>

                <div className="plan-card-body">
                  <h3 className="plan-name">{plan.name}</h3>
                  
                  {plan.featuresJson?.positioning && (
                    <p style={{ 
                      fontSize: '14px', 
                      color: 'var(--text-secondary)', 
                      marginBottom: '16px', 
                      fontStyle: 'italic',
                      lineHeight: '1.6'
                    }}>
                      "{plan.featuresJson.positioning}"
                    </p>
                  )}

                  {plan.featuresJson?.idealFor && (
                    <div style={{ 
                      padding: '14px', 
                      background: getTierGradient(plan.tier), 
                      borderRadius: '12px', 
                      marginBottom: '20px',
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      border: `1px solid ${getTierColor(plan.tier)}20`
                    }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '6px', fontSize: '14px' }}>Ideal For:</strong>
                      <span>{plan.featuresJson.idealFor}</span>
                    </div>
                  )}
                  
                  <div className="plan-pricing">
                    <div className="plan-price-main">
                      <DollarSign size={24} />
                      <span className="plan-price-amount">{plan.price}</span>
                      <span className="plan-price-period">/month</span>
                    </div>
                  </div>

                  {plan.maxMinutes && (
                    <div className="plan-limit">
                      <Mic size={16} />
                      <span>{plan.maxMinutes / 60} hours/month voice coaching</span>
                    </div>
                  )}

                  {plan.featuresJson?.coaches && plan.featuresJson.coaches.length > 0 && (
                    <div style={{ 
                      padding: '12px', 
                      background: 'rgba(139, 92, 246, 0.05)', 
                      borderRadius: '10px', 
                      marginBottom: '20px',
                      fontSize: '13px'
                    }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                        Available Coaches ({plan.featuresJson.coaches.length}):
                      </strong>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {plan.featuresJson.coaches.map((coach, idx) => (
                          <span key={idx} style={{
                            padding: '4px 10px',
                            background: 'rgba(139, 92, 246, 0.1)',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                            color: '#8b5cf6'
                          }}>
                            {coach}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {plan.featuresJson?.restrictions && plan.featuresJson.restrictions.length > 0 && (
                    <div style={{ 
                      padding: '12px', 
                      background: 'rgba(239, 68, 68, 0.05)', 
                      borderRadius: '10px', 
                      marginBottom: '20px',
                      fontSize: '13px'
                    }}>
                      <strong style={{ color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                        Restrictions:
                      </strong>
                      <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)' }}>
                        {plan.featuresJson.restrictions.map((restriction, idx) => (
                          <li key={idx}>{restriction}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="plan-features-display">
                    <div style={{ fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)', fontSize: '15px' }}>
                      Key Features:
                    </div>
                    {(plan.featuresJson?.features || []).map((feature, idx) => (
                      <div key={idx} className="plan-feature-item">
                        <Check size={18} className="plan-feature-check" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="plan-card-footer">
                  <button className="plan-action-button edit" onClick={() => handleEdit(plan)}>
                    <Edit size={18} />
                    <span>Edit</span>
                  </button>
                  <button className="plan-action-button delete" onClick={() => handleDelete(plan.id)}>
                    <Trash2 size={18} />
                    <span>Delete</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      ) : null}

      {/* Add Plan Form */}
      {showAddForm && (
        <div className="plan-form-card">
          <div className="plan-form-header">
            <h2>Create New Plan</h2>
            <button className="plan-close-button" onClick={handleCancel}>
              <X size={20} />
            </button>
          </div>
          <div className="plan-form-body">
            <div className="plan-form-grid">
              <div className="plan-form-field">
                <label>Plan Name</label>
                <input
                  type="text"
                  value={newPlan.name || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                  placeholder="e.g., Foundation"
                />
              </div>
              <div className="plan-form-field">
                <label>Tier</label>
                <select
                  value={newPlan.tier || 'FOUNDATION'}
                  onChange={(e) => setNewPlan({ ...newPlan, tier: e.target.value })}
                >
                  <option value="FOUNDATION">Foundation</option>
                  <option value="EXECUTION">Execution</option>
                  <option value="SCALE">Scale</option>
                </select>
              </div>
              <div className="plan-form-field">
                <label>Monthly Price ($)</label>
                <input
                  type="number"
                  value={newPlan.price || 0}
                  onChange={(e) => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) })}
                />
              </div>
              <div className="plan-form-field">
                <label>Max Minutes (Voice Hours × 60)</label>
                <input
                  type="number"
                  value={newPlan.maxMinutes || ''}
                  onChange={(e) => setNewPlan({ ...newPlan, maxMinutes: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="e.g., 120 for 2 hours"
                />
              </div>
            </div>
            <div className="plan-features-section">
              <label>Features</label>
              <div className="plan-feature-input">
                <input
                  type="text"
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addFeature(null, newFeature)}
                  placeholder="Add a feature..."
                />
                <button className="plan-feature-add-btn" onClick={() => addFeature(null, newFeature)}>
                  <Plus size={16} />
                </button>
              </div>
              <div className="plan-features-list">
                {(newPlan.featuresJson?.features || []).map((feature, idx) => (
                  <div key={idx} className="plan-feature-tag">
                    <Check size={14} />
                    <span>{feature}</span>
                    <button className="plan-feature-remove" onClick={() => removeFeature(null, idx)}>
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="plan-form-footer">
            <button className="plan-save-button" onClick={handleCreate}>
              <Save size={18} />
              <span>Create Plan</span>
            </button>
            <button className="plan-cancel-button" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Overage Pricing Info */}
      <div className="content-card" style={{ marginTop: '24px', padding: '24px' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <DollarSign size={20} />
          Overage Voice Time
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
              Additional Voice Hours
            </div>
            <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              $35 per additional hour - Designed to nudge upgrades rather than replace them
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 900, color: 'var(--primary)' }}>
            $35/hr
          </div>
        </div>
      </div>
    </div>
  )
}

export default Plans
