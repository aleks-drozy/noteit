# NoteIt Backend Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a REST API backend for NoteIt with JWT auth, note CRUD, private sharing, and role-based publishing.

**Architecture:** Express.js with layered Routes → Controllers → Services → Models structure. MongoDB via Mongoose for persistence. JWT for stateless auth. Tests use Jest + Supertest + mongodb-memory-server (no real MongoDB needed for tests).

**Tech Stack:** Node.js, Express 4, Mongoose 8, jsonwebtoken, bcryptjs, Jest, Supertest, mongodb-memory-server

---

## Chunk 1: Project Setup + Auth

### Task 1: Project Setup

**Files:**
- Create: `package.json`
- Create: `jest.config.js`
- Create: `.gitignore`
- Create: `.env.example`
- Create: `server.js`
- Create: `src/app.js`
- Create: `tests/setup.js`

- [ ] **Step 1: Initialise npm and install dependencies**

```bash
cd /c/Users/aleks/projects/noteit-backend
npm init -y
npm install express mongoose jsonwebtoken bcryptjs dotenv cors
npm install --save-dev jest supertest mongodb-memory-server
```

- [ ] **Step 2: Create `package.json` scripts section**

Edit `package.json` — replace the scripts block with:

```json
"scripts": {
  "start": "node server.js",
  "dev": "node --watch server.js",
  "test": "jest --runInBand"
}
```

- [ ] **Step 3: Create `jest.config.js`**

```js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['./tests/setup.js'],
  testMatch: ['**/tests/**/*.test.js'],
  testTimeout: 30000
}
```

- [ ] **Step 4: Create `.gitignore`**

```
node_modules/
.env
```

- [ ] **Step 5: Create `.env.example`**

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/noteit
JWT_SECRET=replace-with-a-long-random-string-min-32-chars
NODE_ENV=development
```

- [ ] **Step 6: Create `.env`** (copy from example, fill in JWT_SECRET)

```bash
cp .env.example .env
```

Edit `.env` and set `JWT_SECRET` to any long random string, e.g. `noteit-super-secret-jwt-key-12345`.

- [ ] **Step 7: Create `src/app.js`**

```js
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth.routes')
const notesRoutes = require('./routes/notes.routes')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/notes', notesRoutes)

// Global error handler
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

module.exports = app
```

- [ ] **Step 8: Create `server.js`**

```js
require('dotenv').config()
const mongoose = require('mongoose')
const app = require('./src/app')

const PORT = process.env.PORT || 5000
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/noteit'

mongoose.connect(MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err)
    process.exit(1)
  })
```

- [ ] **Step 9: Create placeholder route files** (so app.js doesn't crash during tests)

`src/routes/auth.routes.js`:
```js
const router = require('express').Router()
module.exports = router
```

`src/routes/notes.routes.js`:
```js
const router = require('express').Router()
module.exports = router
```

Also create empty placeholder directories:
```bash
mkdir -p src/models src/services src/controllers src/middleware
```

- [ ] **Step 10: Create `tests/setup.js`**

```js
const { MongoMemoryServer } = require('mongodb-memory-server')
const mongoose = require('mongoose')

let mongod

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()
  await mongoose.connect(uri)
  process.env.JWT_SECRET = 'test-secret-key-at-least-32-characters!!'
})

afterEach(async () => {
  const collections = mongoose.connection.collections
  for (const key in collections) {
    await collections[key].deleteMany({})
  }
})

afterAll(async () => {
  await mongoose.disconnect()
  await mongod.stop()
})
```

- [ ] **Step 11: Verify setup works**

```bash
npm test -- --passWithNoTests
```

Expected: passes with 0 test suites (no tests yet).

- [ ] **Step 12: Commit**

```bash
git add .
git commit -m "chore: project setup with Express, Mongoose, Jest"
```

---

### Task 2: User Model

**Files:**
- Create: `src/models/user.model.js`

- [ ] **Step 1: Write the failing test**

Create `tests/auth.test.js`:

```js
const request = require('supertest')
const app = require('../src/app')

describe('POST /api/auth/register', () => {
  it('registers a user and returns a token and user object', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'alice',
      email: 'alice@test.com',
      password: 'password123',
      role: 'Student'
    })
    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('alice@test.com')
    expect(res.body.user.password).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test
```

Expected: FAIL — route returns 404 or similar.

- [ ] **Step 3: Create `src/models/user.model.js`**

```js
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role:     { type: String, enum: ['Student', 'Lecturer', 'Demonstrator'], required: true }
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema)
```

Note: minLength validations for username (3) and password (6) are enforced in the service layer, not the schema, because the schema stores the bcrypt hash (always 60 chars).

- [ ] **Step 4: Commit model**

```bash
git add src/models/user.model.js
git commit -m "feat: add User model"
```

---

### Task 3: Auth Service

**Files:**
- Create: `src/services/auth.service.js`

- [ ] **Step 1: Create `src/services/auth.service.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/auth.service.js
git commit -m "feat: add auth service (register, login, getMe)"
```

---

### Task 4: Auth Middleware

**Files:**
- Create: `src/middleware/auth.middleware.js`

- [ ] **Step 1: Create `src/middleware/auth.middleware.js`**

```js
const jwt = require('jsonwebtoken')

