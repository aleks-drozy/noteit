import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import SignIn from '../components/SignIn'
import SignUp from '../components/SignUp'
import { CiUser, CiLock } from 'react-icons/ci'

function AuthPage({ defaultForm = 'login' }) {
  const { user, loading } = useAuth()
  const [form, setForm] = useState(defaultForm)

  if (loading) return null
  if (user) return <Navigate to="/dashboard" replace />

  return (
    <>
      {form === 'login' ? (
        <SignIn CiUser={CiUser} CiLock={CiLock} FormHandle={setForm} />
      ) : (
        <SignUp FormHandle={setForm} />
      )}
    </>
  )
}

export default AuthPage
