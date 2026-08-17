import { useEffect, useRef, useCallback } from "react";

/**
 * Manages the edit/render toggle, keystroke buffering, and idle timer.
 */
export function useEditorKeys({ content, setContent, title, selectedNote, editing, setEditing, scheduleAutoSave }) {
  const idleTimer = useRef(null);
  const cursorPos = useRef(0);
  const pendingKeys = useRef([]);
  const textareaRef = useRef(null);
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  const selectedNoteRef = useRef(selectedNote);

  // Keep refs in sync
  useEffect(() => {
    contentRef.current = content;
    titleRef.current = title;
    selectedNoteRef.current = selectedNote;
  }, [content, title, selectedNote]);

  function resetIdleTimer() {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      setEditing(false);
    }, 300);
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

  function applyBufferedKeys(node) {
    if (pendingKeys.current.length === 0) return;

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
        if (nextLineStart > -1) {
          const nextNextLine = newContent.indexOf("\n", nextLineStart + 1);
          const lineEnd = nextNextLine > -1 ? nextNextLine : newContent.length;
          pos = Math.min(nextLineStart + 1 + col, lineEnd);
        }
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

  // Callback ref — focuses textarea and drains buffer on mount
  const textareaCallbackRef = useCallback((node) => {
    textareaRef.current = node;
    if (node) {
      node.focus();
      applyBufferedKeys(node);
      node.setSelectionRange(cursorPos.current, cursorPos.current);
    }
  }, [editing]);

  // Global keydown to re-enter edit mode
  useEffect(() => {
    function handleKeyDown(e) {
      if (document.activeElement?.classList.contains("title-input")) return;
      const isTypingKey = e.key.length === 1 || e.key === "Backspace" || e.key === "Enter";
      const isArrow = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key);

      if (!editing && selectedNoteRef.current && !e.metaKey && !e.ctrlKey && !e.altKey && (isTypingKey || isArrow)) {
        e.preventDefault();
        pendingKeys.current.push(e.key);
        setEditing(true);
        resetIdleTimer();
      } else if (editing && !document.activeElement?.classList.contains("content-textarea") && !e.metaKey && !e.ctrlKey && !e.altKey && (isTypingKey || isArrow)) {
        e.preventDefault();
        pendingKeys.current.push(e.key);
        resetIdleTimer();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editing]);

  return {
    cursorPos,
    resetIdleTimer,
    handleContentChange,
    textareaCallbackRef,
  };
}
