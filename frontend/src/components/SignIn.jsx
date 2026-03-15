import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function SignIn({ CiUser, CiLock, FormHandle }) {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setErrorMessage('')
    if (!email) return setErrorMessage('Please enter your email.')
    if (!password) return setErrorMessage('Please enter your password.')

    setLoading(true)
    try {
      const res = await api.post('/api/auth/login', { email, password })
      await login(res.data.token)
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h1>NoteIt</h1>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <div className="form-control">
          <input
            type="text"
            placeholder="Enter your email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
          <CiUser className="icon user" />
        </div>
        <div className="form-control">
          <input
            type="password"
            placeholder="Enter your password"
            onChange={(e) => setPassword(e.target.value)}
            value={password}
          />
          <CiLock className="icon password" />
        </div>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <p onClick={() => FormHandle('signup')}>Don't have an account?</p>
    </div>
  )
}

export default SignIn
