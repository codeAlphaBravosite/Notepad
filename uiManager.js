import { HistoryManager } from './history.js';
import { DialogManager } from './dialog.js';
import { StorageManager } from './storage.js';

const dialog = new DialogManager();

export class UIManager {
  constructor(noteManager) {
    this.noteManager = noteManager;
    this.currentNote = null;
    this.autoSaveTimeout = null;
    this.lastKnownScrollPosition = 0;
    this.lastActiveToggleId = null;
    this.lastCaretPosition = null;
    this.savedToggleStates = null;
    this.editorStateKey = 'editor-states';
    
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
    this.loadEditorStateFromStorage();
  }

  closeEditor() {
    this.saveEditorStateToStorage();
    this.editor.classList.add('hidden');
    document.getElementById('notes-list-view').classList.remove('hidden');
    this.currentNote = null;
    this.history.clear();
    this.renderNotesList();
  }

  saveEditorStateToStorage() {
    if (!this.currentNote) return;
    
    const states = StorageManager.load(this.editorStateKey, {});
    
    const toggleStates = this.currentNote.toggles.map(toggle => {
        const textarea = document.querySelector(`textarea[data-toggle-id="${toggle.id}"]`);
        if (textarea) {
            return {
                id: toggle.id,
                scrollTop: textarea.scrollTop,
                scrollHeight: textarea.scrollHeight,
                selectionStart: textarea.selectionStart,
                selectionEnd: textarea.selectionEnd
            };
        }
        return null;
    }).filter(Boolean);

    const editorContent = document.querySelector('.editor-content');
    const editorScrollTop = editorContent ? editorContent.scrollTop : 0;

    states[this.currentNote.id] = {
        toggleStates,
        editorScrollTop,
        lastActiveToggleId: this.lastActiveToggleId,
        timestamp: Date.now()
    };

    StorageManager.save(this.editorStateKey, states);
  }

  loadEditorStateFromStorage() {
    if (!this.currentNote) return;
    
    const states = StorageManager.load(this.editorStateKey, {});
    const savedState = states[this.currentNote.id];
    
    if (!savedState) return;

    requestAnimationFrame(() => {
        if (savedState.toggleStates) {
            savedState.toggleStates.forEach(state => {
                const textarea = document.querySelector(`textarea[data-toggle-id="${state.id}"]`);
                if (textarea) {
                    textarea.scrollTop = state.scrollTop;
                    textarea.setSelectionRange(state.selectionStart, state.selectionEnd);
                }
            });
        }

        const editorContent = document.querySelector('.editor-content');
        if (editorContent && savedState.editorScrollTop) {
            editorContent.scrollTop = savedState.editorScrollTop;
        }

        if (savedState.lastActiveToggleId) {
            const textarea = document.querySelector(`textarea[data-toggle-id="${savedState.lastActiveToggleId}"]`);
            if (textarea) {
                textarea.focus();
            }
        }

        setTimeout(() => {
            if (savedState.toggleStates) {
                savedState.toggleStates.forEach(state => {
                    const textarea = document.querySelector(`textarea[data-toggle-id="${state.id}"]`);
                    if (textarea && textarea.scrollTop !== state.scrollTop) {
                        textarea.scrollTop = state.scrollTop;
                    }
                });
            }
        }, 50);
    });
  }

  async deleteCurrentNote() {
    if (!this.currentNote) {
        console.warn('Attempted to delete non-existent note');
        return;
    }

    const confirmed = await dialog.confirm({
        title: 'Delete Note',
        message: 'Are you sure?',
        confirmText: 'Delete',
        cancelText: 'Cancel'
    });

    if (confirmed) {
        try {
            this.noteManager.deleteNote(this.currentNote.id);
            this.closeEditor();
        } catch (error) {
            console.error('Failed to delete note:', error);
        }
    }
  }

