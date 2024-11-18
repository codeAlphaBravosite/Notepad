import { HistoryManager } from './history.js';

export class UIManager {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.currentNote = null;
    this.autoSaveTimeout = null;
    this.lastKnownScrollPosition = 0;
    this.lastActiveToggleId = null;
    this.lastCaretPosition = null;
    this.savedToggleStates = null;
    
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

    // Add keyboard shortcuts for undo/redo
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.handleRedo();
        } else {
          this.handleUndo();
        }
      }
    });

    window.addEventListener('storage', (e) => {
      if (e.key === 'notes') {
        this.renderNotesList();
      }
    });
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
  }

  closeEditor() {
    this.editor.classList.add('hidden');
    document.getElementById('notes-list-view').classList.remove('hidden');
    this.currentNote = null;
    this.history.clear();
    this.renderNotesList();
  }

  deleteCurrentNote() {
    if (!this.currentNote) {
      console.warn('Attempted to delete non-existent note');
      return;
    }
    
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        this.noteManager.deleteNote(this.currentNote.id);
        this.closeEditor();
      } catch (error) {
        console.error('Failed to delete note:', error);
        // Handle error appropriately
      }
    }
  }

  handleNoteChange(e) {
    if (!this.currentNote) return;
    
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    // Store the current state before making changes
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    
    if (e.target === this.noteTitle) {
      this.currentNote.title = e.target.value;
    }
    
    this.autoSaveTimeout = setTimeout(() => {
      // Only push to history if there are actual changes
      if (JSON.stringify(previousState) !== JSON.stringify(this.currentNote)) {
        this.history.push(previousState);
        this.noteManager.updateNote(this.currentNote);
      }
    }, 500);
  }

  handleUndo() {
    this.saveEditorState();
    
    const previousState = this.history.undo(this.currentNote);
    if (previousState) {
      this.currentNote = previousState;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor(true);
    }
  }

  handleRedo() {
    this.saveEditorState();
    
    const nextState = this.history.redo(this.currentNote);
    if (nextState) {
      this.currentNote = nextState;
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor(true);
    }
  }

  saveEditorState() {
    // Save all toggle states
    this.savedToggleStates = this.currentNote.toggles.map(toggle => {
      const textarea = document.querySelector(`textarea[data-toggle-id="${toggle.id}"]`);
      if (textarea) {
        return {
          id: toggle.id,
          scrollTop: textarea.scrollTop,
          scrollHeight: textarea.scrollHeight,
          selectionStart: textarea.selectionStart,
          selectionEnd: textarea.selectionEnd,
          isFocused: document.activeElement === textarea
        };
      }
      return null;
    }).filter(Boolean);

    // Save editor content scroll position
    const editorContent = document.querySelector('.editor-content');
    if (editorContent) {
      this.lastKnownScrollPosition = editorContent.scrollTop;
    }
  }

  restoreEditorState() {
    // First pass: restore scroll positions and selection
    requestAnimationFrame(() => {
      // Restore individual toggle states
      if (this.savedToggleStates) {
        this.savedToggleStates.forEach(state => {
          const textarea = document.querySelector(`textarea[data-toggle-id="${state.id}"]`);
          if (textarea) {
            // Restore scroll position
            textarea.scrollTop = state.scrollTop;

            // Restore selection
            if (state.isFocused) {
              textarea.focus();
              textarea.setSelectionRange(state.selectionStart, state.selectionEnd);
            }
          }
        });
      }

      // Restore editor content scroll
      const editorContent = document.querySelector('.editor-content');
      if (editorContent) {
        editorContent.scrollTop = this.lastKnownScrollPosition;
      }

      // Second pass: double-check scroll positions after a brief delay
      // This ensures proper restoration even after browser reflow
      setTimeout(() => {
        if (this.savedToggleStates) {
          this.savedToggleStates.forEach(state => {
            const textarea = document.querySelector(`textarea[data-toggle-id="${state.id}"]`);
            if (textarea && textarea.scrollTop !== state.scrollTop) {
              textarea.scrollTop = state.scrollTop;
            }
          });
        }
      }, 50);
    });
  }

  addNewToggle() {
    if (!this.currentNote) return;
    
    this.saveEditorState();
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    
    const newToggle = {
      id: Date.now(),
      title: `Section ${this.currentNote.toggles.length + 1}`,
      content: '',
      isOpen: true
    };
    
    this.currentNote.toggles.push(newToggle);
    this.history.push(previousState);
    this.noteManager.updateNote(this.currentNote);
    this.renderEditor(true);
  }

  updateToggleTitle(toggleId, newTitle) {
    if (!this.currentNote) return;
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.title = newTitle;
      this.history.push(previousState);
      this.noteManager.updateNote(this.currentNote);
    }
  }

  updateToggleContent(toggleId, newContent) {
    if (!this.currentNote) return;
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.content = newContent;
      this.history.push(previousState);
      this.noteManager.updateNote(this.currentNote);
    }
  }

  toggleSection(toggleId) {
    if (!this.currentNote) return;
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    if (toggle) {
      toggle.isOpen = !toggle.isOpen;
      this.history.push(previousState);
      this.noteManager.updateNote(this.currentNote);
      this.renderEditor(true);
    }
  }

  filterNotes() {
    const searchTerm = this.searchInput.value.toLowerCase();
    this.renderNotesList(searchTerm);
  }

  renderNotesList(searchTerm = '') {
    const filteredNotes = this.noteManager.getNotes(searchTerm);
    const fragment = document.createDocumentFragment();
    
    if (filteredNotes.length) {
      filteredNotes.forEach(note => {
        const noteElement = this.createNoteCardElement(note);
        fragment.appendChild(noteElement);
      });
    } else {
      const emptyState = document.createElement('p');
      emptyState.className = 'empty-state';
      emptyState.textContent = 'No notes found';
      fragment.appendChild(emptyState);
    }
    
    this.notesList.innerHTML = '';
    this.notesList.appendChild(fragment);

    // Attach event listeners
    document.querySelectorAll('.note-card').forEach(card => {
      card.addEventListener('click', () => {
        const noteId = parseInt(card.dataset.noteId);
        const note = this.noteManager.notes.find(n => n.id === noteId);
        if (note) this.openEditor(note);
      });
    });
  }

  createNoteCardElement(note) {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.dataset.noteId = note.id;

    const title = this.escapeHtml(note.title) || 'Untitled Note';
    const content = this.escapeHtml(note.toggles.map(t => t.content).join(' ').slice(0, 150)) || 'No content';
    const date = new Date(note.updated).toLocaleDateString();

    card.innerHTML = `
      <h2>${title}</h2>
      <p>${content}</p>
      <div class="note-meta">
        Last updated: ${date}
      </div>
    `;

    return card;
  }

  renderEditor(shouldRestoreState = false) {
    if (!this.currentNote) return;

    if (!shouldRestoreState) {
      this.saveEditorState();
    }

    this.noteTitle.value = this.escapeHtml(this.currentNote.title);
    
    const togglesHtml = this.currentNote.toggles.map(toggle => {
      const escapedTitle = this.escapeHtml(toggle.title);
      const escapedContent = this.escapeHtml(toggle.content);
      
      return `
        <div class="toggle-section">
          <div class="toggle-header" data-toggle-id="${toggle.id}">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
                 class="toggle-icon ${toggle.isOpen ? 'open' : ''}">
              <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round"/>
            </svg>
            <input type="text" class="toggle-title" value="${escapedTitle}"
                   data-toggle-id="${toggle.id}" />
          </div>
          <div class="toggle-content ${toggle.isOpen ? 'open' : ''}">
            <textarea
              data-toggle-id="${toggle.id}"
              placeholder="Start writing..."
              style="min-height: 100px; resize: vertical;"
            >${escapedContent}</textarea>
          </div>
        </div>
      `;
    }).join('');

    this.togglesContainer.innerHTML = togglesHtml;
    this.attachToggleEventListeners();

    if (shouldRestoreState) {
      this.restoreEditorState();
    }
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
      // Auto-resize textarea as content changes
      const autoResize = () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      };

      textarea.addEventListener('input', (e) => {
        autoResize();
        this.updateToggleContent(parseInt(e.target.dataset.toggleId), e.target.value);
      });

      // Initial resize
      autoResize();

      // Handle focus events to save last active state
      textarea.addEventListener('focus', () => {
        this.lastActiveToggleId = parseInt(textarea.dataset.toggleId);
      });
    });
  }

  escapeHtml(unsafe) {
    if (!unsafe) return '';
    const div = document.createElement('div');
    div.textContent = unsafe;
    return div.innerHTML;
  }
    }
