class NotesApp {
  constructor() {
    this.notes = JSON.parse(localStorage.getItem('notes')) || [];
    this.currentNote = null;
    this.saveTimeout = null;
    this.undoStack = [];
    this.redoStack = [];
    
    // DOM elements
    this.notesListView = document.getElementById('notes-list-view');
    this.notesList = document.getElementById('notes-list');
    this.editor = document.getElementById('editor');
    this.titleInput = document.getElementById('note-title');
    this.editorContent = document.getElementById('editor-content');
    this.searchInput = document.getElementById('search');
    this.togglesList = document.getElementById('toggles-list');
    this.undoButton = document.getElementById('undo-button');
    this.redoButton = document.getElementById('redo-button');
    
    this.init();
  }
  
  init() {
    // Bind event listeners
    document.getElementById('new-note').addEventListener('click', () => this.createNote());
    document.getElementById('back-button').addEventListener('click', () => this.showNotesList());
    document.getElementById('delete-button').addEventListener('click', () => this.deleteCurrentNote());
    document.getElementById('add-toggle').addEventListener('click', () => this.addNewToggle());
    this.searchInput.addEventListener('input', () => this.handleSearch());
    this.undoButton.addEventListener('click', () => this.undo());
    this.redoButton.addEventListener('click', () => this.redo());
    
    // Setup keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (this.currentNote && (e.ctrlKey || e.metaKey)) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
        }
      }
    });
    
    // Initial render
    this.renderNotesList();
  }
  
  saveState() {
    if (this.currentNote) {
      const state = {
        title: this.currentNote.title,
        toggles: JSON.parse(JSON.stringify(this.currentNote.toggles))
      };
      this.undoStack.push(state);
      this.redoStack = [];
      this.updateUndoRedoButtons();
    }
  }
  
  updateUndoRedoButtons() {
    this.undoButton.disabled = this.undoStack.length <= 1;
    this.redoButton.disabled = this.redoStack.length === 0;
  }
  
  undo() {
    if (this.undoStack.length > 1) {
      const currentState = this.undoStack.pop();
      this.redoStack.push(currentState);
      const previousState = this.undoStack[this.undoStack.length - 1];
      
      this.currentNote.title = previousState.title;
      this.currentNote.toggles = JSON.parse(JSON.stringify(previousState.toggles));
      
      this.titleInput.value = this.currentNote.title;
      this.renderToggles();
      this.saveNotes();
      this.updateUndoRedoButtons();
    }
  }
  
  redo() {
    if (this.redoStack.length > 0) {
      const nextState = this.redoStack.pop();
      this.undoStack.push(nextState);
      
      this.currentNote.title = nextState.title;
      this.currentNote.toggles = JSON.parse(JSON.stringify(nextState.toggles));
      
      this.titleInput.value = this.currentNote.title;
      this.renderToggles();
      this.saveNotes();
      this.updateUndoRedoButtons();
    }
  }
  
  createNote() {
    const note = {
      id: Date.now(),
      title: '',
      toggles: [
        { id: '1', title: 'Toggle 1', content: '', isOpen: false },
        { id: '2', title: 'Toggle 2', content: '', isOpen: false },
        { id: '3', title: 'Toggle 3', content: '', isOpen: false },
        { id: '4', title: 'Toggle 4', content: '', isOpen: false },
        { id: '5', title: 'Toggle 5', content: '', isOpen: false }
      ],
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    
    this.notes.unshift(note);
    this.saveNotes();
    this.showNote(note);
  }
  
  showNote(note) {
    this.currentNote = note;
    this.titleInput.value = note.title;
    this.editor.classList.remove('hidden');
    this.notesListView.classList.add('hidden');
    
    // Reset undo/redo stacks
    this.undoStack = [{
      title: note.title,
      toggles: JSON.parse(JSON.stringify(note.toggles))
    }];
    this.redoStack = [];
    this.updateUndoRedoButtons();
    
    this.renderToggles();
    
    // Setup title input handler
    this.titleInput.oninput = () => {
      this.saveState();
      this.currentNote.title = this.titleInput.value;
      this.saveNotes();
    };
  }
  
  createToggleElement(toggle) {
    const toggleDiv = document.createElement('div');
    toggleDiv.className = 'toggle';
    toggleDiv.id = `toggle-${toggle.id}`;
    if (toggle.isOpen) toggleDiv.classList.add('open');
    
    toggleDiv.innerHTML = `
      <div class="toggle-header">
        <svg class="toggle-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <input type="text" class="toggle-title" value="${toggle.title}" placeholder="Toggle title...">
      </div>
      <div class="toggle-content">
        <textarea class="toggle-textarea" placeholder="Write your content here...">${toggle.content}</textarea>
      </div>
    `;
    
    const header = toggleDiv.querySelector('.toggle-header');
    const titleInput = toggleDiv.querySelector('.toggle-title');
    const contentTextarea = toggleDiv.querySelector('.toggle-textarea');
    
    header.addEventListener('click', (e) => {
      if (e.target !== titleInput) {
        this.toggleOpen(toggle.id);
      }
    });
    
    titleInput.addEventListener('input', (e) => {
      this.saveState();
      this.updateToggleTitle(toggle.id, e.target.value);
    });
    
    contentTextarea.addEventListener('input', (e) => {
      this.saveState();
      this.updateToggleContent(toggle.id, e.target.value);
    });
    
    return toggleDiv;
  }
  
  renderToggles() {
    this.togglesList.innerHTML = '';
    this.currentNote.toggles.forEach(toggle => {
      this.togglesList.appendChild(this.createToggleElement(toggle));
    });
  }
  
  toggleOpen(id) {
    this.currentNote.toggles = this.currentNote.toggles.map(toggle =>
      toggle.id === id ? { ...toggle, isOpen: !toggle.isOpen } : toggle
    );
    this.renderToggles();
    this.saveNotes();
  }
  
  updateToggleTitle(id, newTitle) {
    this.currentNote.toggles = this.currentNote.toggles.map(toggle =>
      toggle.id === id ? { ...toggle, title: newTitle } : toggle
    );
    this.saveNotes();
  }
  
  updateToggleContent(id, newContent) {
    this.currentNote.toggles = this.currentNote.toggles.map(toggle =>
      toggle.id === id ? { ...toggle, content: newContent } : toggle
    );
    this.saveNotes();
  }
  
  addNewToggle() {
    this.saveState();
    const newId = String(this.currentNote.toggles.length + 1);
    this.currentNote.toggles.push({
      id: newId,
      title: `Toggle ${newId}`,
      content: '',
      isOpen: false
    });
    this.renderToggles();
    this.saveNotes();
  }
  
  showNotesList() {
    this.editor.classList.add('hidden');
    this.notesListView.classList.remove('hidden');
    this.currentNote = null;
    this.renderNotesList();
  }
  
  deleteCurrentNote() {
    if (!this.currentNote) return;
    
    if (confirm('Are you sure you want to delete this note?')) {
      this.notes = this.notes.filter(note => note.id !== this.currentNote.id);
      this.saveNotes();
      this.showNotesList();
    }
  }
  
  handleSearch() {
    const searchTerm = this.searchInput.value.toLowerCase();
    this.renderNotesList(searchTerm);
  }
  
  renderNotesList(searchTerm = '') {
    const filteredNotes = this.notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm) ||
      note.toggles.some(toggle => 
        toggle.title.toLowerCase().includes(searchTerm) ||
        toggle.content.toLowerCase().includes(searchTerm)
      )
    );
    
    this.notesList.innerHTML = filteredNotes.length ? 
      filteredNotes.map(note => this.createNoteCard(note)).join('') :
      '<div class="note-card"><p>No notes found</p></div>';
    
    document.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const note = this.notes.find(n => n.id === parseInt(card.dataset.id));
        if (note) this.showNote(note);
      });
    });
  }
  
  createNoteCard(note) {
    const date = new Date(note.updated).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    return `
      <div class="note-card" data-id="${note.id}">
        <h2>${note.title || 'Untitled'}</h2>
        <p>${note.toggles[0]?.content || 'No content'}</p>
        <div class="note-meta">Last updated: ${date}</div>
      </div>
    `;
  }
  
  saveNotes() {
    this.currentNote.updated = new Date().toISOString();
    localStorage.setItem('notes', JSON.stringify(this.notes));
  }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new NotesApp();
});