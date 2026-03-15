# NoteIt Backend — Design Spec

## Goal

A REST API backend for the NoteIt app that handles user authentication and note management, including tagging, private sharing, and role-based publishing.

## Architecture

Standalone Express.js API using a layered structure:

```
Routes → Controllers → Services → Models
```

- **Routes** — define endpoints, apply auth middleware
- **Controllers** — parse request, call service, return response
- **Services** — all business logic (auth, note access rules, sharing)
- **Models** — Mongoose schemas for MongoDB

**Tech stack:** Node.js, Express.js, MongoDB, Mongoose, JWT (jsonwebtoken), bcrypt

## File Structure

```
noteit-backend/
├── src/
│   ├── routes/
│   │   ├── auth.routes.js
│   │   └── notes.routes.js
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── notes.controller.js
│   ├── services/
│   │   ├── auth.service.js
│   │   └── notes.service.js
│   ├── models/
│   │   ├── user.model.js
│   │   └── note.model.js
│   ├── middleware/
│   │   └── auth.middleware.js
│   └── app.js
├── server.js
├── .env
├── .gitignore
└── package.json
```

## Data Models

### User
```
username     String, required, unique, minLength: 3 (enforced in service, not schema)
email        String, required, unique, email format (enforced in service, not schema)
password     String, required (stored as bcrypt hash; minLength: 6 enforced in service before hashing, not on schema — schema stores the hash which is always 60 chars)
role         Enum: Student | Lecturer | Demonstrator, required
createdAt    Date (auto via Mongoose timestamps: true)
```

### Note
```
title        String, required
body         String, required
tags         [String], default: []
owner        ObjectId (ref User), required
sharedWith   [ObjectId] (ref User), default: []
publishedTo  Enum: Student | Lecturer | Demonstrator, optional (default: null, null means not published)
createdAt    Date (auto via Mongoose timestamps: true)
updatedAt    Date (auto via Mongoose timestamps: true)
```

Use `{ timestamps: true }` on both schemas for auto `createdAt`/`updatedAt`.

`publishedTo` is a single role — a note can be published to one role group at a time, or null (private/shared only).

## API Endpoints

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account, returns JWT | No |
| POST | `/api/auth/login` | Login, returns JWT | No |
| GET | `/api/auth/me` | Get current user (no password field) | Yes |

### Notes

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/notes` | Create a note | Yes |
| GET | `/api/notes` | List all notes visible to me | Yes |
| GET | `/api/notes/:id` | Get one note (same access rules as list) | Yes |
| PATCH | `/api/notes/:id` | Update title, body, tags (owner only) | Yes |
| DELETE | `/api/notes/:id` | Delete a note (owner only) | Yes |
| POST | `/api/notes/:id/share` | Share with a specific user | Yes |
| POST | `/api/notes/:id/publish` | Publish to a role group | Yes |

All protected endpoints require `Authorization: Bearer <token>` header.

## Request / Response Shapes

### POST /api/auth/register
Request: `{ username, email, password, role }`
Success 201: `{ token, user: { _id, username, email, role } }`
Error 409: duplicate email or username

### POST /api/auth/login
Request: `{ email, password }`
Success 200: `{ token, user: { _id, username, email, role } }`

### GET /api/auth/me
Success 200: `{ _id, username, email, role, createdAt }` (password excluded)
Error 404: user no longer exists in DB (token was valid but user was deleted)

### POST /api/notes
Request: `{ title, body, tags? }`
Success 201: full note object

### GET /api/notes
Success 200: `[...note objects]` sorted by `createdAt` descending (newest first)

### GET /api/notes/:id
Success 200: full note object

### PATCH /api/notes/:id
Request: `{ title?, body?, tags? }` (partial — only provided fields are updated)
`sharedWith` and `publishedTo` cannot be updated via PATCH — use the dedicated endpoints.
Empty body `{}` is a no-op — return 200 with the unchanged note.
Success 200: updated note object

### DELETE /api/notes/:id
Success 200: `{ message: "Note deleted" }`

### POST /api/notes/:id/share
Request: `{ userId }` (the MongoDB _id of the user to share with)
Success 200: updated note object
Error 404: user not found
Error 400: cannot share with yourself, or userId is already in `sharedWith`
Use MongoDB `$addToSet` to add to `sharedWith` — prevents duplicates atomically.

### POST /api/notes/:id/publish
Request: `{ role }` — one of: `"Student"`, `"Lecturer"`, `"Demonstrator"`, or `null` (null unpublishes)
Missing `role` field returns 400. Invalid string (e.g. `"Admin"`) returns 400.
Explicit `null` sets `publishedTo` to null (unpublishes).
Success 200: updated note object

## Auth Flow

1. User registers with username, email, password, role
2. Password is hashed with bcrypt (saltRounds: 10) before saving
3. On login, password is compared with bcrypt — if valid, a signed JWT is returned
4. JWT payload: `{ userId, role }`, expires in 7 days
5. Auth middleware verifies JWT from `Authorization: Bearer <token>` header, attaches `{ userId, role }` as plain object to `req.user`
6. Expired and malformed JWTs both return 401

## Note Access Rules

A user can see a note if **any** of these are true:
- They are the `owner`
- Their `_id` is in `sharedWith`
- Their `role` matches `publishedTo`

This applies to both `GET /api/notes` (list) and `GET /api/notes/:id` (single fetch).

`PATCH`, `DELETE`, `share`, and `publish` are restricted to the note owner only (403 if not owner).

## Error Handling

All endpoints return consistent JSON error responses:
```json
{ "error": "message describing what went wrong" }
```

| Status | When |
|--------|------|
| 400 | Validation failure, bad input |
| 401 | Missing, expired, or malformed JWT |
| 403 | Authenticated but not authorised (not owner) |
| 404 | Resource not found |
| 409 | Duplicate email or username on register |
| 500 | Unexpected server error |

## Environment Variables

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/noteit
JWT_SECRET=<long random string, min 32 characters>
NODE_ENV=development
```
