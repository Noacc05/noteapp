use std::path::{Path, PathBuf};

pub type NoteId = u64;
pub type TagId = u32;
pub type CategoryId = u32;

#[derive(Debug, Clone)]
pub struct Note {
    id: NoteId,
    title: Box<str>,
    published: i64,
    content_path: PathBuf,
    connections: Box<[NoteId]>,
    tags: Box<[TagId]>,
    categories: Box<[CategoryId]>,
}

impl Note {
    pub fn new(
        id: NoteId,
        title: impl Into<Box<str>>,
        published: i64,
        content_path: impl Into<PathBuf>,
        connections: impl Into<Box<[NoteId]>>,
        tags: impl Into<Box<[TagId]>>,
        categories: impl Into<Box<[CategoryId]>>,
    ) -> Self {
        Self {
            id,
            title: title.into(),
            published,
            content_path: content_path.into(),
            connections: connections.into(),
            tags: tags.into(),
            categories: categories.into(),
        }
    }

    pub fn id(&self) -> NoteId {
        self.id
    }

    pub fn title(&self) -> &str {
        &self.title
    }

    pub fn published(&self) -> i64 {
        self.published
    }

    pub fn content_path(&self) -> &Path {
        &self.content_path
    }

    pub fn connections(&self) -> &[NoteId] {
        &self.connections
    }

    pub fn tags(&self) -> &[TagId] {
        &self.tags
    }

    pub fn categories(&self) -> &[CategoryId] {
        &self.categories
    }

    pub fn set_title(&mut self, title: impl Into<Box<str>>) {
        self.title = title.into();
    }

    pub fn set_published(&mut self, published: i64) {
        self.published = published;
    }

    pub fn set_content_path(&mut self, path: impl Into<PathBuf>) {
        self.content_path = path.into();
    }

    pub fn set_connections(&mut self, connections: impl Into<Box<[NoteId]>>) {
        self.connections = connections.into();
    }

    pub fn set_tags(&mut self, tags: impl Into<Box<[TagId]>>) {
        self.tags = tags.into();
    }

    pub fn set_categories(&mut self, categories: impl Into<Box<[CategoryId]>>) {
        self.categories = categories.into();
    }
}
