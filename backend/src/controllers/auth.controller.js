const authService = require('../services/auth.service')

async function register(req, res) {
  try {
    const result = await authService.register(req.body)
    res.status(201).json(result)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

async function login(req, res) {
  try {
    const result = await authService.login(req.body)
    res.status(200).json(result)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

async function getMe(req, res) {
  try {
    const user = await authService.getMe(req.user.userId)
    res.status(200).json(user)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

module.exports = { register, login, getMe }
