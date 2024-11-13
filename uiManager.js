import { HistoryManager } from './history.js';

export class UIManager {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.currentNote = null;
    this.autoSaveTimeout = null;
    
    this.history = new HistoryManager(({ canUndo, canRedo }) => {
      this.undoButton.disabled = !canUndo;
      this.redoButton.disabled = !canRedo;
    });

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
    this.editorContent = document.querySelector('.editor-content');
  }

  attachEventListeners() {
    document.getElementById('new-note').addEventListener('click', () => this.createNewNote());
    document.getElementById('back-button').addEventListener('click', () => this.closeEditor());
    document.getElementById('delete-button').addEventListener('click', () => this.deleteCurrentNote());
    document.getElementById('add-toggle').addEventListener('click', () => this.addNewToggle());
    this.undoButton.addEventListener('click', () => this.handleUndo());
    this.redoButton.addEventListener('click', () => this.handleRedo());
    this.searchInput.addEventListener('input', () => this.filterNotes());
    this.noteTitle.addEventListener('input', (e) => this.handleNoteChange(e));

    window.visualViewport?.addEventListener('resize', () => this.handleViewportResize());
    window.visualViewport?.addEventListener('scroll', () => this.handleViewportScroll());

    window.addEventListener('storage', (e) => {
      if (e.key === 'notes') {
        this.renderNotesList();
      }
    });
  }

  handleViewportResize() {
    if (!window.visualViewport) return;
    
    const viewport = window.visualViewport;
    if (this.editorContent) {
      this.editorContent.style.height = `${viewport.height - this.editorContent.offsetTop}px`;
      document.body.classList.toggle('keyboard-visible', window.innerHeight - viewport.height > 150);
    }
  }

  handleViewportScroll() {
    if (document.activeElement?.tagName === 'TEXTAREA') {
      const textarea = document.activeElement;
      const rect = textarea.getBoundingClientRect();
      const viewport = window.visualViewport;
      
      if (viewport && rect.bottom > viewport.height) {
        textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }

  initialize() {
    this.renderNotesList();
  }

  createNewNote() {
    const note = this.noteManager.createNote();
    this.openEditor(note);
  }

  openEditor(note) {
    this.currentNote = JSON.parse(JSON.stringify(note));
    this.editor.classList.remove('hidden');
    document.getElementById('notes-list-view').classList.add('hidden');
    this.history.clear();
    this.renderEditor();
    
    // Reset viewport adjustments
    document.body.classList.remove('keyboard-visible');
    if (this.editorContent) {
      this.editorContent.style.height = '';
    }
  }

  closeEditor() {
    this.editor.classList.add('hidden');
    document.getElementById('notes-list-view').classList.remove('hidden');
    this.currentNote = null;
    this.history.clear();
    document.body.classList.remove('keyboard-visible');
    this.renderNotesList();
  }

  deleteCurrentNote() {
    if (!this.currentNote) return;
    
    if (confirm('Are you sure you want to delete this note?')) {
      this.noteManager.deleteNote(this.currentNote.id);
      this.closeEditor();
    }
  }

  handleNoteChange(e) {
    if (!this.currentNote) return;
    
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    if (e.target === this.noteTitle) {
      this.currentNote.title = e.target.value;
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      this.history.push(this.currentNote);
      this.noteManager.updateNote(this.currentNote);
    }, 500);
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

    // Focus the new toggle's textarea after rendering
    requestAnimationFrame(() => {
      const newTextarea = document.querySelector(`textarea[data-toggle-id="${newToggle.id}"]`);
      if (newTextarea) {
        newTextarea.focus();
      }
    });
  }

  updateToggleTitle(toggleId, newTitle) {
    if (!this.currentNote) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.title = newTitle;
      this.handleNoteChange({ target: toggle });
    }
  }

  updateToggleContent(toggleId, newContent) {
    if (!this.currentNote) return;
    
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.content = newContent;
      this.handleNoteChange({ target: toggle });
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
    const searchTerm = this.searchInput.value.toLowerCase();
    this.renderNotesList(searchTerm);
  }

  renderNotesList(searchTerm = '') {
    const filteredNotes = this.noteManager.getNotes(searchTerm);
    
    this.notesList.innerHTML = filteredNotes.length ? filteredNotes.map(note => `
      <div class="note-card" data-note-id="${note.id}">
        <h2>${note.title || 'Untitled Note'}</h2>
        <p>${note.toggles.map(t => t.content).join(' ').slice(0, 150) || 'No content'}</p>
        <div class="note-meta">
          Last updated: ${new Date(note.updated).toLocaleDateString()}
        </div>
      </div>
    `).join('') : '<p class="empty-state">No notes found</p>';

    document.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const noteId = parseInt(card.dataset.noteId);
        const note = this.noteManager.notes.find(n => n.id === noteId);
        if (note) this.openEditor(note);
      });
    });
  }

  renderEditor() {
    if (!this.currentNote) return;

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
            rows="1"
          >${toggle.content}</textarea>
        </div>
      </div>
    `).join('');

    this.attachToggleEventListeners();
  }

  attachToggleEventListeners() {
    document.querySelectorAll('.toggle-header').forEach(header => {
      header.addEventListener('click', (e) => {
        if (!e.target.classList.contains('toggle-title')) {
          this.toggleSection(parseInt(header.dataset.toggleId));
        }
      });
    });

    document.querySelectorAll('.toggle-title').forEach(input => {
      input.addEventListener('input', (e) => {
        this.updateToggleTitle(parseInt(e.target.dataset.toggleId), e.target.value);
      });
      input.addEventListener('click', (e) => e.stopPropagation());
    });

    document.querySelectorAll('textarea').forEach(textarea => {
      this.autoResizeTextarea(textarea);

      textarea.addEventListener('input', (e) => {
        this.updateToggleContent(parseInt(e.target.dataset.toggleId), e.target.value);
        this.autoResizeTextarea(textarea);
      });

      textarea.addEventListener('focus', () => {
        const toggle = textarea.closest('.toggle-section');
        if (toggle) {
          toggle.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      });

      textarea.addEventListener('blur', () => {
        window.scrollTo(0, window.scrollY);
      });
    });
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    const newHeight = Math.max(100, textarea.scrollHeight);
    textarea.style.height = `${newHeight}px`;
    
    requestAnimationFrame(() => {
      if (document.activeElement === textarea) {
        const rect = textarea.getBoundingClientRect();
        const viewportHeight = window.visualViewport?.height || window.innerHeight;
        const keyboardHeight = window.innerHeight - viewportHeight;
        
        if (rect.bottom > viewportHeight - keyboardHeight) {
          textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    });
  }
}