function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }
  const token = header.split(' ')[1]
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.user = { userId: payload.userId, role: payload.role }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

module.exports = authMiddleware
```

- [ ] **Step 2: Commit**

```bash
git add src/middleware/auth.middleware.js
git commit -m "feat: add JWT auth middleware"
```

---

### Task 5: Auth Controller + Routes + Tests

**Files:**
- Create: `src/controllers/auth.controller.js`
- Modify: `src/routes/auth.routes.js`
- Modify: `tests/auth.test.js`

- [ ] **Step 1: Create `src/controllers/auth.controller.js`**

```js
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
```

- [ ] **Step 2: Replace `src/routes/auth.routes.js`**

```js
const router = require('express').Router()
const authController = require('../controllers/auth.controller')
const authMiddleware = require('../middleware/auth.middleware')

router.post('/register', authController.register)
router.post('/login', authController.login)
router.get('/me', authMiddleware, authController.getMe)

module.exports = router
```

- [ ] **Step 3: Run tests — verify register test passes**

```bash
npm test
```

Expected: 1 passing.

- [ ] **Step 4: Expand `tests/auth.test.js` with full auth test suite**

Replace the file contents:

```js
const request = require('supertest')
const app = require('../src/app')

const validUser = {
  username: 'alice',
  email: 'alice@test.com',
  password: 'password123',
  role: 'Student'
}

async function registerUser(overrides = {}) {
  return request(app).post('/api/auth/register').send({ ...validUser, ...overrides })
}

describe('POST /api/auth/register', () => {
  it('registers a user and returns a token and user object', async () => {
    const res = await registerUser()
    expect(res.status).toBe(201)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('alice@test.com')
    expect(res.body.user.password).toBeUndefined()
  })

  it('returns 409 for duplicate email', async () => {
    await registerUser()
    const res = await registerUser({ username: 'alice2' })
    expect(res.status).toBe(409)
  })

  it('returns 409 for duplicate username', async () => {
    await registerUser()
    const res = await registerUser({ email: 'other@test.com' })
    expect(res.status).toBe(409)
  })

  it('returns 400 for password shorter than 6 chars', async () => {
    const res = await registerUser({ password: '123' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for username shorter than 3 chars', async () => {
    const res = await registerUser({ username: 'ab' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid email format', async () => {
    const res = await registerUser({ email: 'not-an-email' })
    expect(res.status).toBe(400)
  })

  it('returns 400 for invalid role', async () => {
    const res = await registerUser({ role: 'Admin' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  beforeEach(async () => { await registerUser() })

  it('logs in with correct credentials and returns a token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@test.com', password: 'password123'
    })
    expect(res.status).toBe(200)
    expect(res.body.token).toBeDefined()
    expect(res.body.user.email).toBe('alice@test.com')
  })

  it('returns 401 for wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'alice@test.com', password: 'wrongpassword'
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 for non-existent email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@test.com', password: 'password123'
    })
    expect(res.status).toBe(401)
  })

  it('returns 400 when fields are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({})
    expect(res.status).toBe(400)
  })
})

describe('GET /api/auth/me', () => {
  it('returns current user without password field', async () => {
    const reg = await registerUser()
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${reg.body.token}`)
    expect(res.status).toBe(200)
    expect(res.body.email).toBe('alice@test.com')
    expect(res.body.password).toBeUndefined()
  })

  it('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('returns 401 with an invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer notarealtoken')
    expect(res.status).toBe(401)
  })
})
```

- [ ] **Step 5: Run tests — all auth tests pass**

```bash
npm test
```

Expected: all tests in `tests/auth.test.js` pass.

- [ ] **Step 6: Commit**

```bash
git add src/controllers/auth.controller.js src/routes/auth.routes.js tests/auth.test.js
git commit -m "feat: auth controller, routes, and tests"
```

---

## Chunk 2: Notes

### Task 6: Note Model

**Files:**
- Create: `src/models/note.model.js`

- [ ] **Step 1: Write failing test**

Create `tests/notes.test.js` with just one test to start:

```js
const request = require('supertest')
const app = require('../src/app')

const validUser = {
  username: 'alice', email: 'alice@test.com', password: 'password123', role: 'Student'
}

async function registerUser(overrides = {}) {
  const res = await request(app).post('/api/auth/register').send({ ...validUser, ...overrides })
  return res.body
}

describe('POST /api/notes', () => {
  it('creates a note and returns it', async () => {
    const { token } = await registerUser()
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My Note', body: 'Some content', tags: ['tag1'] })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('My Note')
    expect(res.body.owner).toBeDefined()
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npm test tests/notes.test.js
```

Expected: FAIL — route returns 404.

- [ ] **Step 3: Create `src/models/note.model.js`**

```js
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
```

- [ ] **Step 4: Commit**

```bash
git add src/models/note.model.js tests/notes.test.js
git commit -m "feat: add Note model"
```

---

### Task 7: Notes Service

**Files:**
- Create: `src/services/notes.service.js`

- [ ] **Step 1: Create `src/services/notes.service.js`**

```js
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
```

- [ ] **Step 2: Commit**

```bash
git add src/services/notes.service.js
git commit -m "feat: add notes service"
```

---

### Task 8: Notes Controller + Routes + Tests

**Files:**
- Create: `src/controllers/notes.controller.js`
- Modify: `src/routes/notes.routes.js`
- Modify: `tests/notes.test.js`

- [ ] **Step 1: Create `src/controllers/notes.controller.js`**

```js
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
```

- [ ] **Step 2: Replace `src/routes/notes.routes.js`**

```js
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
```

- [ ] **Step 3: Run current test — verify it passes**

```bash
npm test tests/notes.test.js
```

Expected: 1 passing (the create note test).

- [ ] **Step 4: Replace `tests/notes.test.js` with full test suite**

```js
const request = require('supertest')
const app = require('../src/app')

async function register(overrides = {}) {
  const defaults = { username: 'alice', email: 'alice@test.com', password: 'password123', role: 'Student' }
  const res = await request(app).post('/api/auth/register').send({ ...defaults, ...overrides })
  return res.body
}

async function authed(token) {
  return (method, path) => request(app)[method](path).set('Authorization', `Bearer ${token}`)
}

describe('POST /api/notes', () => {
  it('creates a note and returns it', async () => {
    const { token } = await register()
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'My Note', body: 'Some content', tags: ['study'] })
    expect(res.status).toBe(201)
    expect(res.body.title).toBe('My Note')
    expect(res.body.tags).toEqual(['study'])
    expect(res.body.owner).toBeDefined()
  })

  it('returns 400 when title is missing', async () => {
    const { token } = await register()
    const res = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${token}`)
      .send({ body: 'content' })
    expect(res.status).toBe(400)
  })

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/notes').send({ title: 'x', body: 'y' })
    expect(res.status).toBe(401)
  })
})

