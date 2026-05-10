# NoteIt

Full-stack note-taking application with authentication, role-based publishing, private sharing, and CRUD note management.

## Overview

NoteIt is a student-focused notes app built as a full-stack JavaScript project. It includes a dedicated backend API, a frontend client, user authentication, and visibility rules for sharing notes with individuals or publishing them to role groups.

## Features

- User registration and login
- Role-based accounts for students, lecturers, and demonstrators
- Create, read, update, and delete notes
- Share private notes with selected users
- Publish notes to role-based groups
- Separate frontend and backend development workflow

## Tech Stack

- JavaScript
- Node.js
- Express
- MongoDB
- React
- Vite

## Repository Structure

```text
backend/     Express API, auth, note models, and server logic
frontend/    React/Vite client application
README.md    Project documentation
```

## Running Locally

Requirements:

- Node.js 18+
- MongoDB running locally on port 27017

Start the backend:

```bash
cd backend
npm install
npm run dev
```

The backend runs on [http://localhost:5000](http://localhost:5000).

Start the frontend:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on [http://localhost:5173](http://localhost:5173).
