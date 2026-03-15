const router = require('express').Router()
const authMiddleware = require('../middleware/auth.middleware')
const { searchUser } = require('../controllers/users.controller')

router.use(authMiddleware)
router.get('/search', searchUser)

module.exports = router
