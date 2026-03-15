const request = require('supertest')
const app = require('../src/app')

async function register(overrides = {}) {
  const defaults = { username: 'alice', email: 'alice@test.com', password: 'password123', role: 'Student' }
  const res = await request(app).post('/api/auth/register').send({ ...defaults, ...overrides })
  return res.body
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

    await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Alice note', body: 'private' })
    await request(app).post('/api/notes').set('Authorization', `Bearer ${bob.token}`).send({ title: 'Bob note', body: 'private' })

    const res = await request(app).get('/api/notes').set('Authorization', `Bearer ${alice.token}`)
    expect(res.status).toBe(200)
    expect(res.body.length).toBe(1)
    expect(res.body[0].title).toBe('Alice note')
  })

  it('returns notes published to the user role', async () => {
    const lecturer = await register({ username: 'lect', email: 'lect@test.com', role: 'Lecturer' })
    const student = await register({ username: 'stud', email: 'stud@test.com', role: 'Student' })

    const noteRes = await request(app).post('/api/notes').set('Authorization', `Bearer ${lecturer.token}`).send({ title: 'Lecture notes', body: 'content' })
    await request(app).post(`/api/notes/${noteRes.body._id}/publish`).set('Authorization', `Bearer ${lecturer.token}`).send({ role: 'Student' })

    const res = await request(app).get('/api/notes').set('Authorization', `Bearer ${student.token}`)
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
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'Test', body: 'x' })
    const res = await request(app).get(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Test')
  })

  it('returns 404 if user has no access', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Private', body: 'x' })
    const res = await request(app).get(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${bob.token}`)
    expect(res.status).toBe(404)
  })
})

describe('PATCH /api/notes/:id', () => {
  it('updates title and body', async () => {
    const { token } = await register()
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'Old', body: 'old body' })
    const res = await request(app).patch(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${token}`).send({ title: 'New', body: 'new body' })
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('New')
    expect(res.body.body).toBe('new body')
  })

  it('returns 403 if not the owner', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    await request(app).post(`/api/notes/${created.body._id}/share`).set('Authorization', `Bearer ${alice.token}`).send({ userId: bob.user._id })
    const res = await request(app).patch(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${bob.token}`).send({ title: 'Hacked' })
    expect(res.status).toBe(403)
  })

  it('returns 200 with unchanged note for empty body', async () => {
    const { token } = await register()
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app).patch(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${token}`).send({})
    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Note')
  })
})

describe('DELETE /api/notes/:id', () => {
  it('deletes the note', async () => {
    const { token } = await register()
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${token}`).send({ title: 'To Delete', body: 'x' })
    const res = await request(app).delete(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(200)
    expect(res.body.message).toBe('Note deleted')
  })

  it('returns 403 if not the owner', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app).delete(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${bob.token}`)
    expect(res.status).toBe(403)
  })
})

describe('POST /api/notes/:id/share', () => {
  it('shares a note with another user who can then see it', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Shared', body: 'x' })

    const shareRes = await request(app).post(`/api/notes/${created.body._id}/share`).set('Authorization', `Bearer ${alice.token}`).send({ userId: bob.user._id })
    expect(shareRes.status).toBe(200)

    const viewRes = await request(app).get(`/api/notes/${created.body._id}`).set('Authorization', `Bearer ${bob.token}`)
    expect(viewRes.status).toBe(200)
  })

  it('returns 400 when sharing with yourself', async () => {
    const alice = await register()
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app).post(`/api/notes/${created.body._id}/share`).set('Authorization', `Bearer ${alice.token}`).send({ userId: alice.user._id })
    expect(res.status).toBe(400)
  })

  it('returns 400 when user already has access', async () => {
    const alice = await register()
    const bob = await register({ username: 'bob', email: 'bob@test.com' })
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    await request(app).post(`/api/notes/${created.body._id}/share`).set('Authorization', `Bearer ${alice.token}`).send({ userId: bob.user._id })
    const res = await request(app).post(`/api/notes/${created.body._id}/share`).set('Authorization', `Bearer ${alice.token}`).send({ userId: bob.user._id })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/notes/:id/publish', () => {
  it('publishes note to a role group', async () => {
    const alice = await register()
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app).post(`/api/notes/${created.body._id}/publish`).set('Authorization', `Bearer ${alice.token}`).send({ role: 'Lecturer' })
    expect(res.status).toBe(200)
    expect(res.body.publishedTo).toBe('Lecturer')
  })

  it('unpublishes when role is null', async () => {
    const alice = await register()
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    await request(app).post(`/api/notes/${created.body._id}/publish`).set('Authorization', `Bearer ${alice.token}`).send({ role: 'Student' })
    const res = await request(app).post(`/api/notes/${created.body._id}/publish`).set('Authorization', `Bearer ${alice.token}`).send({ role: null })
    expect(res.status).toBe(200)
    expect(res.body.publishedTo).toBeNull()
  })

  it('returns 400 for invalid role string', async () => {
    const alice = await register()
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app).post(`/api/notes/${created.body._id}/publish`).set('Authorization', `Bearer ${alice.token}`).send({ role: 'Admin' })
    expect(res.status).toBe(400)
  })

  it('returns 400 when role field is missing', async () => {
    const alice = await register()
    const created = await request(app).post('/api/notes').set('Authorization', `Bearer ${alice.token}`).send({ title: 'Note', body: 'x' })
    const res = await request(app).post(`/api/notes/${created.body._id}/publish`).set('Authorization', `Bearer ${alice.token}`).send({})
    expect(res.status).toBe(400)
  })
})
