function NotesList({ notes, selectedNote, onSelectNote, onNewNote }) {
  return (
    <div className="notes-list">
      <div className="notes-list-header">
        <button className="new-note-btn" onClick={onNewNote}>
          + New Note
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="notes-empty">No notes yet.</div>
      ) : (
        notes.map((note) => (
          <div
            key={note._id}
            className={"note-item" + (note._id === selectedNote?._id ? " selected" : "")}
            onClick={() => onSelectNote(note)}
          >
            <div className="note-item-title">
              {note.title || "Untitled"}
            </div>
            <div className="note-item-preview">
              {(note.body || "").slice(0, 60)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

export default NotesList;
