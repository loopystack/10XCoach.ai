import { useEffect, useState } from 'react'
import { ListTodo, CheckCircle2, Circle, Clock, Plus, Edit2, Trash2, X, Search, Filter, AlertCircle, Calendar as CalendarIcon, User, CalendarDays, Grid3x3, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '../utils/api'
import { notify } from '../utils/notification'
import './PageStyles.css'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface Todo {
  id: number
  title: string
  description?: string | null
  user_id?: number
  userId?: number
  assigned_to?: string | null
  assignedTo?: string | null
  due_date?: string | null
  dueDate?: string | null
  status: string
  priority: string
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  user_name?: string
  client_name?: string
}

interface User {
  id: number
  name: string
}

interface Huddle {
  id: number
  title: string
  huddle_date: string
  huddleDate?: string
  coach_name?: string
  status: string
}

interface ActionStep {
  id: number
  description: string
  due_date: string | null
  dueDate?: string | null
  status: string
  priority: string
}

interface Session {
  id: number
  startTime: string
  start_time?: string
  endTime?: string | null
  end_time?: string | null
  status: string
  coach?: { name: string }
  user?: { name: string }
}

// Sortable Todo Card Component
interface SortableTodoCardProps {
  todo: Todo
  selectedTodo: number | null
  onTodoClick: (todoId: number) => void
  onStatusChange: (todo: Todo, newStatus: string) => void
  onEdit: (todo: Todo) => void
  onDelete: (todo: Todo) => void
  getStatusIcon: (status: string) => JSX.Element
  getPriorityColor: (priority: string) => string
  getPriorityLabel: (priority: string) => string
  isOverdue: (dueDate: string | null | undefined) => boolean
  isDueSoon: (dueDate: string | null | undefined) => boolean
  formatDate: (date: string | null | undefined) => string
}

const SortableTodoCard = ({
  todo,
  selectedTodo,
  onTodoClick,
  onStatusChange,
  onEdit,
  onDelete,
  getStatusIcon,
  getPriorityColor,
  getPriorityLabel,
  isOverdue,
  isDueSoon,
  formatDate,
}: SortableTodoCardProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`todo-card ${todo.status === 'COMPLETED' ? 'completed' : ''} ${isDragging ? 'dragging' : ''}`}
      onClick={() => onTodoClick(todo.id)}
      {...attributes}
      {...listeners}
    >
      <div className="todo-header">
        <div className="status-icon-wrapper">
          {selectedTodo === todo.id ? (
            <CheckCircle2 size={20} className="status-icon selected" />
          ) : (
            getStatusIcon(todo.status)
          )}
        </div>
        <span className="priority-badge" style={{ backgroundColor: `${getPriorityColor(todo.priority)}20`, color: getPriorityColor(todo.priority) }}>
          {getPriorityLabel(todo.priority)}
        </span>
        {isOverdue(todo.due_date || todo.dueDate) && (
          <span className="overdue-badge">Overdue</span>
        )}
        {!isOverdue(todo.due_date || todo.dueDate) && isDueSoon(todo.due_date || todo.dueDate) && (
          <span className="due-soon-badge">Due Soon</span>
        )}
      </div>
      <h3>{todo.title}</h3>
      {todo.description && (
        <p className="todo-description">{todo.description}</p>
      )}
      <div className="todo-meta">
        {todo.assigned_to && <span>Assigned to: {todo.assigned_to}</span>}
        <span>
          <CalendarIcon size={14} />
          {formatDate(todo.due_date || todo.dueDate)}
        </span>
      </div>
      <div className="todo-actions" onClick={(e) => e.stopPropagation()}>
        {todo.status === 'PENDING' && (
          <>
            <button
              className="btn-icon"
              onClick={() => onStatusChange(todo, 'IN_PROGRESS')}
              title="Mark as In Progress"
            >
              <Clock size={16} />
            </button>
            <button
              className="btn-icon"
              onClick={() => onStatusChange(todo, 'COMPLETED')}
              title="Mark as Completed"
            >
              <CheckCircle2 size={16} />
            </button>
          </>
        )}
        {todo.status === 'IN_PROGRESS' && (
          <>
            <button
              className="btn-icon"
              onClick={() => onStatusChange(todo, 'PENDING')}
              title="Mark as Pending"
            >
              <Circle size={16} />
            </button>
            <button
              className="btn-icon"
              onClick={() => onStatusChange(todo, 'COMPLETED')}
              title="Mark as Completed"
            >
              <CheckCircle2 size={16} />
            </button>
          </>
        )}
        {todo.status === 'COMPLETED' && (
          <button
            className="btn-icon"
            onClick={() => onStatusChange(todo, 'PENDING')}
            title="Mark as Pending"
          >
            <Circle size={16} />
          </button>
        )}
        <button
          className="btn-icon"
          onClick={() => onEdit(todo)}
          title="Edit"
        >
          <Edit2 size={16} />
        </button>
        <button
          className="btn-icon danger"
          onClick={() => onDelete(todo)}
          title="Delete"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

// Droppable Column Component
interface DroppableColumnProps {
  id: string
  title: string
  todos: Todo[]
  selectedTodo: number | null
  onTodoClick: (todoId: number) => void
  onStatusChange: (todo: Todo, newStatus: string) => void
  onEdit: (todo: Todo) => void
  onDelete: (todo: Todo) => void
  getStatusIcon: (status: string) => JSX.Element
  getPriorityColor: (priority: string) => string
  getPriorityLabel: (priority: string) => string
  isOverdue: (dueDate: string | null | undefined) => boolean
  isDueSoon: (dueDate: string | null | undefined) => boolean
  formatDate: (date: string | null | undefined) => string
  isOver?: boolean
}

const DroppableColumn = ({
  id,
  title,
  todos,
  selectedTodo,
  onTodoClick,
  onStatusChange,
  onEdit,
  onDelete,
  getStatusIcon,
  getPriorityColor,
  getPriorityLabel,
  isOverdue,
  isDueSoon,
  formatDate,
  isOver,
}: DroppableColumnProps) => {
  const { setNodeRef, isOver: isDroppableOver } = useDroppable({
    id,
  })

  return (
    <div
      ref={setNodeRef}
      className={`todo-column ${isOver || isDroppableOver ? 'drag-over' : ''}`}
      data-column-id={id}
    >
      <h2>{title} ({todos.length})</h2>
      {todos.length === 0 ? (
        <div className="empty-column">No {title.toLowerCase()} todos</div>
      ) : (
        <SortableContext items={todos.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {todos.map(todo => (
            <SortableTodoCard
              key={todo.id}
              todo={todo}
              selectedTodo={selectedTodo}
              onTodoClick={onTodoClick}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              getStatusIcon={getStatusIcon}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              isOverdue={isOverdue}
              isDueSoon={isDueSoon}
              formatDate={formatDate}
            />
          ))}
        </SortableContext>
      )}
    </div>
  )
}

const Todos = () => {
  const [todos, setTodos] = useState<Todo[]>([])
  const [filteredTodos, setFilteredTodos] = useState<Todo[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  
  // Calendar states
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [calendarView, setCalendarView] = useState<'daily' | 'weekly' | 'monthly'>('monthly')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [huddles, setHuddles] = useState<Huddle[]>([])
  const [actionSteps, setActionSteps] = useState<ActionStep[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedActivity, setSelectedActivity] = useState<{ type: string; id: number } | null>(null)
  const [selectedTodo, setSelectedTodo] = useState<number | null>(null)
  
  // Drag and drop states
  const [activeId, setActiveId] = useState<number | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const handleTodoClick = (todoId: number) => {
    if (selectedTodo === todoId) {
      setSelectedTodo(null) // Deselect if already selected
    } else {
      setSelectedTodo(todoId) // Select if not selected
    }
  }
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterPriority, setFilterPriority] = useState<string>('')
  const [filterUser, setFilterUser] = useState<number | null>(null)
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEventActivity, setSelectedEventActivity] = useState<any>(null)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [deletingTodo, setDeletingTodo] = useState<Todo | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    user_id: '',
    assigned_to: '',
    due_date: '',
    status: 'PENDING',
    priority: 'MEDIUM'
  })

  useEffect(() => {
    fetchTodos()
    fetchUsers()
    if (viewMode === 'calendar') {
      fetchCalendarData()
    }
  }, [viewMode])

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendarData()
    }
  }, [currentDate])

  useEffect(() => {
    applyFilters()
  }, [todos, searchTerm, filterStatus, filterPriority, filterUser])

  const fetchTodos = async () => {
    try {
      setLoading(true)
      const data = await api.get('/api/todos')
      
      if (Array.isArray(data)) {
        // Normalize the data - handle both camelCase and snake_case
        const normalized = data.map((todo: any) => ({
          ...todo,
          user_id: todo.user_id || todo.userId,
          assigned_to: todo.assigned_to || todo.assignedTo,
          due_date: todo.due_date || todo.dueDate,
          status: todo.status || 'PENDING',
          priority: todo.priority || 'MEDIUM'
        }))
        setTodos(normalized)
      } else {
        console.error('Expected array but got:', data)
        setTodos([])
      }
      setLoading(false)
    } catch (error: any) {
      console.error('Error fetching todos:', error)
      setTodos([])
      setLoading(false)
    }
  }

  const fetchUsers = async () => {
    try {
      // Try to fetch users, but don't fail if it doesn't work
      const data = await api.get('/api/users/admins').catch(() => null)
      if (Array.isArray(data)) {
        setUsers(data)
      }
    } catch (error) {
      // Silently fail - users dropdown will be empty
      console.log('Could not fetch users for todos')
    }
  }

  const fetchCalendarData = async () => {
    try {
      // Fetch huddles
      try {
        const huddlesData = await api.get('/api/huddles')
        if (Array.isArray(huddlesData)) {
          setHuddles(huddlesData)
        }
      } catch (error) {
        console.log('Could not fetch huddles')
      }

      // Fetch action steps (may require auth, so handle gracefully)
      try {
        const actionStepsData = await api.get('/api/action-steps').catch(() => null)
        if (Array.isArray(actionStepsData)) {
          setActionSteps(actionStepsData)
        }
      } catch (error) {
        console.log('Could not fetch action steps')
      }

      // Fetch sessions (may require auth, so handle gracefully)
      try {
        const sessionsData = await api.get('/api/sessions').catch(() => null)
        if (Array.isArray(sessionsData)) {
          setSessions(sessionsData)
        }
      } catch (error) {
        console.log('Could not fetch sessions')
      }
    } catch (error) {
      console.error('Error fetching calendar data:', error)
    }
  }

  const applyFilters = () => {
    if (!Array.isArray(todos)) {
      setFilteredTodos([])
      return
    }

    let filtered = [...todos]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(todo =>
        todo.title?.toLowerCase().includes(term) ||
        todo.description?.toLowerCase().includes(term) ||
        todo.assigned_to?.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (filterStatus) {
      filtered = filtered.filter(todo => 
        todo.status?.toUpperCase() === filterStatus.toUpperCase()
      )
    }

    // Priority filter
    if (filterPriority) {
      filtered = filtered.filter(todo => 
        todo.priority?.toUpperCase() === filterPriority.toUpperCase()
      )
    }

    // User filter
    if (filterUser) {
      const userId = Number(filterUser)
      filtered = filtered.filter(todo => 
        Number(todo.user_id || todo.userId) === userId
      )
    }

    setFilteredTodos(filtered)
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      user_id: '',
      assigned_to: '',
      due_date: '',
      status: 'PENDING',
      priority: 'MEDIUM'
    })
  }

  const openCreateModal = () => {
    resetForm()
    setShowCreateModal(true)
  }

  const openEditModal = (todo: Todo) => {
    setEditingTodo(todo)
    setFormData({
      title: todo.title || '',
      description: todo.description || '',
      user_id: String(todo.user_id || todo.userId || ''),
      assigned_to: todo.assigned_to || todo.assignedTo || '',
      due_date: todo.due_date || todo.dueDate ? new Date(todo.due_date || todo.dueDate || '').toISOString().split('T')[0] : '',
      status: todo.status || 'PENDING',
      priority: todo.priority || 'MEDIUM'
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (todo: Todo) => {
    setDeletingTodo(todo)
    setShowDeleteModal(true)
  }

  const handleCreateTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      await api.post('/api/todos', {
        title: formData.title,
        description: formData.description || null,
        user_id: formData.user_id ? parseInt(formData.user_id) : null,
        assigned_to: formData.assigned_to || null,
        due_date: formData.due_date || null,
        status: formData.status,
        priority: formData.priority
      })
      setShowCreateModal(false)
      resetForm()
      fetchTodos()
    } catch (error: any) {
      console.error('Error creating todo:', error)
      notify.error('Failed to create todo: ' + (error.message || 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateTodo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTodo) return
    
    try {
      setSubmitting(true)
      await api.put(`/api/todos/${editingTodo.id}`, {
        title: formData.title,
        description: formData.description || null,
        assigned_to: formData.assigned_to || null,
        due_date: formData.due_date || null,
        status: formData.status,
        priority: formData.priority
      })
      setShowEditModal(false)
      setEditingTodo(null)
      resetForm()
      fetchTodos()
    } catch (error: any) {
      console.error('Error updating todo:', error)
      notify.error('Failed to update todo: ' + (error.message || 'Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTodo = async () => {
    if (!deletingTodo) return
    
    try {
      setDeleting(true)
      await api.delete(`/api/todos/${deletingTodo.id}`)
      setShowDeleteModal(false)
      setDeletingTodo(null)
      fetchTodos()
    } catch (error: any) {
      console.error('Error deleting todo:', error)
      notify.error('Failed to delete todo: ' + (error.message || 'Unknown error'))
    } finally {
      setDeleting(false)
    }
  }

  const handleStatusChange = async (todo: Todo, newStatus: string) => {
    try {
      await api.put(`/api/todos/${todo.id}`, {
        ...todo,
        status: newStatus
      })
      fetchTodos()
    } catch (error: any) {
      console.error('Error updating status:', error)
      notify.error('Failed to update status: ' + (error.message || 'Unknown error'))
    }
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as number)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (!over) {
      setOverColumnId(null)
      return
    }

    // Check if over a column directly
    if (typeof over.id === 'string' && ['pending', 'inProgress', 'completed'].includes(over.id)) {
      setOverColumnId(over.id)
      return
    }

    // If over a card, find which column it belongs to
    if (typeof over.id === 'number') {
      const todo = todos.find(t => t.id === over.id)
      if (todo) {
        const status = todo.status?.toUpperCase() || 'PENDING'
        if (status === 'IN_PROGRESS') {
          setOverColumnId('inProgress')
        } else if (status === 'COMPLETED') {
          setOverColumnId('completed')
        } else {
          setOverColumnId('pending')
        }
      }
    } else {
      setOverColumnId(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverColumnId(null)

    if (!over) return

    const todoId = active.id as number
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return

    let targetColumnId: string | null = null

    // Check if dropped directly on a column
    if (typeof over.id === 'string' && ['pending', 'inProgress', 'completed'].includes(over.id)) {
      targetColumnId = over.id
    }
    // If dropped on a card, determine the column from the card's status
    else if (typeof over.id === 'number') {
      const targetTodo = todos.find(t => t.id === over.id)
      if (targetTodo) {
        const status = targetTodo.status?.toUpperCase() || 'PENDING'
        if (status === 'IN_PROGRESS') {
          targetColumnId = 'inProgress'
        } else if (status === 'COMPLETED') {
          targetColumnId = 'completed'
        } else {
          targetColumnId = 'pending'
        }
      }
    }

    if (targetColumnId) {
      let newStatus = 'PENDING'
      if (targetColumnId === 'inProgress') {
        newStatus = 'IN_PROGRESS'
      } else if (targetColumnId === 'completed') {
        newStatus = 'COMPLETED'
      }

      // Only update if status changed
      if (todo.status !== newStatus) {
        try {
          await api.put(`/api/todos/${todo.id}`, {
            ...todo,
            status: newStatus
          })
          fetchTodos()
        } catch (error: any) {
          console.error('Error updating todo status:', error)
          notify.error('Failed to update todo: ' + (error.message || 'Unknown error'))
        }
      }
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
    setOverColumnId(null)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setFilterStatus('')
    setFilterPriority('')
    setFilterUser(null)
  }

  const getStatusIcon = (status: string) => {
    const statusUpper = status?.toUpperCase() || 'PENDING'
    switch (statusUpper) {
      case 'COMPLETED':
        return <CheckCircle2 size={20} className="status-icon completed" />
      case 'IN_PROGRESS':
        return <Clock size={20} className="status-icon in-progress" />
      default:
        return <Circle size={20} className="status-icon pending" />
    }
  }

  const getPriorityColor = (priority: string) => {
    const priorityUpper = priority?.toUpperCase() || 'MEDIUM'
    switch (priorityUpper) {
      case 'URGENT':
        return '#dc2626'
      case 'HIGH':
        return '#ef4444'
      case 'MEDIUM':
        return '#f59e0b'
      default:
        return '#10b981'
    }
  }

  const isOverdue = (dueDate: string | null | undefined): boolean => {
    if (!dueDate) return false
    const due = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return due < today && due.toDateString() !== today.toDateString()
  }

  const isDueSoon = (dueDate: string | null | undefined): boolean => {
    if (!dueDate) return false
    const due = new Date(dueDate)
    const today = new Date()
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(today.getDate() + 3)
    today.setHours(0, 0, 0, 0)
    return due >= today && due <= threeDaysFromNow
  }

  const formatDate = (date: string | null | undefined): string => {
    if (!date) return 'No due date'
    try {
      return new Date(date).toLocaleDateString()
    } catch {
      return 'Invalid date'
    }
  }

  // Unused function - kept for future use
  // Unused function - kept for future use
  // const getStatusLabel = (status: string): string => {
  //   const statusUpper = status?.toUpperCase() || 'PENDING'
  //   switch (statusUpper) {
  //     case 'COMPLETED':
  //       return 'Completed'
  //     case 'IN_PROGRESS':
  //       return 'In Progress'
  //     case 'CANCELLED':
  //       return 'Cancelled'
  //     default:
  //       return 'Pending'
  //   }
  // }

  const getPriorityLabel = (priority: string): string => {
    const priorityUpper = priority?.toUpperCase() || 'MEDIUM'
    return priorityUpper.charAt(0) + priorityUpper.slice(1).toLowerCase()
  }

  const groupedTodos = {
    pending: filteredTodos.filter(t => {
      const status = t.status?.toUpperCase() || 'PENDING'
      return status === 'PENDING'
    }),
    inProgress: filteredTodos.filter(t => {
      const status = t.status?.toUpperCase() || 'PENDING'
      return status === 'IN_PROGRESS'
    }),
    completed: filteredTodos.filter(t => {
      const status = t.status?.toUpperCase() || 'PENDING'
      return status === 'COMPLETED'
    })
  }

  // Calendar functions
  const getActivitiesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    const activities: any[] = []

    // Todos
    todos.forEach(todo => {
      const todoDate = todo.due_date || todo.dueDate
      if (todoDate && todoDate.split('T')[0] === dateStr) {
        activities.push({
          type: 'todo',
          id: todo.id,
          title: todo.title,
          time: null,
          color: getPriorityColor(todo.priority),
          data: todo
        })
      }
    })

    // Huddles
    huddles.forEach(huddle => {
      const huddleDate = huddle.huddle_date || huddle.huddleDate
      if (huddleDate && huddleDate.split('T')[0] === dateStr) {
        activities.push({
          type: 'huddle',
          id: huddle.id,
          title: huddle.title,
          time: null,
          color: '#3b82f6',
          data: huddle
        })
      }
    })

    // Action Steps
    actionSteps.forEach(step => {
      const stepDate = step.due_date || step.dueDate
      if (stepDate && stepDate.split('T')[0] === dateStr) {
        activities.push({
          type: 'action',
          id: step.id,
          title: step.description,
          time: null,
          color: '#10b981',
          data: step
        })
      }
    })

    // Sessions
    sessions.forEach(session => {
      const sessionDate = session.startTime || session.start_time
      if (sessionDate && sessionDate.split('T')[0] === dateStr) {
        const time = new Date(sessionDate).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
        activities.push({
          type: 'session',
          id: session.id,
          title: `Coach Meeting${session.coach?.name ? ` - ${session.coach.name}` : ''}`,
          time: time,
          color: '#8b5cf6',
          data: session
        })
      }
    })

    return activities.sort((a, b) => {
      if (a.time && b.time) return a.time.localeCompare(b.time)
      if (a.time) return -1
      if (b.time) return 1
      return 0
    })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: Date[] = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(new Date(year, month, -startingDayOfWeek + i + 1))
    }
    
    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    return days
  }

  const getWeekDays = (date: Date) => {
    const week: Date[] = []
    const day = new Date(date)
    const dayOfWeek = day.getDay()
    const startOfWeek = new Date(day)
    startOfWeek.setDate(day.getDate() - dayOfWeek)
    
    for (let i = 0; i < 7; i++) {
      const weekDay = new Date(startOfWeek)
      weekDay.setDate(startOfWeek.getDate() + i)
      week.push(weekDay)
    }
    
    return week
  }

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (calendarView === 'monthly') {
      newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1))
    } else if (calendarView === 'weekly') {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7))
    } else {
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1))
    }
    setCurrentDate(newDate)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const formatCalendarDate = (date: Date): string => {
    if (calendarView === 'monthly') {
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (calendarView === 'weekly') {
      const weekStart = getWeekDays(date)[0]
      const weekEnd = getWeekDays(date)[6]
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    }
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSameMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth() && date.getFullYear() === currentDate.getFullYear()
  }

  const handleActivityClick = (activity: any) => {
    setSelectedActivity({ type: activity.type, id: activity.id })
    setSelectedEventActivity(activity)
    setShowEventModal(true)
  }

  const isActivitySelected = (activity: any): boolean => {
    return selectedActivity?.type === activity.type && selectedActivity?.id === activity.id
  }

  if (loading) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <div className="loading"></div>
          <p>Loading todos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>10X TO DO Lists</h1>
          <p className="page-subtitle">Manage and track all action items</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="view-toggle">
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <Grid3x3 size={18} />
            </button>
            <button
              className={viewMode === 'calendar' ? 'active' : ''}
              onClick={() => setViewMode('calendar')}
              title="Calendar View"
            >
              <CalendarDays size={18} />
            </button>
          </div>
          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={20} />
            Create Todo
          </button>
        </div>
      </div>

      <div className="todos-stats">
        <div className="todo-stat">
          <ListTodo size={24} />
          <div>
            <p className="stat-label">Total</p>
            <p className="stat-number">{filteredTodos.length}</p>
          </div>
        </div>
        <div className="todo-stat">
          <Circle size={24} />
          <div>
            <p className="stat-label">Pending</p>
            <p className="stat-number">{groupedTodos.pending.length}</p>
          </div>
        </div>
        <div className="todo-stat">
          <Clock size={24} />
          <div>
            <p className="stat-label">In Progress</p>
            <p className="stat-number">{groupedTodos.inProgress.length}</p>
          </div>
        </div>
        <div className="todo-stat">
          <CheckCircle2 size={24} />
          <div>
            <p className="stat-label">Completed</p>
            <p className="stat-number">{groupedTodos.completed.length}</p>
          </div>
        </div>
      </div>

      {/* Filters - only show in list view */}
      {viewMode === 'list' && (
        <div className="filters-section" style={{ marginBottom: '2rem' }}>
          <div className="filters-grid">
            <div className="filter-group">
              <Search size={18} />
              <input
                type="text"
                placeholder="Search todos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="filter-group">
              <Filter size={18} />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="filter-group">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
              >
                <option value="">All Priority</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            {users.length > 0 && (
              <div className="filter-group">
                <User size={18} />
                <select
                  value={filterUser || ''}
                  onChange={(e) => setFilterUser(e.target.value ? parseInt(e.target.value) : null)}
                >
                  <option value="">All Clients</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {(searchTerm || filterStatus || filterPriority || filterUser) && (
              <button className="btn-secondary" onClick={clearFilters}>
                Clear Filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="calendar-container">
          <div className="calendar-header">
            <div className="calendar-navigation">
              <button className="btn-icon" onClick={() => navigateDate('prev')}>
                <ChevronLeft size={20} />
              </button>
              <h2>{formatCalendarDate(currentDate)}</h2>
              <button className="btn-icon" onClick={() => navigateDate('next')}>
                <ChevronRight size={20} />
              </button>
              <button className="btn-secondary" onClick={goToToday} style={{ marginLeft: '12px' }}>
                Today
              </button>
            </div>
            <div className="calendar-view-toggle">
              <button
                className={calendarView === 'daily' ? 'active' : ''}
                onClick={() => setCalendarView('daily')}
              >
                Day
              </button>
              <button
                className={calendarView === 'weekly' ? 'active' : ''}
                onClick={() => setCalendarView('weekly')}
              >
                Week
              </button>
              <button
                className={calendarView === 'monthly' ? 'active' : ''}
                onClick={() => setCalendarView('monthly')}
              >
                Month
              </button>
            </div>
          </div>

          {/* Calendar Legend */}
          <div className="calendar-legend">
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
              <span>Todos</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#3b82f6' }}></span>
              <span>10Min Huddles</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#10b981' }}></span>
              <span>Action Items</span>
            </div>
            <div className="legend-item">
              <span className="legend-color" style={{ backgroundColor: '#8b5cf6' }}></span>
              <span>Coach Meetings</span>
            </div>
          </div>

          {/* Monthly View */}
          {calendarView === 'monthly' && (
            <div className="calendar-month-view">
              <div className="calendar-weekdays">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="calendar-weekday">{day}</div>
                ))}
              </div>
              <div className="calendar-days-grid">
                {getDaysInMonth(currentDate).map((date, index) => {
                  const activities = getActivitiesForDate(date)
                  const isCurrentMonth = isSameMonth(date)
                  return (
                    <div
                      key={index}
                      className={`calendar-day ${!isCurrentMonth ? 'other-month' : ''} ${isToday(date) ? 'today' : ''}`}
                    >
                      <div className="calendar-day-number">{date.getDate()}</div>
                      <div className="calendar-day-activities">
                        {activities.slice(0, 3).map((activity, actIndex) => (
                          <div
                            key={actIndex}
                            className={`calendar-activity ${isActivitySelected(activity) ? 'selected' : ''}`}
                            style={{ backgroundColor: activity.color }}
                            title={activity.title}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleActivityClick(activity)
                            }}
                          >
                            {activity.time && <span className="activity-time">{activity.time}</span>}
                            <span className="activity-title">{activity.title}</span>
                          </div>
                        ))}
                        {activities.length > 3 && (
                          <div className="calendar-more-activities">
                            +{activities.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Weekly View */}
          {calendarView === 'weekly' && (
            <div className="calendar-week-view">
              <div className="calendar-week-header">
                {getWeekDays(currentDate).map((date, index) => (
                  <div key={index} className={`calendar-week-day-header ${isToday(date) ? 'today' : ''}`}>
                    <div className="week-day-name">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][index]}</div>
                    <div className="week-day-number">{date.getDate()}</div>
                  </div>
                ))}
              </div>
              <div className="calendar-week-body">
                {getWeekDays(currentDate).map((date, index) => {
                  const activities = getActivitiesForDate(date)
                  return (
                    <div key={index} className={`calendar-week-day ${isToday(date) ? 'today' : ''}`}>
                      {activities.map((activity, actIndex) => (
                        <div
                          key={actIndex}
                          className={`calendar-activity-week ${isActivitySelected(activity) ? 'selected' : ''}`}
                          style={{ borderLeft: `4px solid ${activity.color}` }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleActivityClick(activity)
                          }}
                        >
                          {activity.time && <div className="activity-time-week">{activity.time}</div>}
                          <div className="activity-title-week">{activity.title}</div>
                        </div>
                      ))}
                      {activities.length === 0 && (
                        <div className="calendar-empty-day">No activities</div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Daily View */}
          {calendarView === 'daily' && (
            <div className="calendar-day-view">
              <div className="calendar-day-header">
                <h3>{currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</h3>
              </div>
              <div className="calendar-day-body">
                {getActivitiesForDate(currentDate).map((activity, index) => (
                  <div
                    key={index}
                    className={`calendar-activity-day ${isActivitySelected(activity) ? 'selected' : ''}`}
                    style={{ borderLeft: `4px solid ${activity.color}` }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleActivityClick(activity)
                    }}
                  >
                    {activity.time && <div className="activity-time-day">{activity.time}</div>}
                    <div className="activity-content-day">
                      <div className="activity-title-day">{activity.title}</div>
                      <div className="activity-type-day">
                        {activity.type === 'todo' && '📋 Todo'}
                        {activity.type === 'huddle' && '👥 10Min Huddle'}
                        {activity.type === 'action' && '✅ Action Item'}
                        {activity.type === 'session' && '💼 Coach Meeting'}
                      </div>
                    </div>
                  </div>
                ))}
                {getActivitiesForDate(currentDate).length === 0 && (
                  <div className="calendar-empty-day-full">No activities scheduled for this day</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="todos-board">
            <DroppableColumn
              id="pending"
              title="Pending"
              todos={groupedTodos.pending}
              selectedTodo={selectedTodo}
              onTodoClick={handleTodoClick}
              onStatusChange={handleStatusChange}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              getStatusIcon={getStatusIcon}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              isOverdue={isOverdue}
              isDueSoon={isDueSoon}
              formatDate={formatDate}
              isOver={overColumnId === 'pending'}
            />
            <DroppableColumn
              id="inProgress"
              title="In Progress"
              todos={groupedTodos.inProgress}
              selectedTodo={selectedTodo}
              onTodoClick={handleTodoClick}
              onStatusChange={handleStatusChange}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              getStatusIcon={getStatusIcon}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              isOverdue={isOverdue}
              isDueSoon={isDueSoon}
              formatDate={formatDate}
              isOver={overColumnId === 'inProgress'}
            />
            <DroppableColumn
              id="completed"
              title="Completed"
              todos={groupedTodos.completed}
              selectedTodo={selectedTodo}
              onTodoClick={handleTodoClick}
              onStatusChange={handleStatusChange}
              onEdit={openEditModal}
              onDelete={openDeleteModal}
              getStatusIcon={getStatusIcon}
              getPriorityColor={getPriorityColor}
              getPriorityLabel={getPriorityLabel}
              isOverdue={isOverdue}
              isDueSoon={isDueSoon}
              formatDate={formatDate}
              isOver={overColumnId === 'completed'}
            />
          </div>
          <DragOverlay>
            {activeId ? (
              <div className="todo-card dragging-overlay">
                {(() => {
                  const todo = todos.find(t => t.id === activeId)
                  if (!todo) return null
                  return (
                    <>
                      <div className="todo-header">
                        <div className="status-icon-wrapper">
                          {getStatusIcon(todo.status)}
                        </div>
                        <span className="priority-badge" style={{ backgroundColor: `${getPriorityColor(todo.priority)}20`, color: getPriorityColor(todo.priority) }}>
                          {getPriorityLabel(todo.priority)}
                        </span>
                      </div>
                      <h3>{todo.title}</h3>
                      {todo.description && (
                        <p className="todo-description">{todo.description}</p>
                      )}
                    </>
                  )
                })()}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Create Todo Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Create New Todo</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateTodo}>
              <div className="modal-body">
                <div className="form-grid">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    disabled={submitting}
                  />
                </div>
                {users.length > 0 && (
                  <div className="form-group">
                    <label>Client</label>
                    <select
                      value={formData.user_id}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      disabled={submitting}
                    >
                      <option value="">Select a client</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Assigned To</label>
                  <input
                    type="text"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    placeholder="Name or email"
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateModal(false)
                    resetForm()
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Todo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Todo Modal */}
      {showEditModal && editingTodo && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Edit Todo</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleUpdateTodo}>
              <div className="modal-body">
                <div className="form-grid">
                <div className="form-group">
                  <label>Title *</label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    disabled={submitting}
                  />
                </div>
                {users.length > 0 && (
                  <div className="form-group">
                    <label>Client</label>
                    <select
                      value={formData.user_id}
                      onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                      disabled={submitting}
                    >
                      <option value="">Select a client</option>
                      {users.map(user => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Assigned To</label>
                  <input
                    type="text"
                    value={formData.assigned_to}
                    onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                    placeholder="Name or email"
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    disabled={submitting}
                  />
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="CANCELLED">Cancelled</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    disabled={submitting}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowEditModal(false)
                    setEditingTodo(null)
                    resetForm()
                  }}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? 'Updating...' : 'Update Todo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingTodo && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Delete Todo</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <AlertCircle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
              <p>Are you sure you want to delete this todo?</p>
              <p style={{ fontWeight: 600, marginTop: '0.5rem' }}>"{deletingTodo.title}"</p>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginTop: '0.5rem' }}>
                This action cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeletingTodo(null)
                }}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={handleDeleteTodo}
                disabled={deleting}
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {showEventModal && selectedEventActivity && (
        <div className="modal-overlay" onClick={() => setShowEventModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>
                {selectedEventActivity.type === 'todo' && '📋 Todo Details'}
                {selectedEventActivity.type === 'huddle' && '👥 Huddle Details'}
                {selectedEventActivity.type === 'action' && '✅ Action Step Details'}
                {selectedEventActivity.type === 'session' && '💼 Coaching Session Details'}
              </h2>
              <button className="modal-close" onClick={() => setShowEventModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              {/* Todo Details */}
              {selectedEventActivity.type === 'todo' && (() => {
                const todo = selectedEventActivity.data as Todo
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Title</label>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>{todo.title}</div>
                    </div>
                    {todo.description && (
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
                        <div style={{ color: 'var(--text)', whiteSpace: 'pre-wrap' }}>{todo.description}</div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
                        <div>
                          <span className={`status-badge status-${todo.status?.toLowerCase()}`}>
                            {todo.status}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Priority</label>
                        <div>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 600,
                            backgroundColor: getPriorityColor(todo.priority),
                            color: 'white'
                          }}>
                            {getPriorityLabel(todo.priority)}
                          </span>
                        </div>
                      </div>
                      {(todo.due_date || todo.dueDate) && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Due Date</label>
                          <div style={{ color: 'var(--text)' }}>
                            {new Date(todo.due_date || todo.dueDate || '').toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      )}
                      {todo.assigned_to && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Assigned To</label>
                          <div style={{ color: 'var(--text)' }}>{todo.assigned_to}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {/* Huddle Details */}
              {selectedEventActivity.type === 'huddle' && (() => {
                const huddle = selectedEventActivity.data as Huddle
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Title</label>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>{huddle.title}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</label>
                        <div style={{ color: 'var(--text)' }}>
                          {new Date(huddle.huddle_date || huddle.huddleDate || '').toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                      {huddle.coach_name && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Coach</label>
                          <div style={{ color: 'var(--text)' }}>{huddle.coach_name}</div>
                        </div>
                      )}
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
                        <div>
                          <span className={`status-badge status-${huddle.status?.toLowerCase()}`}>
                            {huddle.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Compliance</label>
                      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          backgroundColor: ((huddle as any).has_short_agenda || (huddle as any).hasShortAgenda) ? 'var(--success-light)' : 'var(--error-light)',
                          color: ((huddle as any).has_short_agenda || (huddle as any).hasShortAgenda) ? 'var(--success)' : 'var(--error)'
                        }}>
                          {(huddle as any).has_short_agenda || (huddle as any).hasShortAgenda ? '✓' : '✗'} Short Agenda
                        </span>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          backgroundColor: ((huddle as any).has_notetaker || (huddle as any).hasNotetaker) ? 'var(--success-light)' : 'var(--error-light)',
                          color: ((huddle as any).has_notetaker || (huddle as any).hasNotetaker) ? 'var(--success)' : 'var(--error)'
                        }}>
                          {(huddle as any).has_notetaker || (huddle as any).hasNotetaker ? '✓' : '✗'} Notetaker
                        </span>
                        <span style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          fontSize: '13px',
                          backgroundColor: ((huddle as any).has_action_steps || (huddle as any).hasActionSteps) ? 'var(--success-light)' : 'var(--error-light)',
                          color: ((huddle as any).has_action_steps || (huddle as any).hasActionSteps) ? 'var(--success)' : 'var(--error)'
                        }}>
                          {(huddle as any).has_action_steps || (huddle as any).hasActionSteps ? '✓' : '✗'} Action Steps
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Action Step Details */}
              {selectedEventActivity.type === 'action' && (() => {
                const actionStep = selectedEventActivity.data as ActionStep
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Description</label>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>{actionStep.description}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      {(actionStep.due_date || actionStep.dueDate) && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Due Date</label>
                          <div style={{ color: 'var(--text)' }}>
                            {new Date(actionStep.due_date || actionStep.dueDate || '').toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                        </div>
                      )}
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
                        <div>
                          <span className={`status-badge status-${actionStep.status?.toLowerCase()}`}>
                            {actionStep.status}
                          </span>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Priority</label>
                        <div>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: 600,
                            backgroundColor: getPriorityColor(actionStep.priority),
                            color: 'white'
                          }}>
                            {getPriorityLabel(actionStep.priority)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Session Details */}
              {selectedEventActivity.type === 'session' && (() => {
                const session = selectedEventActivity.data as Session
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Coaching Session</label>
                      <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text)' }}>
                        {session.coach?.name ? `Session with ${session.coach.name}` : 'Coaching Session'}
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Start Time</label>
                        <div style={{ color: 'var(--text)' }}>
                          {new Date(session.startTime || session.start_time || '').toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                      {(session.endTime || session.end_time) && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>End Time</label>
                          <div style={{ color: 'var(--text)' }}>
                            {new Date(session.endTime || session.end_time || '').toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                      )}
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</label>
                        <div>
                          <span className={`status-badge status-${session.status?.toLowerCase()}`}>
                            {session.status}
                          </span>
                        </div>
                      </div>
                      {session.user?.name && (
                        <div>
                          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>User</label>
                          <div style={{ color: 'var(--text)' }}>{session.user.name}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowEventModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Todos