  handleNoteChange(e) {
    if (!this.currentNote) return;
    
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    
    if (e.target === this.noteTitle) {
      this.currentNote.title = e.target.value;
    }
    
    this.autoSaveTimeout = setTimeout(() => {
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

    const editorContent = document.querySelector('.editor-content');
    if (editorContent) {
      this.lastKnownScrollPosition = editorContent.scrollTop;
    }
  }

  restoreEditorState() {
    requestAnimationFrame(() => {
      if (this.savedToggleStates) {
        this.savedToggleStates.forEach(state => {
          const textarea = document.querySelector(`textarea[data-toggle-id="${state.id}"]`);
          if (textarea) {
            textarea.scrollTop = state.scrollTop;

            if (state.isFocused) {
              textarea.focus();
              textarea.setSelectionRange(state.selectionStart, state.selectionEnd);
            }
          }
        });
      }

      const editorContent = document.querySelector('.editor-content');
      if (editorContent) {
        editorContent.scrollTop = this.lastKnownScrollPosition;
      }

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
    
    // Store the main editor content scroll position
    const editorContent = document.querySelector('.editor-content');
    const editorScrollTop = editorContent ? editorContent.scrollTop : 0;
    
    // Store scroll positions and selection states of all textareas before toggling
    const scrollPositions = new Map();
    this.currentNote.toggles.forEach(toggle => {
        const textarea = document.querySelector(`textarea[data-toggle-id="${toggle.id}"]`);
        if (textarea) {
            scrollPositions.set(toggle.id, {
                scrollTop: textarea.scrollTop,
                scrollHeight: textarea.scrollHeight,
                selectionStart: textarea.selectionStart,
                selectionEnd: textarea.selectionEnd,
                isFocused: document.activeElement === textarea
            });
        }
    });
    
    const previousState = JSON.parse(JSON.stringify(this.currentNote));
    const toggle = this.currentNote.toggles.find(t => t.id === toggleId);
    
    if (toggle) {
        // Store the specific toggle's state before changing it
        const toggleState = scrollPositions.get(toggleId);
        
        toggle.isOpen = !toggle.isOpen;
        this.history.push(previousState);
        this.noteManager.updateNote(this.currentNote);
        
        // Render without restoring state since we'll handle it manually
        this.renderEditor(false);
        
        // Restore scroll positions after toggle
        const restoreScrollPositions = () => {
            // Restore main editor scroll position
            if (editorContent) {
                editorContent.scrollTop = editorScrollTop;
            }
            
            // Restore all textarea states
            scrollPositions.forEach((state, id) => {
                const textarea = document.querySelector(`textarea[data-toggle-id="${id}"]`);
                if (textarea) {
                    // For the toggled section, only restore if it's being opened
                    if (id === toggleId) {
                        if (toggle.isOpen && toggleState) {
                            textarea.scrollTop = toggleState.scrollTop;
                            if (toggleState.isFocused) {
                                textarea.focus();
                                textarea.setSelectionRange(toggleState.selectionStart, toggleState.selectionEnd);
                            }
                        }
                    } else {
                        // For other sections, restore normally
                        textarea.scrollTop = state.scrollTop;
                        if (state.isFocused) {
                            textarea.focus();
                            textarea.setSelectionRange(state.selectionStart, state.selectionEnd);
                        }
                    }
                }
            });
        };
        
        // Initial restore
        requestAnimationFrame(() => {
            restoreScrollPositions();
            
            // Double-check scroll positions after a brief delay
            setTimeout(() => {
                restoreScrollPositions();
                
                // Additional check specifically for the toggled section
                if (toggle.isOpen && toggleState) {
                    const toggledTextarea = document.querySelector(`textarea[data-toggle-id="${toggleId}"]`);
                    if (toggledTextarea && toggledTextarea.scrollTop !== toggleState.scrollTop) {
                        toggledTextarea.scrollTop = toggleState.scrollTop;
                    }
                }
            }, 50);
        });
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
      const autoResize = () => {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      };

      textarea.addEventListener('input', (e) => {
        autoResize();
        this.updateToggleContent(parseInt(e.target.dataset.toggleId), e.target.value);
      });

      autoResize();

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

  cleanupOldEditorStates() {
    const states = StorageManager.load(this.editorStateKey, {});
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    const updatedStates = Object.entries(states).reduce((acc, [id, state]) => {
        if (state.timestamp && state.timestamp > oneWeekAgo) {
            acc[id] = state;
        }
        return acc;
    }, {});
    
    StorageManager.save(this.editorStateKey, updatedStates);
  }
}
