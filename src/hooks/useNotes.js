import { useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";

export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [selectedNote, setSelectedNote] = useState(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [notesDir, setNotesDir] = useState("");
  const [error, setError] = useState("");
  const saveTimer = useRef(null);

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

  const scheduleAutoSave = useCallback((noteId, newTitle, newContent) => {
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
  }, []);

  return {
    notes, selectedNote, title, setTitle, content, setContent,
    notesDir, error, setError,
    init, handleChangeDir, handleSelect, handleNewNote, scheduleAutoSave,
  };
}
