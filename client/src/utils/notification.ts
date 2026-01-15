/**
 * Notification utility
 * Provides a simple way to show notifications from anywhere in the app
 */

let notificationContext: {
  showSuccess: (message: string, duration?: number) => void
  showError: (message: string, duration?: number) => void
  showWarning: (message: string, duration?: number) => void
  showInfo: (message: string, duration?: number) => void
} | null = null

export const setNotificationContext = (context: typeof notificationContext) => {
  notificationContext = context
}

export const notify = {
  success: (message: string, duration?: number) => {
    if (notificationContext) {
      notificationContext.showSuccess(message, duration)
    } else {
      // Fallback to alert if context not available
      alert(message)
    }
  },
  error: (message: string, duration?: number) => {
    if (notificationContext) {
      notificationContext.showError(message, duration)
    } else {
      // Fallback to alert if context not available
      alert(message)
    }
  },
  warning: (message: string, duration?: number) => {
    if (notificationContext) {
      notificationContext.showWarning(message, duration)
    } else {
      // Fallback to alert if context not available
      alert(message)
    }
  },
  info: (message: string, duration?: number) => {
    if (notificationContext) {
      notificationContext.showInfo(message, duration)
    } else {
      // Fallback to alert if context not available
      alert(message)
    }
  },
}

