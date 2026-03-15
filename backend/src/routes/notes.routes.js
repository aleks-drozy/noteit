const router = require('express').Router()
const notesController = require('../controllers/notes.controller')
const authMiddleware = require('../middleware/auth.middleware')

router.use(authMiddleware)

router.post('/', notesController.createNote)
router.get('/', notesController.getNotes)
router.get('/:id', notesController.getNoteById)
router.patch('/:id', notesController.updateNote)
router.delete('/:id', notesController.deleteNote)
router.post('/:id/share', notesController.shareNote)
router.post('/:id/publish', notesController.publishNote)

module.exports = router