describe('GET /api/notes', () => {
  it('returns only notes visible to the user', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })

    // Alice creates a note
    await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ title: 'Alice note', body: 'private' })

    // Bob creates a note
    await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ title: 'Bob note', body: 'private' })

    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${alice.token}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].title).toBe('Alice note')
  })

  it('returns notes published to the user role', async () => {
    const lecturer = await register({ username: 'lect', email: 'lect@test.com', role: 'Lecturer' })
    const student = await register({ username: 'stud', email: 'stud@test.com', role: 'Student' })

    // Lecturer publishes a note to students
    const noteRes = await request(app)
      .post('/api/notes')
      .set('Authorization', `Bearer ${lecturer.token}`)
      .send({ title: 'Lecture notes', body: 'content' })
    await request(app)
      .post(`/api/notes/${noteRes.body._id}/publish`)
      .set('Authorization', `Bearer ${lecturer.token}`)
      .send({ role: 'Student' })

    const res = await request(app)
      .get('/api/notes')
      .set('Authorization', `Bearer ${student.token}`)
    expect(res.status).toBe(200)
    expect(res.body.some(n => n.title === 'Lecture notes')).toBe(true)
  })

  it('returns notes sorted newest first', async () => {
    const { token } = await register()
    await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'First', body: 'x' })
    await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'Second', body: 'x' })
    const res = await request(app).get('/api/notes').set('Authorization', `Bearer ${token}`)
    expect(res.body[0].title).toBe('Second')
    expect(res.body[1].title).toBe('First')
  })
})

