use std::collections::HashMap;
use std::fs;
use std::io;

use crate::note::{Note, NoteId};

#[derive(Debug, Default)]
pub struct NoteGraph {
    notes: HashMap<NoteId, Note>,
}

impl NoteGraph {
    pub fn new() -> Self {
        Self {
            notes: HashMap::new(),
        }
    }

    pub fn insert(&mut self, note: Note) -> Option<Note> {
        self.notes.insert(note.id(), note)
    }

    pub fn get(&self, note_id: NoteId) -> Option<&Note> {
        self.notes.get(&note_id)
    }

    pub fn get_mut(&mut self, note_id: NoteId) -> Option<&mut Note> {
        self.notes.get_mut(&note_id)
    }

    pub fn remove(&mut self, note_id: NoteId) -> Option<Note> {
        self.notes.remove(&note_id)
    }

    pub fn all_ids(&self) -> impl Iterator<Item = &NoteId> {
        self.notes.keys()
    }

    pub fn note_content(&self, note_id: NoteId) -> io::Result<String> {
        let note = self
            .notes
            .get(&note_id)
            .ok_or_else(|| io::Error::new(io::ErrorKind::NotFound, "note not found"))?;

        fs::read_to_string(note.content_path())
    }

    pub fn add_connection(&mut self, from: NoteId, to: NoteId) {
        if let Some(note) = self.notes.get_mut(&from) {
            let mut connections = note.connections().to_vec();
            if !connections.contains(&to) {
                connections.push(to);
                note.set_connections(connections);
            }
        }
    }

    pub fn remove_connection(&mut self, from: NoteId, to: NoteId) {
        if let Some(note) = self.notes.get_mut(&from) {
            let connections: Vec<_> = note.connections().iter().copied().filter(|&id| id != to).collect();
            note.set_connections(connections);
        }
    }
}
