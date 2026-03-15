import { useState, useEffect, useRef } from "react";
import api from "../api/axios";

export default function ShareModal({ noteId, onClose }) {
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const timerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  useEffect(() => { return () => { if (timerRef.current) clearTimeout(timerRef.current); }; }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim()) return;
    setSubmitting(true);
    setStatus(null);
    try {
      const searchRes = await api.get(`/api/users/search?username=${encodeURIComponent(username.trim())}`);
      const foundUser = searchRes.data; // { _id, username, role }
      if (!foundUser?._id) {
        setStatus({ type: "error", message: "User not found" });
        return;
      }
      await api.post(`/api/notes/${noteId}/share`, { userId: foundUser._id });
      setStatus({ type: "success", message: `Shared with ${foundUser.username}` });
      timerRef.current = setTimeout(() => onCloseRef.current(), 2000);
    } catch (err) {
      const message = err.response?.data?.error || "Something went wrong";
      setStatus({ type: "error", message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Share Note</h3>
        <form onSubmit={handleSubmit}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
          />
          {status?.type === "error" && <p className="modal-error">{status.message}</p>}
          {status?.type === "success" && <p className="modal-success">{status.message}</p>}
          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={submitting || !username.trim()}>
              {submitting ? "Sharing..." : "Share"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
