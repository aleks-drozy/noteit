import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import NotesList from '../components/NotesList'
import NoteEditor from '../components/NoteEditor'
import api from '../api/axios'

function Dashboard() {
  const { user, logout } = useAuth()
  const [notes, setNotes] = useState([])
  const [selectedNote, setSelectedNote] = useState(null)

  useEffect(() => {
    fetchNotes()
  }, [])

  async function fetchNotes() {
    try {
      const res = await api.get('/api/notes')
      setNotes(res.data)
    } catch (err) {
      console.error('Failed to fetch notes', err)
    }
  }

  function handleNewNote() {
    setSelectedNote(null)
  }

  function handleSelectNote(note) {
    setSelectedNote(note)
  }

  function handleNoteCreated(newNote) {
    setNotes((prev) => [newNote, ...prev])
    setSelectedNote(newNote)
  }

  function handleNoteUpdated(updatedNote) {
    setNotes((prev) =>
      prev.map((n) => (n._id === updatedNote._id ? updatedNote : n))
    )
    setSelectedNote(updatedNote)
  }

  function handleNoteDeleted(deletedId) {
    setNotes((prev) => prev.filter((n) => n._id !== deletedId))
    setSelectedNote(null)
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>NoteIt</h1>
        <div className="dashboard-user">
          <span>{user?.username} / {user?.role}</span>
          <button onClick={logout} className="logout-btn">Logout</button>
        </div>
      </header>
      <div className="dashboard-body">
        <NotesList
          notes={notes}
          selectedNote={selectedNote}
          onSelectNote={handleSelectNote}
          onNewNote={handleNewNote}
        />
        <NoteEditor
          note={selectedNote}
          onNoteCreated={handleNoteCreated}
          onNoteUpdated={handleNoteUpdated}
          onNoteDeleted={handleNoteDeleted}
        />
      </div>
    </div>
  )
}

export default Dashboard
