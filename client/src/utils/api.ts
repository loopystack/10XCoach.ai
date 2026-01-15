// API utility for authenticated requests

const getAuthToken = (): string | null => {
  return localStorage.getItem('token') || sessionStorage.getItem('token')
}

const getAuthHeaders = (): HeadersInit => {
  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  return headers
}

// Flag to prevent multiple simultaneous redirects
let isRedirecting = false

// Handle 401 errors by clearing auth and redirecting to login
const handleUnauthorized = () => {
  // Prevent multiple simultaneous redirects
  if (isRedirecting) {
    return
  }
  
  isRedirecting = true
  
  // Clear authentication data
  clearAuthToken()
  localStorage.removeItem('user')
  sessionStorage.removeItem('user')
  sessionStorage.removeItem('loginTime')
  
  // Dispatch auth state change event
  window.dispatchEvent(new CustomEvent('authStateChanged'))
  
  // Only redirect if we're not already on login/register page
  const currentPath = window.location.pathname
  if (!currentPath.startsWith('/login') && !currentPath.startsWith('/register') && !currentPath.startsWith('/verify-email')) {
    // Use window.location for a hard redirect to ensure state is cleared
    window.location.href = '/login?expired=true'
  } else {
    // Reset flag if we're already on login page
    setTimeout(() => {
      isRedirecting = false
    }, 1000)
  }
}

export const api = {
  get: async (url: string): Promise<any> => {
    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    })
    
    // Handle 401 before parsing JSON (token might be expired)
    if (response.status === 401) {
      handleUnauthorized()
      // Try to parse error message if available
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || 'Your session has expired. Please log in again.')
        }
      } catch (e) {
        // If parsing fails, just throw generic error
      }
      throw new Error('Your session has expired. Please log in again.')
    }
    
    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If not JSON, it's probably HTML (404 page) or text
      const text = await response.text()
      console.error('Non-JSON response received:', text.substring(0, 200))
      throw new Error(`Server returned non-JSON response. Status: ${response.status}. The API endpoint may not exist or the server may need to be restarted.`)
    }
    
    if (!response.ok) {
      // Handle 401 Unauthorized (token expired or invalid) - should already be handled above, but keep as fallback
      if (response.status === 401) {
        handleUnauthorized()
        throw new Error(data.error || 'Your session has expired. Please log in again.')
      }
      
      // Check if this is an upgrade required error
      if (response.status === 403 && data.requiresUpgrade) {
        const error = new Error(data.error || 'Upgrade required')
        ;(error as any).requiresUpgrade = true
        ;(error as any).redirectTo = data.redirectTo || '/plans'
        ;(error as any).trialEndDate = data.trialEndDate
        ;(error as any).creditBalance = data.creditBalance
        throw error
      }
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }
    
    return data
  },
  
  post: async (url: string, body: any): Promise<any> => {
    const response = await fetch(url, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })
    
    // Handle 401 before parsing JSON (token might be expired)
    if (response.status === 401) {
      handleUnauthorized()
      // Try to parse error message if available
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || 'Your session has expired. Please log in again.')
        }
      } catch (e) {
        // If parsing fails, just throw generic error
      }
      throw new Error('Your session has expired. Please log in again.')
    }
    
    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If not JSON, it's probably HTML (404 page) or text
      const text = await response.text()
      console.error('Non-JSON response received:', text.substring(0, 200))
      throw new Error(`Server returned non-JSON response. Status: ${response.status}. The API endpoint may not exist or the server may need to be restarted.`)
    }
    
    if (!response.ok) {
      // Handle 401 Unauthorized (token expired or invalid) - should already be handled above, but keep as fallback
      if (response.status === 401) {
        handleUnauthorized()
        throw new Error(data.error || 'Your session has expired. Please log in again.')
      }
      
      // Check if this is an upgrade required error
      if (response.status === 403 && data.requiresUpgrade) {
        const error = new Error(data.error || 'Upgrade required')
        ;(error as any).requiresUpgrade = true
        ;(error as any).redirectTo = data.redirectTo || '/plans'
        ;(error as any).trialEndDate = data.trialEndDate
        ;(error as any).creditBalance = data.creditBalance
        throw error
      }
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }
    
    return data
  },
  
  put: async (url: string, body: any): Promise<any> => {
    const response = await fetch(url, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })
    
    // Handle 401 before parsing JSON (token might be expired)
    if (response.status === 401) {
      handleUnauthorized()
      // Try to parse error message if available
      try {
        const contentType = response.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json()
          throw new Error(data.error || 'Your session has expired. Please log in again.')
        }
      } catch (e) {
        // If parsing fails, just throw generic error
      }
      throw new Error('Your session has expired. Please log in again.')
    }
    
    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If not JSON, it's probably HTML (404 page) or text
      const text = await response.text()
      console.error('Non-JSON response received:', text.substring(0, 200))
      throw new Error(`Server returned non-JSON response. Status: ${response.status}. The API endpoint may not exist or the server may need to be restarted.`)
    }
    
    if (!response.ok) {
      // Handle 401 Unauthorized (token expired or invalid) - should already be handled above, but keep as fallback
      if (response.status === 401) {
        handleUnauthorized()
        throw new Error(data.error || 'Your session has expired. Please log in again.')
      }
      
      // Check if this is an upgrade required error
      if (response.status === 403 && data.requiresUpgrade) {
        const error = new Error(data.error || 'Upgrade required')
        ;(error as any).requiresUpgrade = true
        ;(error as any).redirectTo = data.redirectTo || '/plans'
        ;(error as any).trialEndDate = data.trialEndDate
        ;(error as any).creditBalance = data.creditBalance
        throw error
      }
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }
    
    return data
  },
  
  delete: async (url: string): Promise<any> => {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    })
    
    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    let data
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If not JSON, it's probably HTML (404 page) or text
      const text = await response.text()
      console.error('Non-JSON response received:', text.substring(0, 200))
      throw new Error(`Server returned non-JSON response. Status: ${response.status}. The server may need to be restarted.`)
    }
    
    if (!response.ok) {
      // Handle 401 Unauthorized (token expired or invalid)
      if (response.status === 401) {
        handleUnauthorized()
        throw new Error(data.error || 'Your session has expired. Please log in again.')
      }
      
      // Check if this is an upgrade required error
      if (response.status === 403 && data.requiresUpgrade) {
        const error = new Error(data.error || 'Upgrade required')
        ;(error as any).requiresUpgrade = true
        ;(error as any).redirectTo = data.redirectTo || '/plans'
        ;(error as any).trialEndDate = data.trialEndDate
        ;(error as any).creditBalance = data.creditBalance
        throw error
      }
      throw new Error(data.error || `HTTP error! status: ${response.status}`)
    }
    
    return data
  },
}

export const setAuthToken = (token: string, remember: boolean = false): void => {
  if (remember) {
    localStorage.setItem('token', token)
  } else {
    sessionStorage.setItem('token', token)
  }
}

export const clearAuthToken = (): void => {
  localStorage.removeItem('token')
  sessionStorage.removeItem('token')
}

export const isAuthenticated = (): boolean => {
  return !!getAuthToken()
}

