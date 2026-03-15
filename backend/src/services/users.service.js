const User = require('../models/user.model')

function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function findByUsername(username) {
  const user = await User.findOne({ username: new RegExp(`^${escapeRegExp(username)}$`, 'i') })
  if (!user) {
    const err = new Error('User not found')
    err.status = 404
    throw err
  }
  return { _id: user._id, username: user.username, role: user.role }
}

module.exports = { findByUsername }
