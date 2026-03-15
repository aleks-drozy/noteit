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
