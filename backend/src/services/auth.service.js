const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/user.model')

const VALID_ROLES = ['Student', 'Lecturer', 'Demonstrator']

async function register({ username, email, password, role }) {
  if (!username || username.length < 3)
    throw { status: 400, message: 'Username must be at least 3 characters' }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw { status: 400, message: 'Invalid email format' }
  if (!password || password.length < 6)
    throw { status: 400, message: 'Password must be at least 6 characters' }
  if (!VALID_ROLES.includes(role))
    throw { status: 400, message: 'Role must be Student, Lecturer, or Demonstrator' }

  const existing = await User.findOne({ $or: [{ email }, { username }] })
  if (existing) {
    const field = existing.email === email ? 'Email' : 'Username'
    throw { status: 409, message: `${field} already in use` }
  }

  const hash = await bcrypt.hash(password, 10)
  const user = await User.create({ username, email, password: hash, role })
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  return { token, user: { _id: user._id, username: user.username, email: user.email, role: user.role } }
}

async function login({ email, password }) {
  if (!email || !password)
    throw { status: 400, message: 'Email and password are required' }
  const user = await User.findOne({ email })
  if (!user) throw { status: 401, message: 'Invalid credentials' }
  const valid = await bcrypt.compare(password, user.password)
  if (!valid) throw { status: 401, message: 'Invalid credentials' }
  const token = jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  )
  return { token, user: { _id: user._id, username: user.username, email: user.email, role: user.role } }
}

async function getMe(userId) {
  const user = await User.findById(userId).select('-password')
  if (!user) throw { status: 404, message: 'User not found' }
  return user
}

module.exports = { register, login, getMe }
