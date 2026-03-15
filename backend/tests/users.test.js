const request = require('supertest')
const app = require('../src/app')

const validUser = {
  username: 'Alice',
  email: 'alice@test.com',
  password: 'password123',
  role: 'Student'
}

async function registerAndLogin() {
  await request(app).post('/api/auth/register').send(validUser)
  const res = await request(app).post('/api/auth/login').send({
    email: validUser.email,
    password: validUser.password
  })
  return res.body.token
}

describe('GET /api/users/search', () => {
  let token

  beforeEach(async () => {
    token = await registerAndLogin()
  })

  it('returns 400 when username query param is missing', async () => {
    const res = await request(app)
      .get('/api/users/search')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('username query parameter is required')
  })

  it('returns the user when found (case-insensitive match)', async () => {
    const res = await request(app)
      .get('/api/users/search?username=alice')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('Alice')
    expect(res.body.role).toBe('Student')
    expect(res.body._id).toBeDefined()
    expect(res.body.password).toBeUndefined()
  })

  it('returns 404 when user is not found', async () => {
    const res = await request(app)
      .get('/api/users/search?username=nobody')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(404)
    expect(res.body.error).toBe('User not found')
  })

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/users/search?username=alice')
    expect(res.status).toBe(401)
  })
})
