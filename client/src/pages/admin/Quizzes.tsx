import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Save, X, FileText, Hash, Type, Weight, List, Tag } from 'lucide-react'
import { api } from '../../utils/api'
import '../PageStyles.css'
import './AdminPages.css'

interface Pillar {
  id: number
  tag: string
  name: string
  icon: string | null
  color: string | null
  description: string | null
  active: boolean
  order: number
}

const QUESTION_TYPES = [
  { value: 'SCALE', label: 'Scale (1-10)' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple Choice' },
  { value: 'OPEN', label: 'Open Text' }
]

interface QuizQuestion {
  id: number
  text: string
  type: 'SCALE' | 'MULTIPLE_CHOICE' | 'OPEN'
  pillarTag: string
  weight: number
  order: number
  options?: any
}

interface QuestionsByPillar {
  [pillarTag: string]: QuizQuestion[]
}

const Quizzes = () => {
  const [questionsByPillar, setQuestionsByPillar] = useState<QuestionsByPillar>({})
  const [pillars, setPillars] = useState<Pillar[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPillar, setSelectedPillar] = useState<string>('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [isAddingPillar, setIsAddingPillar] = useState(false)
  const [editingPillarId, setEditingPillarId] = useState<number | null>(null)
  const [pillarFormData, setPillarFormData] = useState({
    tag: '',
    name: '',
    icon: '📋',
    color: '#6b7280',
    description: '',
    order: 0
  })
  const [formData, setFormData] = useState({
    text: '',
    type: 'SCALE' as 'SCALE' | 'MULTIPLE_CHOICE' | 'OPEN',
    pillarTag: '',
    weight: 1.0,
    order: 0,
    options: null as any
  })

  useEffect(() => {
    fetchQuestions()
  }, [])

  useEffect(() => {
    // Update form data when pillar selection changes
    if (selectedPillar && !editingId && !isAdding) {
      setFormData(prev => ({ ...prev, pillarTag: selectedPillar }))
    }
  }, [selectedPillar])

  const fetchQuestions = async () => {
    try {
      setLoading(true)
      const data = await api.get('/api/admin/manage-quiz-questions')
      if (data.questionsByPillar) {
        setQuestionsByPillar(data.questionsByPillar)
      }
      if (data.pillars && Array.isArray(data.pillars)) {
        setPillars(data.pillars)
        // Set default selected pillar if none selected
        if (!selectedPillar && data.pillars.length > 0) {
          setSelectedPillar(data.pillars[0].tag)
          setFormData(prev => ({ ...prev, pillarTag: data.pillars[0].tag }))
        }
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error)
      alert('Failed to load quiz questions')
    } finally {
      setLoading(false)
    }
  }

  const fetchPillars = async () => {
    try {
      const data = await api.get('/api/admin/manage-pillars')
      if (Array.isArray(data)) {
        setPillars(data)
        if (!selectedPillar && data.length > 0) {
          setSelectedPillar(data[0].tag)
        }
      }
    } catch (error) {
      console.error('Failed to fetch pillars:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      text: '',
      type: 'SCALE',
      pillarTag: selectedPillar,
      weight: 1.0,
      order: 0,
      options: null
    })
    setEditingId(null)
    setIsAdding(false)
  }

  const handleEdit = (question: QuizQuestion) => {
    setFormData({
      text: question.text,
      type: question.type,
      pillarTag: question.pillarTag,
      weight: question.weight,
      order: question.order,
      options: question.options || null
    })
    setEditingId(question.id)
    setIsAdding(false)
    // Switch to the pillar of the question being edited
    if (question.pillarTag !== selectedPillar) {
      setSelectedPillar(question.pillarTag)
    }
  }

  const handleAdd = () => {
    const questions = questionsByPillar[selectedPillar] || []
    const maxOrder = questions.length > 0 
      ? Math.max(...questions.map(q => q.order)) + 1 
      : 0
    
    resetForm()
    setFormData(prev => ({
      ...prev,
      pillarTag: selectedPillar,
      order: maxOrder
    }))
    setIsAdding(true)
  }

  const handleSave = async () => {
    if (!formData.text.trim()) {
      alert('Question text is required')
      return
    }

    try {
      if (editingId) {
        // Update existing question
        await api.put(`/api/admin/manage-quiz-questions/${editingId}`, formData)
        alert('Question updated successfully!')
      } else {
        // Create new question
        await api.post('/api/admin/manage-quiz-questions', formData)
        alert('Question added successfully!')
      }
      resetForm()
      fetchQuestions()
    } catch (error: any) {
      console.error('Failed to save question:', error)
      alert(error.message || 'Failed to save question')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/api/admin/manage-quiz-questions/${id}`)
      alert('Question deleted successfully!')
      fetchQuestions()
    } catch (error: any) {
      console.error('Failed to delete question:', error)
      alert(error.message || 'Failed to delete question')
    }
  }

  const getQuestionTypeLabel = (type: string) => {
    return QUESTION_TYPES.find(t => t.value === type)?.label || type
  }

  const getPillarInfo = (tag: string) => {
    const pillar = pillars.find(p => p.tag === tag)
    return pillar || { name: tag, icon: '📋', color: '#6b7280' }
  }

  const resetPillarForm = () => {
    setPillarFormData({
      tag: '',
      name: '',
      icon: '📋',
      color: '#6b7280',
      description: '',
      order: pillars.length
    })
    setEditingPillarId(null)
    setIsAddingPillar(false)
  }

  const handleAddPillar = () => {
    resetPillarForm()
    setIsAddingPillar(true)
  }

  const handleEditPillar = (pillar: Pillar) => {
    setPillarFormData({
      tag: pillar.tag,
      name: pillar.name,
      icon: pillar.icon || '📋',
      color: pillar.color || '#6b7280',
      description: pillar.description || '',
      order: pillar.order
    })
    setEditingPillarId(pillar.id)
    setIsAddingPillar(true)
  }

  const handleSavePillar = async () => {
    if (!pillarFormData.tag.trim() || !pillarFormData.name.trim()) {
      alert('Tag and name are required')
      return
    }

    // Validate tag format
    const tagRegex = /^[A-Z_]+$/
    if (!tagRegex.test(pillarFormData.tag.toUpperCase())) {
      alert('Tag must be uppercase letters and underscores only (e.g., CUSTOM_PILLAR)')
      return
    }

    try {
      if (editingPillarId) {
        await api.put(`/api/admin/manage-pillars/${editingPillarId}`, {
          name: pillarFormData.name,
          icon: pillarFormData.icon,
          color: pillarFormData.color,
          description: pillarFormData.description,
          order: pillarFormData.order
        })
        alert('Pillar updated successfully!')
      } else {
        await api.post('/api/admin/manage-pillars', {
          ...pillarFormData,
          tag: pillarFormData.tag.toUpperCase()
        })
        alert('Pillar added successfully!')
      }
      resetPillarForm()
      await fetchPillars()
      await fetchQuestions()
      // Select the newly created/updated pillar
      if (!editingPillarId) {
        setSelectedPillar(pillarFormData.tag.toUpperCase())
      }
    } catch (error: any) {
      console.error('Failed to save pillar:', error)
      alert(error.message || 'Failed to save pillar')
    }
  }

  const handleDeletePillar = async (id: number, tag: string) => {
    if (!confirm(`Are you sure you want to delete this pillar? This will also delete all questions in this pillar.`)) {
      return
    }

    try {
      await api.delete(`/api/admin/manage-pillars/${id}`)
      alert('Pillar deleted successfully!')
      await fetchPillars()
      await fetchQuestions()
      // Select first pillar if current one was deleted
      if (selectedPillar === tag) {
        const remainingPillars = pillars.filter(p => p.id !== id)
        if (remainingPillars.length > 0) {
          setSelectedPillar(remainingPillars[0].tag)
        }
      }
    } catch (error: any) {
      console.error('Failed to delete pillar:', error)
      alert(error.message || 'Failed to delete pillar')
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading quiz questions...</div>
      </div>
    )
  }

  const selectedPillarInfo = getPillarInfo(selectedPillar)
  const questions = questionsByPillar[selectedPillar] || []
  const isEditing = editingId !== null && questions.some(q => q.id === editingId)

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Quizzes & Diagnostics</h1>
          <p className="page-subtitle">Manage quiz questions organized by business pillars</p>
        </div>
      </div>

      {/* Pillar Selector */}
      <div className="admin-quiz-selector-card">
        <div className="admin-quiz-selector-header">
          <div className="admin-quiz-selector-left">
            <span className="admin-quiz-pillar-icon">{selectedPillarInfo.icon}</span>
            <div>
              <label htmlFor="pillar-select" className="admin-quiz-selector-label">
                Select Pillar
              </label>
              <select
                id="pillar-select"
                className="admin-quiz-pillar-select"
                value={selectedPillar}
                onChange={(e) => {
                  setSelectedPillar(e.target.value)
                  resetForm()
                }}
                style={{ '--pillar-color': selectedPillarInfo.color } as React.CSSProperties}
              >
                {pillars.map((pillar) => (
                  <option key={pillar.id} value={pillar.tag}>
                    {pillar.icon} {pillar.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="admin-quiz-selector-right">
            <div className="admin-quiz-pillar-count-badge">
              {questions.length} {questions.length === 1 ? 'question' : 'questions'}
            </div>
            <button
              className="admin-add-button"
              onClick={handleAddPillar}
              title="Add New Pillar"
            >
              <Tag size={18} />
              <span>Add Pillar</span>
            </button>
            <button
              className="admin-add-button"
              onClick={handleAdd}
              title="Add Question to Selected Pillar"
            >
              <Plus size={18} />
              <span>Add Question</span>
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Pillar Form */}
      {isAddingPillar && (
        <div className="admin-quiz-form-card">
          <div className="admin-quiz-form-header">
            <h3>{editingPillarId ? 'Edit Pillar' : 'Add New Pillar'}</h3>
            <button className="admin-form-close" onClick={resetPillarForm}>
              <X size={20} />
            </button>
          </div>
          <div className="admin-quiz-form-body">
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>
                  <Tag size={16} />
                  Tag * (e.g., CUSTOM_PILLAR)
                </label>
                <input
                  type="text"
                  value={pillarFormData.tag}
                  onChange={(e) => setPillarFormData({ ...pillarFormData, tag: e.target.value.toUpperCase().replace(/[^A-Z_]/g, '') })}
                  placeholder="CUSTOM_PILLAR"
                  required
                  disabled={!!editingPillarId}
                />
                <small style={{ color: 'var(--gray-500)', fontSize: '12px' }}>
                  Uppercase letters and underscores only. Cannot be changed after creation.
                </small>
              </div>

              <div className="admin-form-group">
                <label>
                  <FileText size={16} />
                  Name *
                </label>
                <input
                  type="text"
                  value={pillarFormData.name}
                  onChange={(e) => setPillarFormData({ ...pillarFormData, name: e.target.value })}
                  placeholder="Custom Pillar Name"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>
                  <span style={{ fontSize: '20px' }}>🎨</span>
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  value={pillarFormData.icon}
                  onChange={(e) => setPillarFormData({ ...pillarFormData, icon: e.target.value })}
                  placeholder="📋"
                  maxLength={2}
                />
              </div>

              <div className="admin-form-group">
                <label>
                  <span style={{ fontSize: '16px' }}>🎨</span>
                  Color (Hex)
                </label>
                <input
                  type="color"
                  value={pillarFormData.color}
                  onChange={(e) => setPillarFormData({ ...pillarFormData, color: e.target.value })}
                />
              </div>

              <div className="admin-form-group full-width">
                <label>Description</label>
                <textarea
                  value={pillarFormData.description}
                  onChange={(e) => setPillarFormData({ ...pillarFormData, description: e.target.value })}
                  placeholder="Pillar description..."
                  rows={2}
                />
              </div>

              <div className="admin-form-group">
                <label>
                  <Hash size={16} />
                  Order
                </label>
                <input
                  type="number"
                  min="0"
                  value={pillarFormData.order}
                  onChange={(e) => setPillarFormData({ ...pillarFormData, order: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>
          <div className="admin-form-footer">
            <button
              className="admin-form-btn admin-form-btn-primary"
              onClick={handleSavePillar}
            >
              <Save size={16} />
              <span>{editingPillarId ? 'Update Pillar' : 'Add Pillar'}</span>
            </button>
            <button
              className="admin-form-btn"
              onClick={resetPillarForm}
            >
              <X size={16} />
              <span>Cancel</span>
            </button>
            {editingPillarId && (
              <button
                className="admin-form-btn danger"
                onClick={() => {
                  const pillar = pillars.find(p => p.id === editingPillarId)
                  if (pillar) {
                    handleDeletePillar(pillar.id, pillar.tag)
                  }
                }}
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Selected Pillar Content */}
      <div className="admin-quiz-pillar-section">
        <div 
          className="admin-quiz-pillar-header-static"
          style={{ '--pillar-color': selectedPillarInfo.color } as React.CSSProperties}
        >
          <div className="admin-quiz-pillar-header-left">
            <span className="admin-quiz-pillar-icon">{selectedPillarInfo.icon}</span>
            <div>
              <h2 className="admin-quiz-pillar-name">{selectedPillarInfo.name}</h2>
              <p className="admin-quiz-pillar-count">
                {questions.length} {questions.length === 1 ? 'question' : 'questions'}
              </p>
            </div>
          </div>
          <div className="admin-quiz-pillar-header-right">
            <button
              className="admin-action-button"
              onClick={() => {
                const pillar = pillars.find(p => p.tag === selectedPillar)
                if (pillar) {
                  handleEditPillar(pillar)
                }
              }}
              title="Edit Pillar"
            >
              <Edit2 size={16} />
              <span>Edit Pillar</span>
            </button>
          </div>
        </div>

        <div className="admin-quiz-pillar-content">
          {/* Add/Edit Form */}
          {(isAdding || isEditing) && (
            <div className="admin-quiz-form-card">
              <div className="admin-quiz-form-header">
                <h3>{editingId ? 'Edit Question' : 'Add New Question'}</h3>
                <button className="admin-form-close" onClick={resetForm}>
                  <X size={20} />
                </button>
              </div>
              <div className="admin-quiz-form-body">
                <div className="admin-form-grid">
                  <div className="admin-form-group full-width">
                    <label>
                      <FileText size={16} />
                      Question Text *
                    </label>
                    <textarea
                      value={formData.text}
                      onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                      placeholder="Enter the question text..."
                      rows={3}
                      required
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      <Type size={16} />
                      Question Type *
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      required
                    >
                      {QUESTION_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label>
                      <Hash size={16} />
                      Order
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="admin-form-group">
                    <label>
                      <Weight size={16} />
                      Weight
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={formData.weight}
                      onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) || 1.0 })}
                    />
                  </div>

                  {formData.type === 'MULTIPLE_CHOICE' && (
                    <div className="admin-form-group full-width">
                      <label>
                        <List size={16} />
                        Options (JSON array, e.g., ["Option 1", "Option 2", "Option 3"])
                      </label>
                      <textarea
                        value={formData.options ? JSON.stringify(formData.options, null, 2) : ''}
                        onChange={(e) => {
                          try {
                            const parsed = e.target.value ? JSON.parse(e.target.value) : null
                            setFormData({ ...formData, options: parsed })
                          } catch {
                            // Invalid JSON, keep as is for now
                          }
                        }}
                        placeholder='["Option 1", "Option 2", "Option 3"]'
                        rows={4}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="admin-form-footer">
                <button
                  className="admin-form-btn admin-form-btn-primary"
                  onClick={handleSave}
                >
                  <Save size={16} />
                  <span>{editingId ? 'Update Question' : 'Add Question'}</span>
                </button>
                <button
                  className="admin-form-btn"
                  onClick={resetForm}
                >
                  <X size={16} />
                  <span>Cancel</span>
                </button>
              </div>
            </div>
          )}

          {/* Questions List */}
          {questions.length === 0 && !isAdding && (
            <div className="admin-quiz-empty">
              <FileText size={32} />
              <p>No questions for this pillar yet</p>
              <button
                className="admin-add-button"
                onClick={handleAdd}
              >
                <Plus size={16} />
                <span>Add First Question</span>
              </button>
            </div>
          )}

          {questions.map((question, index) => (
            <div key={question.id} className="admin-quiz-question-card">
              <div className="admin-quiz-question-header">
                <div className="admin-quiz-question-number">
                  <span>Q{index + 1}</span>
                </div>
                <div className="admin-quiz-question-content">
                  <p className="admin-quiz-question-text">{question.text}</p>
                  <div className="admin-quiz-question-meta">
                    <span className="admin-quiz-question-badge">{getQuestionTypeLabel(question.type)}</span>
                    <span className="admin-quiz-question-badge">Order: {question.order}</span>
                    <span className="admin-quiz-question-badge">Weight: {question.weight}</span>
                    {question.options && Array.isArray(question.options) && (
                      <span className="admin-quiz-question-badge">
                        {question.options.length} options
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="admin-quiz-question-actions">
                <button
                  className="admin-action-button"
                  onClick={() => handleEdit(question)}
                  title="Edit Question"
                >
                  <Edit2 size={16} />
                  <span>Edit</span>
                </button>
                <button
                  className="admin-action-button danger"
                  onClick={() => handleDelete(question.id)}
                  title="Delete Question"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Quizzes
