pub mod graph;
pub mod note;

pub use graph::NoteGraph;
pub use note::{CategoryId, Note, NoteId, TagId};

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

// State wrapper for thread-safe access
pub struct AppState {
    pub graph: Mutex<NoteGraph>,
    pub notes_dir: PathBuf,
}

#[derive(Serialize)]
pub struct NoteInfo {
    pub id: u64,
    pub title: String,
    pub content: String,
}

#[derive(Deserialize)]
pub struct CreateNoteArgs {
    pub title: String,
    pub content: String,
}

/// Create a note: writes content to disk and inserts into the graph
#[tauri::command]
fn create_note(title: String, content: String, state: tauri::State<AppState>) -> Result<NoteInfo, String> {
    let mut graph = state.graph.lock().map_err(|e| e.to_string())?;

    // Generate a simple ID from timestamp
    let id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as u64;

    // Write content file
    let filename = format!("{}.md", id);
    let content_path = state.notes_dir.join(&filename);
    fs::write(&content_path, &content).map_err(|e| e.to_string())?;

    // Insert into graph
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let note = Note::new(
        id,
        title.clone(),
        now,
        content_path,
        Vec::<NoteId>::new(),
        Vec::<TagId>::new(),
        Vec::<CategoryId>::new(),
    );
    graph.insert(note);

    Ok(NoteInfo { id, title, content })
}

/// Get a single note by ID
#[tauri::command]
fn get_note(note_id: u64, state: tauri::State<AppState>) -> Result<NoteInfo, String> {
    let graph = state.graph.lock().map_err(|e| e.to_string())?;
    let note = graph.get(note_id).ok_or("Note not found")?;
    let content = graph.note_content(note_id).map_err(|e| e.to_string())?;

    Ok(NoteInfo {
        id: note.id(),
        title: note.title().to_string(),
        content,
    })
}

/// List all notes (id + title, no content for perf)
#[tauri::command]
fn list_notes(state: tauri::State<AppState>) -> Result<Vec<NoteInfo>, String> {
    let graph = state.graph.lock().map_err(|e| e.to_string())?;
    let mut notes = Vec::new();

    for &id in graph.all_ids() {
        if let Some(note) = graph.get(id) {
            let content = graph.note_content(id).unwrap_or_default();
            notes.push(NoteInfo {
                id: note.id(),
                title: note.title().to_string(),
                content,
            });
        }
    }

    Ok(notes)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            // Resolve notes directory next to the binary (or use app data dir)
            let notes_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| PathBuf::from("./notes"));

            fs::create_dir_all(&notes_dir).expect("Failed to create notes directory");

            app.manage(AppState {
                graph: Mutex::new(NoteGraph::new()),
                notes_dir,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![create_note, get_note, list_notes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
