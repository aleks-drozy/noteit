const usersService = require('../services/users.service')

async function searchUser(req, res, next) {
  try {
    const { username } = req.query
    if (!username) {
      return res.status(400).json({ error: 'username query parameter is required' })
    }
    const user = await usersService.findByUsername(username)
    res.json(user)
  } catch (err) {
    next(err)
  }
}

module.exports = { searchUser }
