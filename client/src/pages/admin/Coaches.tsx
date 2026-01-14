import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Edit2, Save, X, Settings, ToggleLeft, ToggleRight, User, Mail, Briefcase, MessageSquare, Upload, Image as ImageIcon, Mic } from 'lucide-react'
import { api } from '../../utils/api'
import '../PageStyles.css'
import './AdminPages.css'

interface Coach {
  id: number
  name: string
  email?: string
  role: string
  specialty?: string
  description?: string
  tagline?: string
  avatar?: string
  active: boolean
  model: string
  temperature: number
  maxTokens: number
}

const COACH_ROLES = [
  'STRATEGY',
  'SALES',
  'MARKETING',
  'OPERATIONS',
  'FINANCE',
  'CULTURE',
  'CUSTOMER_CENTRICITY',
  'EXIT_STRATEGY'
]

const Coaches = () => {
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editingPromptId, setEditingPromptId] = useState<number | null>(null)
  const [editingPrompt, setEditingPrompt] = useState('')
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'STRATEGY',
    specialty: '',
    description: '',
    tagline: '',
    avatar: '',
    model: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2000,
    voiceId: 'echo', // Default voice
    active: true
  })
  
  // Available OpenAI voices
  const OPENAI_VOICES = [
    { value: 'alloy', label: 'Alloy (Neutral)' },
    { value: 'ash', label: 'Ash (Male)' },
    { value: 'ballad', label: 'Ballad (Neutral)' },
    { value: 'coral', label: 'Coral (Female)' },
    { value: 'echo', label: 'Echo (Male)' },
    { value: 'sage', label: 'Sage (Female)' },
    { value: 'shimmer', label: 'Shimmer (Female)' },
    { value: 'verse', label: 'Verse (Male)' },
    { value: 'marin', label: 'Marin (Male)' },
    { value: 'cedar', label: 'Cedar (Male)' }
  ]

  useEffect(() => {
    fetchCoaches()
  }, [])

  const fetchCoaches = async () => {
    try {
      setLoading(true)
      const data = await api.get('/api/admin/manage-coaches')
      if (Array.isArray(data)) {
        setCoaches(data.map((coach: any) => ({
          id: coach.id,
          name: coach.name,
          email: coach.email,
          role: coach.role || 'STRATEGY',
          specialty: coach.specialty,
          description: coach.description,
          tagline: coach.tagline,
          avatar: coach.avatar,
          active: coach.active !== false,
          model: coach.model || 'gpt-4',
          temperature: coach.temperature || 0.7,
          maxTokens: coach.maxTokens || 2000,
          voiceId: coach.voiceId || 'echo'
        })))
      }
    } catch (error) {
      console.error('Failed to fetch coaches:', error)
      alert('Failed to load coaches')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      role: 'STRATEGY',
      specialty: '',
      description: '',
      tagline: '',
      avatar: '',
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      active: true
    })
    setEditingId(null)
    setShowAddForm(false)
    setPhotoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handlePhotoUpload = async (file: File) => {
    if (!file) return null

    setUploadingPhoto(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('photo', file)
      uploadFormData.append('coachName', formData.name || 'coach')

      const token = localStorage.getItem('token') || sessionStorage.getItem('token')
      const baseURL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001'
      
      const response = await fetch(`${baseURL}/api/coaches/upload-photo`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: uploadFormData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload photo')
      }

      const data = await response.json()
      return data.filePath
    } catch (error: any) {
      console.error('Photo upload error:', error)
      alert(error.message || 'Failed to upload photo')
      return null
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAddCoach = async () => {
    if (!formData.name.trim()) {
      alert('Coach name is required')
      return
    }

    try {
      // Upload photo if a file is selected
      let avatarUrl = formData.avatar
      const fileInput = fileInputRef.current
      if (fileInput?.files?.[0]) {
        const uploadedPath = await handlePhotoUpload(fileInput.files[0])
        if (uploadedPath) {
          avatarUrl = uploadedPath
        }
      }

      // Create coach with avatar URL
      await api.post('/api/coaches', {
        ...formData,
        avatar: avatarUrl
      })
      alert('Coach added successfully!')
      resetForm()
      fetchCoaches()
    } catch (error: any) {
      console.error('Failed to add coach:', error)
      alert(error.message || 'Failed to add coach')
    }
  }

  const handleEditCoach = (coach: Coach) => {
    setFormData({
      name: coach.name,
      email: coach.email || '',
      role: coach.role,
      specialty: coach.specialty || '',
      description: coach.description || '',
      tagline: coach.tagline || '',
      avatar: coach.avatar || '',
      model: coach.model,
      temperature: coach.temperature,
      maxTokens: coach.maxTokens,
      voiceId: (coach as any).voiceId || 'echo',
      active: coach.active
    })
    setPhotoPreview(coach.avatar || null)
    setEditingId(coach.id)
    setShowAddForm(true)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUpdateCoach = async () => {
    if (!formData.name.trim()) {
      alert('Coach name is required')
      return
    }

    if (!editingId) return

    try {
      // Upload photo if a new file is selected
      let avatarUrl = formData.avatar
      const fileInput = fileInputRef.current
      if (fileInput?.files?.[0]) {
        const uploadedPath = await handlePhotoUpload(fileInput.files[0])
        if (uploadedPath) {
          avatarUrl = uploadedPath
        }
      }

      // Update coach with avatar URL
      await api.put(`/api/coaches/${editingId}`, {
        ...formData,
        avatar: avatarUrl
      })
      alert('Coach updated successfully!')
      resetForm()
      fetchCoaches()
    } catch (error: any) {
      console.error('Failed to update coach:', error)
      alert(error.message || 'Failed to update coach')
    }
  }

  const handleDeleteCoach = async (id: number) => {
    if (!confirm('Are you sure you want to delete this coach? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/api/coaches/${id}`)
      alert('Coach deleted successfully!')
      fetchCoaches()
    } catch (error: any) {
      console.error('Failed to delete coach:', error)
      alert(error.message || 'Failed to delete coach')
    }
  }

  const toggleActive = async (id: number, currentActive: boolean) => {
    try {
      await api.put(`/api/coaches/${id}`, { active: !currentActive })
      fetchCoaches()
    } catch (error: any) {
      console.error('Failed to toggle coach status:', error)
      alert('Failed to update coach status')
    }
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading">Loading coaches...</div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>Coaches & Knowledge</h1>
          <p className="page-subtitle">Manage coaches that are visible to users. Add, edit, or remove coaches.</p>
        </div>
        <button
          className="admin-add-button"
          onClick={() => {
            resetForm()
            setShowAddForm(true)
          }}
        >
          <Plus size={20} />
          <span>Add New Coach</span>
        </button>
      </div>

      {/* Add/Edit Coach Form */}
      {showAddForm && (
        <div className="admin-form-card">
          <div className="admin-form-header">
            <h2>{editingId ? 'Edit Coach' : 'Add New Coach'}</h2>
            <button className="admin-form-close" onClick={resetForm}>
              <X size={20} />
            </button>
          </div>
          <div className="admin-form-body">
            <div className="admin-form-grid">
              <div className="admin-form-group">
                <label>
                  <User size={16} />
                  Coach Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Alan Wozniak"
                  required
                />
              </div>

              <div className="admin-form-group">
                <label>
                  <Mail size={16} />
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="coach@10xcoach.ai"
                />
              </div>

              <div className="admin-form-group">
                <label>
                  <Briefcase size={16} />
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  required
                >
                  {COACH_ROLES.map(role => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label>
                  <Briefcase size={16} />
                  Specialty
                </label>
                <input
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                  placeholder="e.g., Business Strategy & Problem-Solving"
                />
              </div>

              <div className="admin-form-group full-width">
                <label>
                  <MessageSquare size={16} />
                  Tagline
                </label>
                <input
                  type="text"
                  value={formData.tagline}
                  onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                  placeholder="e.g., Let's think bigger and move faster—with focus."
                />
              </div>

              <div className="admin-form-group full-width">
                <label>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Coach description..."
                  rows={3}
                />
              </div>

              <div className="admin-form-group full-width">
                <label>
                  <ImageIcon size={16} />
                  Coach Photo
                </label>
                <div className="photo-upload-container">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    id="coach-photo-upload"
                  />
                  <label htmlFor="coach-photo-upload" className="photo-upload-button">
                    <Upload size={20} />
                    <span>{photoPreview || formData.avatar ? 'Change Photo' : 'Upload Photo'}</span>
                  </label>
                  {(photoPreview || formData.avatar) && (
                    <div className="photo-preview">
                      <img 
                        src={photoPreview || formData.avatar || ''} 
                        alt="Coach preview" 
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                        }}
                      />
                      <button
                        type="button"
                        className="photo-remove"
                        onClick={() => {
                          setPhotoPreview(null)
                          setFormData({ ...formData, avatar: '' })
                          if (fileInputRef.current) {
                            fileInputRef.current.value = ''
                          }
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  )}
                  {uploadingPhoto && (
                    <div className="upload-progress">Uploading...</div>
                  )}
                  {formData.avatar && !photoPreview && (
                    <div className="photo-url-info">
                      <small>Current: {formData.avatar}</small>
                    </div>
                  )}
                </div>
              </div>

              <div className="admin-form-group">
                <label>Model</label>
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4o-mini">GPT-4o Mini</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                </select>
              </div>

              <div className="admin-form-group">
                <label>Temperature</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="2"
                  value={formData.temperature}
                  onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) })}
                />
              </div>

              <div className="admin-form-group">
                <label>Max Tokens</label>
                <input
                  type="number"
                  min="100"
                  max="4000"
                  value={formData.maxTokens}
                  onChange={(e) => setFormData({ ...formData, maxTokens: parseInt(e.target.value) })}
                />
              </div>

              <div className="admin-form-group">
                <label>
                  <Mic size={16} />
                  Voice (OpenAI Realtime API)
                </label>
                <select
                  value={formData.voiceId || 'echo'}
                  onChange={(e) => setFormData({ ...formData, voiceId: e.target.value })}
                >
                  {OPENAI_VOICES.map(voice => (
                    <option key={voice.value} value={voice.value}>{voice.label}</option>
                  ))}
                </select>
              </div>

              <div className="admin-form-group">
                <label className="admin-checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.active}
                    onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  />
                  <span>Active (visible to users)</span>
                </label>
              </div>
            </div>
          </div>
          <div className="admin-form-footer">
            <button
              className="admin-form-btn admin-form-btn-primary"
              onClick={editingId ? handleUpdateCoach : handleAddCoach}
            >
              <Save size={16} />
              <span>{editingId ? 'Update Coach' : 'Add Coach'}</span>
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

      {/* Coaches Grid */}
      {coaches.length === 0 ? (
        <div className="admin-empty-state">
          <User size={48} />
          <h3>No Coaches Yet</h3>
          <p>Add your first coach to make them available to users</p>
          <button
            className="admin-add-button"
            onClick={() => {
              resetForm()
              setShowAddForm(true)
            }}
          >
            <Plus size={20} />
            <span>Add First Coach</span>
          </button>
        </div>
      ) : (
        <div className="coaches-admin-grid">
          {coaches.map(coach => (
            <div key={coach.id} className={`coach-admin-card ${!coach.active ? 'inactive' : ''}`}>
              <div className="coach-admin-header">
                <div className="coach-admin-info">
                  {coach.avatar && (
                    <img src={coach.avatar} alt={coach.name} className="coach-admin-avatar" />
                  )}
                  <div>
                    <h3>{coach.name}</h3>
                    <p className="coach-pillar">{coach.role}</p>
                    {coach.specialty && <p className="coach-specialty-text">{coach.specialty}</p>}
                  </div>
                </div>
                <button
                  className="toggle-button"
                  onClick={() => toggleActive(coach.id, coach.active)}
                  title={coach.active ? 'Deactivate (hide from users)' : 'Activate (show to users)'}
                >
                  {coach.active ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                </button>
              </div>
              
              {coach.tagline && (
                <p className="coach-tagline">"{coach.tagline}"</p>
              )}
              
              {coach.description && (
                <p className="coach-description-text">{coach.description}</p>
              )}

              <div className="coach-settings">
                <div className="setting-item">
                  <span className="setting-label">Model:</span>
                  <span className="setting-value">{coach.model}</span>
                </div>
                <div className="setting-item">
                  <span className="setting-label">Temperature:</span>
                  <span className="setting-value">{coach.temperature}</span>
                </div>
                <div className="setting-item">
                  <span className="setting-label">Max Tokens:</span>
                  <span className="setting-value">{coach.maxTokens}</span>
                </div>
                <div className="setting-item">
                  <span className="setting-label">Status:</span>
                  <span className={`setting-value ${coach.active ? 'active' : 'inactive'}`}>
                    {coach.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              <div className="coach-actions">
                <button 
                  className="admin-action-button"
                  onClick={() => handleEditCoach(coach)}
                  title="Edit Coach"
                >
                  <Edit2 size={16} />
                  <span>Edit</span>
                </button>
                <button 
                  className="admin-action-button"
                  onClick={async () => {
                    try {
                      const coachData = await api.get(`/api/coaches/${coach.id}`)
                      const prompt = coachData.personaJson?.systemPrompt || coachData.personaJson?.prompt || ''
                      setEditingPrompt(prompt)
                      setEditingPromptId(coach.id)
                    } catch (error) {
                      console.error('Failed to load coach:', error)
                      alert('Failed to load coach details')
                    }
                  }}
                  title="Edit AI Prompt"
                >
                  <Settings size={16} />
                  <span>Prompt</span>
                </button>
                <button 
                  className="admin-action-button danger"
                  onClick={() => handleDeleteCoach(coach.id)}
                  title="Delete Coach"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Prompt Modal */}
      {editingPromptId && (
        <div className="user-modal-overlay" onClick={() => setEditingPromptId(null)}>
          <div className="user-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="user-modal-header">
              <h2>Edit Prompt for {coaches.find(c => c.id === editingPromptId)?.name}</h2>
              <button className="user-modal-close" onClick={() => setEditingPromptId(null)}>×</button>
            </div>
            <div className="user-modal-body">
              <textarea
                value={editingPrompt}
                onChange={(e) => setEditingPrompt(e.target.value)}
                style={{ width: '100%', minHeight: '300px', padding: '1rem', marginBottom: '1rem', fontFamily: 'monospace' }}
                placeholder="Enter system prompt..."
              />
            </div>
            <div className="user-modal-footer">
              <button
                className="user-modal-btn user-modal-btn-primary"
                onClick={async () => {
                  try {
                    await api.put(`/api/coaches/${editingPromptId}`, {
                      personaJson: { systemPrompt: editingPrompt }
                    })
                    alert('Prompt updated successfully!')
                    setEditingPromptId(null)
                    fetchCoaches()
                  } catch (error) {
                    console.error('Failed to update prompt:', error)
                    alert('Failed to update prompt')
                  }
                }}
              >
                <Settings size={16} />
                <span>Save</span>
              </button>
              <button
                className="user-modal-btn"
                onClick={() => setEditingPromptId(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Coaches
