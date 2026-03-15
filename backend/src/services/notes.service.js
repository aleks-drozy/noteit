const Note = require('../models/note.model')
const User = require('../models/user.model')

const VALID_ROLES = ['Student', 'Lecturer', 'Demonstrator']

function accessQuery(userId, role) {
  return {
    $or: [
      { owner: userId },
      { sharedWith: userId },
      { publishedTo: role }
    ]
  }
}

async function createNote({ title, body, tags }, userId) {
  if (!title) throw { status: 400, message: 'Title is required' }
  if (!body) throw { status: 400, message: 'Body is required' }
  return Note.create({ title, body, tags: tags || [], owner: userId })
}

async function getNotes(userId, role) {
  return Note.find(accessQuery(userId, role)).sort({ createdAt: -1 })
}

async function getNoteById(noteId, userId, role) {
  const note = await Note.findOne({ _id: noteId, ...accessQuery(userId, role) })
  if (!note) throw { status: 404, message: 'Note not found' }
  return note
}

async function updateNote(noteId, userId, updates) {
  const note = await Note.findById(noteId)
  if (!note) throw { status: 404, message: 'Note not found' }
  if (note.owner.toString() !== userId) throw { status: 403, message: 'Not authorised' }

  const allowed = {}
  if (updates.title !== undefined) allowed.title = updates.title
  if (updates.body !== undefined) allowed.body = updates.body
  if (updates.tags !== undefined) allowed.tags = updates.tags
  // Empty body {} is a no-op — returns unchanged note
  if (Object.keys(allowed).length === 0) return note

  return Note.findByIdAndUpdate(noteId, allowed, { new: true })
}

async function deleteNote(noteId, userId) {
  const note = await Note.findById(noteId)
  if (!note) throw { status: 404, message: 'Note not found' }
  if (note.owner.toString() !== userId) throw { status: 403, message: 'Not authorised' }
  await Note.findByIdAndDelete(noteId)
}

async function shareNote(noteId, userId, targetUserId) {
  const note = await Note.findById(noteId)
  if (!note) throw { status: 404, message: 'Note not found' }
  if (note.owner.toString() !== userId) throw { status: 403, message: 'Not authorised' }
  if (targetUserId === userId) throw { status: 400, message: 'Cannot share with yourself' }

  const targetUser = await User.findById(targetUserId)
  if (!targetUser) throw { status: 404, message: 'User not found' }

  if (note.sharedWith.map(id => id.toString()).includes(targetUserId)) {
    throw { status: 400, message: 'User already has access' }
  }

  return Note.findByIdAndUpdate(
    noteId,
    { $addToSet: { sharedWith: targetUserId } },
    { new: true }
  )
}

async function publishNote(noteId, userId, role) {
  const note = await Note.findById(noteId)
  if (!note) throw { status: 404, message: 'Note not found' }
  if (note.owner.toString() !== userId) throw { status: 403, message: 'Not authorised' }
  if (role !== null && !VALID_ROLES.includes(role)) {
    throw { status: 400, message: 'Role must be Student, Lecturer, Demonstrator, or null' }
  }
  return Note.findByIdAndUpdate(noteId, { publishedTo: role }, { new: true })
}

module.exports = { createNote, getNotes, getNoteById, updateNote, deleteNote, shareNote, publishNote }
