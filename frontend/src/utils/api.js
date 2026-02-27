import axios from 'axios'

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  timeout: 30000,
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Determine which token to use based on the path or current view
    const url = config.url || "";
    const isPoliceApi = url.includes('/api/police') || 
                        url.includes('/api/stations') || 
                        url.includes('/api/geofence') ||
                        url.includes('/api/analytics');
    
    const isPolicePortal = window.location.pathname.startsWith('/police');

    let token = null;

    if (isPoliceApi || isPolicePortal) {
      // Prioritize police token for police routes/portal
      token = localStorage.getItem('reva_police_token');
      // If we're on a police route but only have a citizen token, 
      // maybe it's a shared route or the user is trying to access admin as citizen
      if (!token) token = localStorage.getItem('reva_token');
    } else {
      // Normal citizen routes
      token = localStorage.getItem('reva_token');
      // Fallback to police token if citizen token is missing (some shared public routes)
      if (!token) token = localStorage.getItem('reva_police_token');
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
