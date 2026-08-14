import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Markdown from "react-markdown";
import "./App.css";

function App() {
  const [notes, setNotes] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedNote, setSelectedNote] = useState(null);
  const [error, setError] = useState("");

  // Load notes on mount
  useEffect(() => {
    loadNotes();
  }, []);

  async function loadNotes() {
    try {
      const result = await invoke("list_notes");
      setNotes(result);
    } catch (e) {
      setError(`Failed to load notes: ${e}`);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      // invoke sends camelCase → Rust receives snake_case
      const note = await invoke("create_note", {
        title: title.trim(),
        content: content.trim(),
      });
      setNotes([...notes, note]);
      setTitle("");
      setContent("");
      setSelectedNote(note);
      setError("");
    } catch (e) {
      setError(`Failed to create note: ${e}`);
    }
  }

  async function handleSelect(id) {
    try {
      // noteId in JS → note_id in Rust
      const note = await invoke("get_note", { noteId: id });
      setSelectedNote(note);
    } catch (e) {
      setError(`Failed to load note: ${e}`);
    }
  }

  return (
    <main className="container">
      <div className="sidebar">
        <h2>Notes</h2>
        <ul className="note-list">
          {notes.map((n) => (
            <li
              key={n.id}
              className={selectedNote?.id === n.id ? "active" : ""}
              onClick={() => handleSelect(n.id)}
            >
              {n.title}
            </li>
          ))}
        </ul>
      </div>

      <div className="editor">
        <form onSubmit={handleCreate} className="create-form" >
          <input
            type="text"
            placeholder="Note title"
            value={"Untitled Note" && title}
            onChange={(e) => setTitle(e.target.value)}
          /> 
          <textarea
            placeholder="Write your note content here..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={6}
          />
          <button type="submit">Create Note</button>
        </form>

        {error && <p className="error">{error}</p>}

        {selectedNote && (
          <div className="note-view">
            <h3>{selectedNote.title}</h3>
            <Markdown>{selectedNote.content}</Markdown>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
