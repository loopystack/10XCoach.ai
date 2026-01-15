import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react'
import Notification, { NotificationData, NotificationType } from './Notification'
import { setNotificationContext } from '../utils/notification'
import './Notification.css'

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType, duration?: number) => void
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export const useNotification = () => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<NotificationData[]>([])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => {
      const notification = prev.find((n) => n.id === id)
      if (notification) {
        // Add exit animation class before removing
        const element = document.querySelector(`[data-notification-id="${id}"]`)
        if (element) {
          element.classList.add('notification-exit')
        }
        // Remove after animation completes
        setTimeout(() => {
          setNotifications((prev) => prev.filter((n) => n.id !== id))
        }, 300)
        return prev
      }
      return prev.filter((n) => n.id !== id)
    })
  }, [])

  const showNotification = useCallback(
    (message: string, type: NotificationType = 'info', duration: number = 5000) => {
      const id = `notification-${Date.now()}-${Math.random()}`
      const notification: NotificationData = {
        id,
        message,
        type,
        duration,
      }
      setNotifications((prev) => [...prev, notification])
    },
    []
  )

  const showSuccess = useCallback((message: string, duration?: number) => {
    showNotification(message, 'success', duration)
  }, [showNotification])

  const showError = useCallback((message: string, duration?: number) => {
    showNotification(message, 'error', duration || 6000) // Errors show longer by default
  }, [showNotification])

  const showWarning = useCallback((message: string, duration?: number) => {
    showNotification(message, 'warning', duration)
  }, [showNotification])

  const showInfo = useCallback((message: string, duration?: number) => {
    showNotification(message, 'info', duration)
  }, [showNotification])

  // Register context with utility function
  useEffect(() => {
    setNotificationContext({
      showSuccess,
      showError,
      showWarning,
      showInfo,
    })
  }, [showSuccess, showError, showWarning, showInfo])

  return (
    <NotificationContext.Provider
      value={{ showNotification, showSuccess, showError, showWarning, showInfo }}
    >
      {children}
      <div className="notification-container">
        {notifications.map((notification) => (
          <div key={notification.id} data-notification-id={notification.id}>
            <Notification
              notification={notification}
              onClose={removeNotification}
            />
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

