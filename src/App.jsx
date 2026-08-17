import { useState, useEffect } from "react";
import { useNotes } from "./hooks/useNotes";
import { useEditorKeys } from "./hooks/useEditorKeys";
import { Sidebar } from "./components/Sidebar";
import { Editor } from "./components/Editor";
import "./App.css";

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editing, setEditing] = useState(false);

  const {
    notes, selectedNote, title, setTitle, content, setContent,
    notesDir, error,
    init, handleChangeDir, handleSelect, handleNewNote, scheduleAutoSave,
  } = useNotes();

  const {
    resetIdleTimer,
    handleContentChange,
    textareaCallbackRef,
  } = useEditorKeys({ content, setContent, title, selectedNote, editing, setEditing, scheduleAutoSave });

  useEffect(() => { init(); }, []);

  function handleTitleChange(e) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (selectedNote) {
      scheduleAutoSave(selectedNote.id, newTitle, content);
    }
  }

  return (
    <main className="app">
      <Sidebar
        notes={notes}
        selectedNote={selectedNote}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        notesDir={notesDir}
        onSelect={handleSelect}
        onNewNote={handleNewNote}
        onChangeDir={handleChangeDir}
      />

      {selectedNote ? (
        <Editor
          title={title}
          content={content}
          editing={editing}
          onTitleChange={handleTitleChange}
          onContentChange={handleContentChange}
          textareaCallbackRef={textareaCallbackRef}
          onClickPreview={() => { setEditing(true); resetIdleTimer(); }}
        />
      ) : (
        <div className="editor-area">
          <div className="empty-state">
            <p>Select a note or create a new one</p>
          </div>
        </div>
      )}

      {error && <p className="error">{error}</p>}
    </main>
  );
}

export default App;
