const mongoose = require('mongoose')

const noteSchema = new mongoose.Schema({
  title:       { type: String, required: true },
  body:        { type: String, required: true },
  tags:        { type: [String], default: [] },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith:  { type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] },
  publishedTo: { type: String, default: null }
  // publishedTo validated in service: Student | Lecturer | Demonstrator | null
}, { timestamps: true })

module.exports = mongoose.model('Note', noteSchema)
