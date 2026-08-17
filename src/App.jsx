import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import Markdown from "react-markdown";
import "./App.css";

function App() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notesDir, setNotesDir] = useState("");
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const saveTimer = useRef(null);
  const textareaRef = useRef(null);
  const idleTimer = useRef(null);
  const cursorPos = useRef(0);
  const pendingKeys = useRef([]);
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const selectedNoteRef = useRef(selectedNote);

  useEffect(() => {
    init();
  }, []);

  async function init() {
    try {
      const dir = await invoke("get_notes_dir");
      setNotesDir(dir);
      await loadNotes();
    } catch (e) {
      setError(`Init failed: ${e}`);
    }
  }

  async function loadNotes() {
    try {
      const result = await invoke("list_notes");
      setNotes(result);
    } catch (e) {
      setError(`Failed to load notes: ${e}`);
    }
  }

  async function handleChangeDir() {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        const newDir = await invoke("set_notes_dir", { path: selected });
        setNotesDir(newDir);
        setSelectedNote(null);
        setTitle("");
        setContent("");
        await loadNotes();
      }
    } catch (e) {
      setError(`Failed to change directory: ${e}`);
    }
  }

  // Debounced auto-save
  const scheduleAutoSave = useCallback(
    (noteId, newTitle, newContent) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(async () => {
        try {
          await invoke("update_note", {
            noteId,
            title: newTitle,
            content: newContent,
          });
          setNotes((prev) =>
            prev.map((n) =>
              n.id === noteId ? { ...n, title: newTitle, content: newContent } : n
            )
          );
        } catch (e) {
          setError(`Auto-save failed: ${e}`);
        }
      }, 600);
    },
    []
  );

  // Switch back to rendered after idle
  function resetIdleTimer() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setEditing(false);
    }, 300);
  }

  async function handleSelect(id) {
    try {
      const note = await invoke("get_note", { noteId: id });
      setSelectedNote(note);
      setTitle(note.title);
      setContent(note.content);
      setError("");
    } catch (e) {
      setError(`Failed to load note: ${e}`);
    }
  }

  async function handleNewNote() {
    try {
      const note = await invoke("create_note", {
        title: "Untitled Note",
        content: "",
      });
      setNotes((prev) => [...prev, note]);
      setSelectedNote(note);
      setTitle(note.title);
      setContent(note.content);
      setError("");
    } catch (e) {
      setError(`Failed to create note: ${e}`);
    }
  }

  function handleTitleChange(e) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (selectedNote) {
      scheduleAutoSave(selectedNote.id, newTitle, content);
    }
  }

  function handleContentChange(e) {
    const newContent = e.target.value;
    cursorPos.current = e.target.selectionStart;
    setContent(newContent);
    resetIdleTimer();
    if (selectedNote) {
      scheduleAutoSave(selectedNote.id, title, newContent);
    }
  }

  // Keep contentRef in sync
  useEffect(() => {
    contentRef.current = content;
    titleRef.current = title;
    selectedNoteRef.current = selectedNote;
  }, [content, title, selectedNote]);

  // Callback ref to restore cursor immediately on mount
  const textareaCallbackRef = useCallback((node) => {
    textareaRef.current = node;
    if (node) {
      node.focus();
      // Apply any buffered keystrokes
      if (pendingKeys.current.length > 0) {
        let newContent = contentRef.current;
        let pos = cursorPos.current;
        for (const key of pendingKeys.current) {
          if (key === "Backspace") {
            if (pos > 0) { newContent = newContent.slice(0, pos - 1) + newContent.slice(pos); pos--; }
          } else if (key === "Enter") {
            newContent = newContent.slice(0, pos) + "\n" + newContent.slice(pos); pos++;
          } else if (key === "ArrowLeft") {
            if (pos > 0) pos--;
          } else if (key === "ArrowRight") {
            if (pos < newContent.length) pos++;
          } else if (key === "ArrowUp") {
            const lineStart = newContent.lastIndexOf("\n", pos - 1);
            const prevLineStart = newContent.lastIndexOf("\n", lineStart - 1);
            const col = pos - lineStart - 1;
            if (lineStart > -1) pos = Math.min(prevLineStart + 1 + col, lineStart);
          } else if (key === "ArrowDown") {
            const lineStart = newContent.lastIndexOf("\n", pos - 1);
            const col = pos - (lineStart + 1);
            const nextLineStart = newContent.indexOf("\n", pos);
            if (nextLineStart > -1) { const nextNextLine = newContent.indexOf("\n", nextLineStart + 1); const lineEnd = nextNextLine > -1 ? nextNextLine : newContent.length; pos = Math.min(nextLineStart + 1 + col, lineEnd); }
          } else if (key.length === 1) {
            newContent = newContent.slice(0, pos) + key + newContent.slice(pos); pos++;
          }
        }
        pendingKeys.current = [];
        cursorPos.current = pos;
        setContent(newContent);
        if (selectedNoteRef.current) scheduleAutoSave(selectedNoteRef.current.id, titleRef.current, newContent);
        resetIdleTimer();
      }
      node.setSelectionRange(cursorPos.current, cursorPos.current);
    }
  }, [editing]);

  // Global keydown listener to re-enter edit mode
  useEffect(() => {
    function handleKeyDown(e) {
      // Don't trigger if focus is in the title input
      if (document.activeElement?.classList.contains("title-input")) return;
      const isTypingKey = e.key.length === 1 || e.key === "Backspace" || e.key === "Enter";
      const isArrow = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key);
      if (!editing && selectedNote && !e.metaKey && !e.ctrlKey && !e.altKey && (isTypingKey || isArrow)) {
        e.preventDefault();
        pendingKeys.current.push(e.key);
        setEditing(true);
        resetIdleTimer();
      } else if (editing && !document.activeElement?.classList.contains("content-textarea") && !e.metaKey && !e.ctrlKey && !e.altKey && isTypingKey) {
        // Textarea mounted but not yet focused — buffer these too
        e.preventDefault();
        pendingKeys.current.push(e.key);
        resetIdleTimer();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editing, selectedNote]);

  return (
    <main className="app">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : "collapsed"}`}>
        <div className="sidebar-header">
          <button
            className="toggle-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
          {sidebarOpen && (
            <button className="new-note-btn" onClick={handleNewNote}>
              + New
            </button>
          )}
        </div>
        {sidebarOpen && (
          <>
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
            <div className="sidebar-footer">
              <button className="change-dir-btn" onClick={handleChangeDir} title={notesDir}>
                📁 {notesDir.split("/").pop() || "Choose folder"}
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Main editor area */}
      <div className="editor-area">
        {selectedNote ? (
          <>
            <input
              className="title-input"
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Note title"
            />
            <div className="editor-container">
              {editing ? (
                <textarea
                  ref={textareaCallbackRef}
                  className="content-textarea"
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Write markdown here..."
                />
              ) : (
                <div
                  className="preview-rendered"
                  onClick={() => {
                    setEditing(true);
                    resetIdleTimer();
                  }}
                >
                  {content ? <Markdown>{content}</Markdown> : <p className="placeholder">Click to start writing...</p>}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>Select a note or create a new one</p>
          </div>
        )}
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}

export default App;
