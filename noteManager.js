import { StorageManager } from './storage.js';

export class NoteManager {
  constructor() {
    this.notes = StorageManager.load('notes', []);
    this.validateNotes();
  }

  validateNotes() {
    this.notes = this.notes.filter(note => {
      return note && 
             typeof note === 'object' && 
             typeof note.id === 'number' &&
             Array.isArray(note.toggles);
    });
    
    this.notes.forEach(note => {
      note.toggles = note.toggles.filter(toggle => 
        toggle && 
        typeof toggle === 'object' &&
        typeof toggle.id === 'number' &&
        typeof toggle.title === 'string'
      );
    });
    
    this.saveNotes();
  }

  createNote() {
    const initialToggles = Array.from({ length: 3 }, (_, i) => ({
      id: Date.now() + i,
      title: `Section ${i + 1}`,
      content: '',
      isOpen: i === 0
    }));

    const note = {
      id: Date.now(),
      title: '',
      toggles: initialToggles,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    this.notes.unshift(note);
    this.saveNotes();
    return note;
  }

  updateNote(note) {
    if (!note || typeof note !== 'object') return;
    
    note.updated = new Date().toISOString();
    const index = this.notes.findIndex(n => n.id === note.id);
    if (index !== -1) {
      this.notes[index] = JSON.parse(JSON.stringify(note));
      this.saveNotes();
    }
  }

  deleteNote(noteId) {
    if (!noteId || typeof noteId !== 'number') return;
    
    this.notes = this.notes.filter(note => note.id !== noteId);
    this.saveNotes();
  }

  getNotes(searchTerm = '') {
    const term = searchTerm.toLowerCase().trim();
    
    return this.notes.filter(note => {
      if (!note || typeof note !== 'object') return false;
      
      const titleMatch = (note.title || '').toLowerCase().includes(term);
      const contentMatch = note.toggles.some(toggle => 
        (toggle.title || '').toLowerCase().includes(term) ||
        (toggle.content || '').toLowerCase().includes(term)
      );
      return titleMatch || contentMatch;
    });
  }

  saveNotes() {
    StorageManager.save('notes', this.notes);
  }
}