export function Sidebar({ notes, selectedNote, sidebarOpen, setSidebarOpen, notesDir, onSelect, onNewNote, onChangeDir }) {
  return (
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
          <button className="new-note-btn" onClick={onNewNote}>
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
                onClick={() => onSelect(n.id)}
              >
                {n.title}
              </li>
            ))}
          </ul>
          <div className="sidebar-footer">
            <button className="change-dir-btn" onClick={onChangeDir} title={notesDir}>
              📁 {notesDir.split("/").pop() || "Choose folder"}
            </button>
          </div>
        </>
      )}
    </aside>
  );
}
