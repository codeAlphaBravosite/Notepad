import { HistoryManager } from './history.js';

const AUTOSAVE_DELAY = 500;
const DEBOUNCE_DELAY = 16;

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export class UIManager {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.currentNote = null;
    this.autoSaveTimeout = null;
    this.isComposing = false;
    this.preventScroll = false;
    
    this.history = new HistoryManager(this.updateHistoryButtons.bind(this));
    this.debouncedUpdateToggleContent = debounce(this.updateToggleContent.bind(this), DEBOUNCE_DELAY);
    this.debouncedAutoResize = debounce(this.autoResizeTextarea.bind(this), DEBOUNCE_DELAY);
    this.debouncedSaveNote = debounce(this.saveNote.bind(this), AUTOSAVE_DELAY);

    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.notesList = document.getElementById('notes-list');
    this.editor = document.getElementById('editor');
    this.searchInput = document.getElementById('search');
    this.noteTitle = document.getElementById('note-title');
    this.togglesContainer = document.getElementById('toggles-container');
    this.undoButton = document.getElementById('undo-button');
    this.redoButton = document.getElementById('redo-button');
  }

  attachEventListeners() {
    const newNoteBtn = document.getElementById('new-note');
    const backBtn = document.getElementById('back-button');
    const deleteBtn = document.getElementById('delete-button');
    const addToggleBtn = document.getElementById('add-toggle');

    newNoteBtn?.addEventListener('click', this.createNewNote.bind(this));
    backBtn?.addEventListener('click', this.closeEditor.bind(this));
    deleteBtn?.addEventListener('click', this.deleteCurrentNote.bind(this));
    addToggleBtn?.addEventListener('click', this.addNewToggle.bind(this));
    
    this.undoButton?.addEventListener('click', this.handleUndo.bind(this));
    this.redoButton?.addEventListener('click', this.handleRedo.bind(this));
    this.searchInput?.addEventListener('input', this.filterNotes.bind(this));
    this.noteTitle?.addEventListener('input', this.handleNoteChange.bind(this));

    // Add scroll lock for title input
    this.noteTitle?.addEventListener('focus', () => {
      this.preventScroll = true;
      requestAnimationFrame(() => {
        this.preventScroll = false;
      });
    });

    window.addEventListener('storage', this.handleStorageChange.bind(this));
    window.addEventListener('beforeunload', this.cleanup.bind(this));
  }

  cleanup() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.saveNote();
  }

  handleStorageChange(e) {
    if (e.key === 'notes') {
      this.renderNotesList();
    }
  }

  updateHistoryButtons({ canUndo, canRedo }) {
    if (this.undoButton) this.undoButton.disabled = !canUndo;
    if (this.redoButton) this.redoButton.disabled = !canRedo;
  }

  updateViewport() {
    const viewport = document.querySelector('meta[name=viewport]');
    if (viewport) {
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
    } else {
      const meta = document.createElement('meta');
      meta.name = 'viewport';
      meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0';
      document.head.appendChild(meta);
    }
  }

  initialize() {
    this.updateViewport();
    this.renderNotesList();
  }

  createNewNote() {
    const note = this.noteManager.createNote();
    this.openEditor(note);
  }

  openEditor(note) {
    if (!note) return;
    
    this.currentNote = JSON.parse(JSON.stringify(note));
    this.editor?.classList.remove('hidden');
    document.getElementById('notes-list-view')?.classList.add('hidden');
    this.history.clear();
    this.renderEditor();
  }

  closeEditor() {
    this.saveNote();
    this.editor?.classList.add('hidden');
    document.getElementById('notes-list-view')?.classList.remove('hidden');
    this.currentNote = null;
    this.history.clear();
    this.renderNotesList();
  }

  deleteCurrentNote() {
    if (!this.currentNote) return;
    
    if (window.confirm('Are you sure you want to delete this note?')) {
      this.noteManager.deleteNote(this.currentNote.id);
      this.closeEditor();
    }
  }

  saveNote() {
    if (!this.currentNote) return;
    
    this.history.push(this.currentNote);
    this.noteManager.updateNote(this.currentNote);
  }

  handleNoteChange(e) {
    if (!this.currentNote || this.isComposing) return;
    
    const scrollTop = window.pageYOffset;
    
    if (e.target === this.noteTitle) {
      this.currentNote.title = e.target.value.trim();
    }
    
    this.debouncedSaveNote();
    
    if (this.preventScroll) {
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollTop);
      });
    }
  }

  handleUndo() {
    const previousState = this.history.undo(this.currentNote);
    if (previousState) {
      this.currentNote = previousState;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor();
    }
  }

  handleRedo() {
    const nextState = this.history.redo(this.currentNote);
    if (nextState) {
      this.currentNote = nextState;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor();
    }
  }

  addNewToggle() {
    if (!this.currentNote) return;
    
    const newToggle = {
      id: Date.now(),
      title: `Section ${this.currentNote.toggles.length + 1}`,
      content: '',
      isOpen: true
    };
    
    this.history.push(this.currentNote);
    this.currentNote.toggles.push(newToggle);
    this.noteManager.updateNote(this.currentNote);
    this.renderEditor();
  }

  updateToggleTitle(toggleId, newTitle) {
    if (!this.currentNote || this.isComposing) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.title = newTitle.trim();
      this.debouncedSaveNote();
    }
  }

  updateToggleContent(toggleId, newContent) {
    if (!this.currentNote || this.isComposing) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.content = newContent;
      this.debouncedSaveNote();
    }
  }

  toggleSection(toggleId) {
    if (!this.currentNote) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.isOpen = !toggle.isOpen;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor();
    }
  }

  filterNotes() {
    if (!this.searchInput) return;
    const searchTerm = this.searchInput.value.toLowerCase().trim();
    this.renderNotesList(searchTerm);
  }

  renderNotesList(searchTerm = '') {
    if (!this.notesList) return;

    const filteredNotes = this.noteManager.getNotes(searchTerm);
    
    const notesHTML = filteredNotes.length ? filteredNotes.map(note => `
      <div class="note-card" data-note-id="${note.id}">
        <h2>${note.title || 'Untitled Note'}</h2>
        <p>${note.toggles.map(t => t.content).join(' ').slice(0, 150) || 'No content'}</p>
        <div class="note-meta">
          Last updated: ${new Date(note.updated).toLocaleDateString()}
        </div>
      </div>
    `).join('') : '<p class="empty-state">No notes found</p>';

    this.notesList.innerHTML = notesHTML;

    document.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const noteId = parseInt(card.dataset.noteId, 10);
        const note = this.noteManager.notes.find(n => n.id === noteId);
        if (note) this.openEditor(note);
      });
    });
  }

  renderEditor() {
    if (!this.currentNote || !this.noteTitle || !this.togglesContainer) return;

    this.noteTitle.value = this.currentNote.title;
    
    this.togglesContainer.innerHTML = this.currentNote.toggles.map(toggle => `
      <div class="toggle-section">
        <div class="toggle-header" data-toggle-id="${toggle.id}">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
               class="toggle-icon ${toggle.isOpen ? 'open' : ''}">
            <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <input type="text" class="toggle-title" value="${toggle.title}"
                 data-toggle-id="${toggle.id}" />
        </div>
        <div class="toggle-content ${toggle.isOpen ? 'open' : ''}">
          <textarea
            data-toggle-id="${toggle.id}"
            placeholder="Start writing..."
            class="content-textarea"
          >${toggle.content}</textarea>
        </div>
      </div>
    `).join('');

    this.attachToggleEventListeners();
  }

  attachToggleEventListeners() {
    document.querySelectorAll('.toggle-header').forEach(header => {
      const toggleId = parseInt(header.dataset.toggleId, 10);
      
      header.addEventListener('click', (e) => {
        if (!e.target.classList.contains('toggle-title')) {
          this.toggleSection(toggleId);
        }
      });
    });

    document.querySelectorAll('.toggle-title').forEach(input => {
      const toggleId = parseInt(input.dataset.toggleId, 10);
      
      input.addEventListener('compositionstart', () => {
        this.isComposing = true;
        this.preventScroll = true;
      });
      
      input.addEventListener('compositionend', () => {
        this.isComposing = false;
        this.preventScroll = false;
        this.updateToggleTitle(toggleId, input.value);
      });
      
      input.addEventListener('input', (e) => {
        if (!this.isComposing) {
          const scrollTop = window.pageYOffset;
          this.updateToggleTitle(toggleId, e.target.value);
          if (this.preventScroll) {
            requestAnimationFrame(() => {
              window.scrollTo(0, scrollTop);
            });
          }
        }
      });
      
      input.addEventListener('focus', () => {
        this.preventScroll = true;
        requestAnimationFrame(() => {
          this.preventScroll = false;
        });
      });
      
      input.addEventListener('blur', () => {
        this.preventScroll = false;
      });
      
      input.addEventListener('click', (e) => e.stopPropagation());
    });

    document.querySelectorAll('.content-textarea').forEach(textarea => {
      const toggleId = parseInt(textarea.dataset.toggleId, 10);
      
      textarea.addEventListener('compositionstart', () => {
        this.isComposing = true;
        this.preventScroll = true;
      });
      
      textarea.addEventListener('compositionend', () => {
        this.isComposing = false;
        this.preventScroll = false;
        this.debouncedUpdateToggleContent(toggleId, textarea.value);
      });
      
      textarea.addEventListener('input', (e) => {
        if (!this.isComposing) {
          e.preventDefault();
          const scrollTop = window.pageYOffset;
          this.debouncedUpdateToggleContent(toggleId, e.target.value);
          this.debouncedAutoResize(textarea);
          
          if (this.preventScroll) {
            requestAnimationFrame(() => {
              window.scrollTo(0, scrollTop);
            });
          }
        }
      }, { passive: true });
      
      textarea.addEventListener('touchstart', () => {
        this.preventScroll = true;
      }, { passive: true });
      
      textarea.addEventListener('touchend', (e) => {
        e.preventDefault();
        textarea.focus();
        requestAnimationFrame(() => {
          this.preventScroll = false;
        });
      }, { passive: false });
      
      textarea.addEventListener('focus', () => {
        this.preventScroll = true;
        requestAnimationFrame(() => {
          this.preventScroll = false;
        });
      });
      
      textarea.addEventListener('blur', () => {
        this.preventScroll = false;
      });
      
      this.autoResizeTextarea(textarea);
    });
  }

  autoResizeTextarea(textarea) {
    if (!textarea) return;
    
    const scrollTop = window.pageYOffset;
    
    requestAnimationFrame(() => {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
      
      if (this.preventScroll) {
        window.scrollTo(0, scrollTop);
      }
    });
  }
}
