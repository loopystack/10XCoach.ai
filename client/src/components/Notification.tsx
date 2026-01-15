import React, { useEffect } from 'react'
import { X, CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'
import './Notification.css'

export type NotificationType = 'success' | 'error' | 'info' | 'warning'

export interface NotificationData {
  id: string
  message: string
  type: NotificationType
  duration?: number
}

interface NotificationProps {
  notification: NotificationData
  onClose: (id: string) => void
}

const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  useEffect(() => {
    const duration = notification.duration !== undefined ? notification.duration : 5000
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose(notification.id)
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [notification.id, notification.duration, onClose])

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle size={20} />
      case 'error':
        return <XCircle size={20} />
      case 'warning':
        return <AlertCircle size={20} />
      case 'info':
      default:
        return <Info size={20} />
    }
  }

  return (
    <div className={`notification notification-${notification.type}`}>
      <div className="notification-icon">{getIcon()}</div>
      <div className="notification-content">
        <p className="notification-message">{notification.message}</p>
      </div>
      <button
        className="notification-close"
        onClick={() => onClose(notification.id)}
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  )
}

export default Notification

