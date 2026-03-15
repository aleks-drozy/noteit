const notesService = require('../services/notes.service')

async function createNote(req, res) {
  try {
    const note = await notesService.createNote(req.body, req.user.userId)
    res.status(201).json(note)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

async function getNotes(req, res) {
  try {
    const notes = await notesService.getNotes(req.user.userId, req.user.role)
    res.status(200).json(notes)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

async function getNoteById(req, res) {
  try {
    const note = await notesService.getNoteById(req.params.id, req.user.userId, req.user.role)
    res.status(200).json(note)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

async function updateNote(req, res) {
  try {
    const note = await notesService.updateNote(req.params.id, req.user.userId, req.body)
    res.status(200).json(note)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

async function deleteNote(req, res) {
  try {
    await notesService.deleteNote(req.params.id, req.user.userId)
    res.status(200).json({ message: 'Note deleted' })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

async function shareNote(req, res) {
  try {
    const note = await notesService.shareNote(req.params.id, req.user.userId, req.body.userId)
    res.status(200).json(note)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

async function publishNote(req, res) {
  try {
    if (!('role' in req.body)) {
      return res.status(400).json({ error: 'role field is required' })
    }
    const note = await notesService.publishNote(req.params.id, req.user.userId, req.body.role)
    res.status(200).json(note)
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message })
  }
}

module.exports = { createNote, getNotes, getNoteById, updateNote, deleteNote, shareNote, publishNote }
