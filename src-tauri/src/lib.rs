pub mod graph;
pub mod note;

pub use graph::NoteGraph;
pub use note::{CategoryId, Note, NoteId, TagId};

use serde::Serialize;
use tauri::Manager;

#[derive(Serialize)]
struct NoteInfo {
    id: u64,
    title: String,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to NoteApp.", name)
}

#[tauri::command]
fn list_notes() -> Vec<NoteInfo> {
    // Placeholder until state is wired
    vec![]
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, list_notes])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
