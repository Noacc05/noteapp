use note_lib::{Note, NoteGraph};

fn main() {
    let mut graph = NoteGraph::new();

    let note = Note::new(
        1,
        "Example Note",
        1_726_000_000,
        "notes/example.md",
        Vec::<u64>::new().into_boxed_slice(),
        Vec::<u32>::new().into_boxed_slice(),
        Vec::<u32>::new().into_boxed_slice(),
    );

    graph.insert(note);

    if let Ok(content) = graph.note_content(1) {
        println!("Note content for id=1:\n{}", content);
    } else {
        println!("Failed to load note content");
    }
}
