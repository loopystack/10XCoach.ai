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

export const api = {
  get: async (url: string): Promise<any> => {
    const response = await fetch(url, {
      method: 'GET',
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
      throw new Error(`Server returned non-JSON response. Status: ${response.status}. The API endpoint may not exist or the server may need to be restarted.`)
    }
    
    if (!response.ok) {
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