describe('GET /api/notes/:id', () => {
  it('returns the note if user has access', async () => {
    const { token } = await register()
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'Test', body: 'x' })
    const res = await request(app)
      .get(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Test')
  })

  it('returns 404 if user has no access', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Private', body: 'x' })
    const res = await request(app)
      .get(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${bob.token}`)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/notes/:id', () => {
  it('updates title and body', async () => {
    const { token } = await register()
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'Old', body: 'old body' })
    const res = await request(app)
      .patch(`/api/notes/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New', body: 'new body' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('New')
    expect(res.body.body).toBe('new body')
  })

  it('returns 403 if not the owner', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })

    // Share so bob can see it but not edit
    await request(app)
      .post(`/api/notes/${created.body._id}/share`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ userId: bob.user._id })

    const res = await request(app)
      .patch(`/api/notes/${created.body._id}`)
      .set('Authorization', `Bearer ${bob.token}`)
      .send({ title: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('returns 200 with unchanged note for empty body', async () => {
    const { token } = await register()
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app)
      .patch(`/api/notes/${created.body._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Note')
  })
})

describe('DELETE /api/notes/:id', () => {
  it('deletes the note', async () => {
    const { token } = await register()
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'To Delete', body: 'x' })
    const res = await request(app)
      .delete(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Note deleted')
  })

  it('returns 403 if not the owner', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app)
      .delete(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${bob.token}`)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/notes/:id/share', () => {
  it('shares a note with another user', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Shared', body: 'x' })

    const shareRes = await request(app)
      .post(`/api/notes/${created.body._id}/share`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ userId: bob.user._id })
    expect(shareRes.status).toBe(200)

    // Bob can now see the note
    const viewRes = await request(app)
      .get(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${bob.token}`)
    expect(viewRes.status).toBe(200)
  })

  it('returns 400 when sharing with yourself', async () => {
    const alice = await register()
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app)
      .post(`/api/notes/${created.body._id}/share`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ userId: alice.user._id })
    expect(res.status).toBe(400)
  })

  it('returns 400 when user already has access', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    await request(app)
      .post(`/api/notes/${created.body._id}/share`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ userId: bob.user._id })
    const res = await request(app)
      .post(`/api/notes/${created.body._id}/share`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ userId: bob.user._id })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/notes/:id/publish', () => {
  it('publishes note to a role group', async () => {
    const alice = await register()
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app)
      .post(`/api/notes/${created.body._id}/publish`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ role: 'Lecturer' })
    expect(res.status).toBe(200)
    expect(res.body.publishedTo).toBe('Lecturer')
  })

  it('unpublishes a note when role is null', async () => {
    const alice = await register()
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    await request(app)
      .post(`/api/notes/${created.body._id}/publish`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ role: 'Student' })
    const res = await request(app)
      .post(`/api/notes/${created.body._id}/publish`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ role: null })
    expect(res.status).toBe(200)
    expect(res.body.publishedTo).toBeNull()
  })

  it('returns 400 for invalid role string', async () => {
    const alice = await register()
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app)
      .post(`/api/notes/${created.body._id}/publish`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({ role: 'Admin' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when role field is missing', async () => {
    const alice = await register()
    const created = await request(app)
      .post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app)
      .post(`/api/notes/${created.body._id}/publish`)
      .set('Authorization', `Bearer ${alice.token}`)
      .send({})
    expect(res.status).toBe(400)
  })
})
```

- [ ] **Step 5: Run all tests — everything passes**

```bash
npm test
```

Expected: all tests in `tests/auth.test.js` and `tests/notes.test.js` pass.

- [ ] **Step 6: Commit**

```bash
git add src/controllers/notes.controller.js src/routes/notes.routes.js tests/notes.test.js
git commit -m "feat: notes controller, routes, and full test suite"
```

---

### Task 9: README + GitHub push

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# NoteIt Backend

REST API backend for the NoteIt app. Handles user authentication and note management with private sharing and role-based publishing.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Auth:** JWT (jsonwebtoken) + bcryptjs
- **Tests:** Jest + Supertest + mongodb-memory-server

## Roles

Users register as `Student`, `Lecturer`, or `Demonstrator`. Notes can be published to a role group so all users of that role can see them.

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register, returns JWT |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user |

### Notes (all require `Authorization: Bearer <token>`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/notes` | Create a note |
| GET | `/api/notes` | List notes visible to me |
| GET | `/api/notes/:id` | Get one note |
| PATCH | `/api/notes/:id` | Update title/body/tags (owner only) |
| DELETE | `/api/notes/:id` | Delete a note (owner only) |
| POST | `/api/notes/:id/share` | Share with a specific user |
| POST | `/api/notes/:id/publish` | Publish to a role group |

## Running Locally

**Prerequisites:** Node.js and MongoDB installed and running.

```bash
git clone https://github.com/aleks-drozy/noteit-backend.git
cd noteit-backend
npm install
cp .env.example .env   # then set JWT_SECRET
npm run dev
```

Server runs on `http://localhost:5000`.

## Running Tests

No MongoDB needed — tests use an in-memory database.

```bash
npm test
```
```

- [ ] **Step 2: Create GitHub repo and push**

```bash
git add README.md
git commit -m "docs: add README"
```

Go to https://github.com/new, create a repo called `noteit-backend`, then:

```bash
git remote add origin https://github.com/aleks-drozy/noteit-backend.git
git push -u origin master
```

- [ ] **Step 3: Final check — run all tests**

```bash
npm test
```

Expected: all tests pass. Done.
