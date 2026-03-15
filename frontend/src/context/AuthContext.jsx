import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const logout = useCallback(() => {
    localStorage.removeItem('noteit_token')
    setUser(null)
    navigate('/login')
  }, [navigate])

  // On mount: if a token exists in localStorage, fetch the user profile
  useEffect(() => {
    const token = localStorage.getItem('noteit_token')
    if (!token) {
      setLoading(false)
      return
    }
    api.get('/api/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        // Token invalid or expired — clear it silently
        localStorage.removeItem('noteit_token')
      })
      .finally(() => setLoading(false))
  }, [])

  // Listen for 401 events dispatched by the Axios response interceptor
  useEffect(() => {
    window.addEventListener('auth:logout', logout)
    return () => window.removeEventListener('auth:logout', logout)
  }, [logout])

  const login = useCallback(async (token) => {
    localStorage.setItem('noteit_token', token)
    try {
      const res = await api.get('/api/auth/me')
      setUser(res.data)
      navigate('/dashboard')
    } catch {
      // Roll back token if profile fetch fails
      localStorage.removeItem('noteit_token')
      throw new Error('Login succeeded but failed to load your profile. Please try again.')
    }
  }, [navigate])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === null) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
