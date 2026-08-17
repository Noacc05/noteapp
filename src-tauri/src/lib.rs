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
    pub notes_dir: Mutex<PathBuf>,
    pub config_path: PathBuf,
}

#[derive(Serialize, Deserialize)]
struct AppConfig {
    notes_dir: Option<String>,
}

#[derive(Serialize)]
pub struct NoteInfo {
    pub id: u64,
    pub title: String,
    pub content: String,
}

/// Get the current notes directory (for frontend to show)
#[tauri::command]
fn get_notes_dir(state: tauri::State<AppState>) -> Result<String, String> {
    let dir = state.notes_dir.lock().map_err(|e| e.to_string())?;
    Ok(dir.to_string_lossy().to_string())
}

/// Set notes directory — persists to config, reloads notes from new path
#[tauri::command]
fn set_notes_dir(path: String, state: tauri::State<AppState>) -> Result<String, String> {
    let new_dir = PathBuf::from(&path);
    fs::create_dir_all(&new_dir).map_err(|e| e.to_string())?;

    // Save to config
    let config = AppConfig {
        notes_dir: Some(path.clone()),
    };
    let config_json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&state.config_path, config_json).map_err(|e| e.to_string())?;

    // Update state
    let mut dir = state.notes_dir.lock().map_err(|e| e.to_string())?;
    *dir = new_dir.clone();

    // Reload graph from new directory
    let mut graph = state.graph.lock().map_err(|e| e.to_string())?;
    *graph = NoteGraph::new();
    load_notes_from_dir(&new_dir, &mut graph);

    Ok(path)
}

/// Create a note: writes content to disk and inserts into the graph
#[tauri::command]
fn create_note(title: String, content: String, state: tauri::State<AppState>) -> Result<NoteInfo, String> {
    let mut graph = state.graph.lock().map_err(|e| e.to_string())?;
    let notes_dir = state.notes_dir.lock().map_err(|e| e.to_string())?;

    let id = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_millis() as u64;

    let filename = format!("{}.md", id);
    let content_path = notes_dir.join(&filename);
    fs::write(&content_path, &content).map_err(|e| e.to_string())?;

    // Write a metadata sidecar so we can recover the title on reload
    let meta_path = notes_dir.join(format!("{}.meta.json", id));
    let meta = serde_json::json!({ "title": &title });
    fs::write(&meta_path, meta.to_string()).map_err(|e| e.to_string())?;

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

/// Update an existing note's title and content
#[tauri::command]
fn update_note(note_id: u64, title: String, content: String, state: tauri::State<AppState>) -> Result<NoteInfo, String> {
    let mut graph = state.graph.lock().map_err(|e| e.to_string())?;
    let notes_dir = state.notes_dir.lock().map_err(|e| e.to_string())?;

    let content_path = graph.get(note_id)
        .ok_or("Note not found")?
        .content_path()
        .to_path_buf();

    fs::write(&content_path, &content).map_err(|e| e.to_string())?;

    // Update title metadata sidecar
    let meta_path = notes_dir.join(format!("{}.meta.json", note_id));
    let meta = serde_json::json!({ "title": &title });
    fs::write(&meta_path, meta.to_string()).map_err(|e| e.to_string())?;

    graph.get_mut(note_id).unwrap().set_title(title.clone());

    Ok(NoteInfo {
        id: note_id,
        title,
        content,
    })
}

/// List all notes (id + title + content)
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

/// Load existing .md files from a directory into the graph
fn load_notes_from_dir(dir: &PathBuf, graph: &mut NoteGraph) {
    let entries = match fs::read_dir(dir) {
        Ok(e) => e,
        Err(_) => return,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map(|e| e == "md").unwrap_or(false) {
            // Extract ID from filename (e.g. "1234567890.md")
            if let Some(stem) = path.file_stem().and_then(|s| s.to_str()) {
                if let Ok(id) = stem.parse::<u64>() {
                    // Try to read title from sidecar
                    let meta_path = dir.join(format!("{}.meta.json", id));
                    let title = fs::read_to_string(&meta_path)
                        .ok()
                        .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                        .and_then(|v| v["title"].as_str().map(|s| s.to_string()))
                        .unwrap_or_else(|| stem.to_string());

                    let note = Note::new(
                        id,
                        title,
                        0i64,
                        path,
                        Vec::<NoteId>::new(),
                        Vec::<TagId>::new(),
                        Vec::<CategoryId>::new(),
                    );
                    graph.insert(note);
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let app_data_dir = app
                .path()
                .app_data_dir()
                .unwrap_or_else(|_| {
                    let home = std::env::var("HOME")
                        .unwrap_or_else(|_| "/tmp".to_string());
                    PathBuf::from(home).join(".noteapp")
                });

            fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");

            let config_path = app_data_dir.join("config.json");

            // Load saved notes dir from config, or default to app_data_dir/notes
            let notes_dir = fs::read_to_string(&config_path)
                .ok()
                .and_then(|s| serde_json::from_str::<AppConfig>(&s).ok())
                .and_then(|c| c.notes_dir)
                .map(PathBuf::from)
                .unwrap_or_else(|| app_data_dir.join("notes"));

            fs::create_dir_all(&notes_dir).expect("Failed to create notes directory");

            // Load existing notes from disk
            let mut graph = NoteGraph::new();
            load_notes_from_dir(&notes_dir, &mut graph);

            app.manage(AppState {
                graph: Mutex::new(graph),
                notes_dir: Mutex::new(notes_dir),
                config_path,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            create_note, get_note, list_notes, update_note,
            get_notes_dir, set_notes_dir
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
