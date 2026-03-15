import { useState, useEffect } from "react";
import api from "../api/axios";

export default function NoteEditor({ note, onNoteCreated, onNoteUpdated, onNoteDeleted }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setBody(note.body);
      setTags(note.tags.join(", "));
    } else {
      setTitle("");
      setBody("");
      setTags("");
    }
  }, [note]);

  const isNew = !note?._id;

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        title,
        body,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      };
      if (isNew) {
        const res = await api.post("/api/notes", payload);
        onNoteCreated(res.data);
      } else {
        const res = await api.patch(`/api/notes/${note._id}`, payload);
        onNoteUpdated(res.data);
      }
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/api/notes/${note._id}`);
      onNoteDeleted(note._id);
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const handlePublish = async (role) => {
    try {
      const res = await api.post(`/api/notes/${note._id}/publish`, {
        role: role === "Unpublish" ? null : role,
      });
      onNoteUpdated(res.data);
    } catch (err) {
      console.error("Publish failed:", err);
    }
  };

  return (
    <div className="note-editor">
      <input
        className="note-title-input"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="note-body-textarea"
        placeholder="Start writing..."
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <input
        className="note-tags-input"
        placeholder="Tags (comma-separated)"
        value={tags}
        onChange={(e) => setTags(e.target.value)}
      />
      <div className="note-actions">
        <button className="btn-save" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button className="btn-secondary" onClick={() => setShowShare(true)} disabled={isNew}>
          Share
        </button>
        <select
          className="publish-select"
          value=""
          onChange={(e) => { if (e.target.value) handlePublish(e.target.value); }}
          disabled={isNew}
        >
          <option value="">Publish ▾</option>
          <option value="Student">Student</option>
          <option value="Lecturer">Lecturer</option>
          <option value="Demonstrator">Demonstrator</option>
          <option value="Unpublish">Unpublish</option>
        </select>
        <button className="btn-delete" onClick={handleDelete} disabled={isNew}>
          Delete
        </button>
      </div>
      {showShare && <div>Share coming soon</div>}
    </div>
  );
}
