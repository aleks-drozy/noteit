import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',
})

// Inject JWT token on every outgoing request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('noteit_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// On 401: fire a DOM event — AuthContext listens and calls logout()
// This avoids a circular dependency (Axios is a plain module with no React access)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new Event('auth:logout'))
    }
    return Promise.reject(error)
  }
)

export default api
