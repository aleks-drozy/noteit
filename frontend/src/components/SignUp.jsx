import { useState } from 'react'
import { MdAlternateEmail } from 'react-icons/md'
import { CiUser, CiLock } from 'react-icons/ci'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'

function SignUp({ FormHandle }) {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignUp(e) {
    e.preventDefault()
    setErrorMessage('')

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!username) return setErrorMessage('Please enter your username.')
    if (!email) return setErrorMessage('Please enter your email.')
    if (!emailPattern.test(email)) return setErrorMessage('Please enter a valid email.')
    if (!password) return setErrorMessage('Please enter your password.')
    if (!confirmPassword) return setErrorMessage('Please confirm your password.')
    if (password !== confirmPassword) return setErrorMessage('Passwords do not match.')
    if (!role) return setErrorMessage('Please select a role.')

    setLoading(true)
    try {
      const res = await api.post('/api/auth/register', { username, email, password, role })
      await login(res.data.token)
    } catch (err) {
      setErrorMessage(err.response?.data?.error || err.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="form-container">
      <h1>NoteIt</h1>
      <h2>Sign Up</h2>
      <form onSubmit={handleSignUp}>
        <div className="form-control">
          <input
            type="text"
            placeholder="Enter your username"
            onChange={(e) => setUsername(e.target.value)}
            value={username}
          />
          <CiUser className="icon user" />
        </div>
        <div className="form-control">
          <input
            type="text"
            placeholder="Enter your email"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
          />
          <MdAlternateEmail className="icon email" />
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
        <div className="form-control">
          <input
            type="password"
            placeholder="Confirm your password"
            onChange={(e) => setConfirmPassword(e.target.value)}
            value={confirmPassword}
          />
          <CiLock className="icon password" />
        </div>
        <div className="form-control">
          <label htmlFor="role">I am a *</label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            required
          >
            <option value="">Please select</option>
            <option value="Student">Student</option>
            <option value="Lecturer">Lecturer</option>
            <option value="Demonstrator">Demonstrator</option>
          </select>
        </div>
        {errorMessage && <p className="error-message">{errorMessage}</p>}
        <button type="submit" disabled={loading}>
          {loading ? 'Creating account…' : 'Sign Up'}
        </button>
      </form>
      <p onClick={() => FormHandle('login')}>Already have an account?</p>
    </div>
  )
}

export default SignUp
