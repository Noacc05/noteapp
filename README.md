# NoteApp

A graph-based note-taking app built with Tauri 2 (Rust backend) and React (Vite frontend).

## Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://rustup.rs/) (stable toolchain)
- Tauri system dependencies:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Linux**: see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/#linux)
  - **Windows**: see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/#windows)

## Install

```bash
# Install JS dependencies
npm install

# Rust deps are fetched automatically on first build
```

## Development

```bash
npm run tauri dev
```

This starts the Vite dev server on `:1420` and launches the Tauri window with hot-reload.

## Production Build

```bash
npm run tauri build
```

Output binary is in `src-tauri/target/release/`.

## Project Structure

```
noteapp/
├── src/                  # React frontend
│   ├── App.jsx
│   ├── App.css
│   └── main.jsx
├── src-tauri/            # Rust backend
│   ├── src/
│   │   ├── main.rs      # Entry point
│   │   ├── lib.rs       # Tauri builder + commands
│   │   ├── note.rs      # Note data model
│   │   └── graph.rs     # Note graph (in-memory store)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
└── vite.config.js
```

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 7 |
| Backend | Rust, Tauri 2 |
| IPC | Tauri command system (`@tauri-apps/api/core`) |
