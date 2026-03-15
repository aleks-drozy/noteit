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
