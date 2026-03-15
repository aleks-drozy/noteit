const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth.routes')
const notesRoutes = require('./routes/notes.routes')
const usersRoutes = require('./routes/users.routes')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/notes', notesRoutes)
app.use('/api/users', usersRoutes)

// Global error handler
app.use((err, req, res, next) => {
  const status = err.status || 500
  const message = status < 500 ? err.message : 'Internal server error'
  if (status >= 500) console.error(err)
  res.status(status).json({ error: message })
})

module.exports = app
