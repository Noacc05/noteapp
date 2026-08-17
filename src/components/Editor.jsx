import Markdown from "react-markdown";

export function Editor({ title, content, editing, onTitleChange, onContentChange, textareaCallbackRef, onClickPreview }) {
  return (
    <div className="editor-area">
      <input
        className="title-input"
        type="text"
        value={title}
        onChange={onTitleChange}
        placeholder="Note title"
      />
      <div className="editor-container">
        {editing ? (
          <textarea
            ref={textareaCallbackRef}
            className="content-textarea"
            value={content}
            onChange={onContentChange}
            placeholder="Write markdown here..."
          />
        ) : (
          <div className="preview-rendered" onClick={onClickPreview}>
            {content ? <Markdown>{content}</Markdown> : <p className="placeholder">Click to start writing...</p>}
          </div>
        )}
      </div>
    </div>
  );
}
