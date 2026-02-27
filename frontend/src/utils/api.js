import axios from 'axios'

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  timeout: 30000,
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // If a header is already manually set, don't overwrite it
    if (config.headers.Authorization) {
      return config;
    }

    // Determine which token to use based on target URL
    const isPoliceRoute = config.url.startsWith('/api/police');
    const isSharedRoute = config.url.startsWith('/api/evidence') || config.url.startsWith('/api/stations');
    
    let token = null;
    
    if (isPoliceRoute) {
      token = localStorage.getItem('reva_police_token');
    } else if (isSharedRoute) {
      // For shared routes, prefer police token if it exists, otherwise use citizen token
      token = localStorage.getItem('reva_police_token') || localStorage.getItem('reva_token');
    } else {
      token = localStorage.getItem('reva_token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' && 
        !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true })
        const { accessToken } = res.data
        localStorage.setItem('reva_token', accessToken)
        api.defaults.headers.common['Authorization'] = `Bearer ${accessToken}`
        originalRequest.headers.Authorization = `Bearer ${accessToken}`
        return api(originalRequest)
      } catch (refreshError) {
        localStorage.removeItem('reva_token')
        localStorage.removeItem('reva_user')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      }
    }
    
    return Promise.reject(error)
  }
)

export default api