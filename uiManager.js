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
    this.renderEditor();
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
      this.renderEditor();
    }
  }

  filterNotes() {
    const searchTerm = this.searchInput.value.toLowerCase();
    this.renderNotesList(searchTerm);
  }

  renderNotesList(searchTerm = '') {
    const filteredNotes = this.noteManager.getNotes(searchTerm);
    
    const notesHTML = filteredNotes.length 
      ? filteredNotes.map(note => {
          const card = document.createElement('div');
          card.className = 'note-card';
          card.dataset.noteId = note.id;
          
          const title = document.createElement('h2');
          title.textContent = note.title || 'Untitled Note';
          
          const content = document.createElement('p');
          content.textContent = note.toggles.map(t => t.content).join(' ').slice(0, 150) || 'No content';
          
          const meta = document.createElement('div');
          meta.className = 'note-meta';
          meta.textContent = `Last updated: ${new Date(note.updated).toLocaleDateString()}`;
          
          card.appendChild(title);
          card.appendChild(content);
          card.appendChild(meta);
          
          return card;
        })
      : [document.createElement('p')];
    
    if (!filteredNotes.length) {
      notesHTML[0].className = 'empty-state';
      notesHTML[0].textContent = 'No notes found';
    }
    
    this.notesList.innerHTML = '';
    notesHTML.forEach(element => this.notesList.appendChild(element));

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
    
    // Create a document fragment to build the content
    const fragment = document.createDocumentFragment();
    
    // Clear existing content
    this.togglesContainer.innerHTML = '';
    
    // Create and append toggle sections one by one
    this.currentNote.toggles.forEach(toggle => {
      const toggleSection = document.createElement('div');
      toggleSection.className = 'toggle-section';
      
      // Create toggle header
      const toggleHeader = document.createElement('div');
      toggleHeader.className = 'toggle-header';
      toggleHeader.dataset.toggleId = toggle.id;
      
      // Create toggle icon
      const toggleIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      toggleIcon.setAttribute('width', '20');
      toggleIcon.setAttribute('height', '20');
      toggleIcon.setAttribute('viewBox', '0 0 24 24');
      toggleIcon.setAttribute('fill', 'none');
      toggleIcon.setAttribute('stroke', 'currentColor');
      toggleIcon.className = `toggle-icon ${toggle.isOpen ? 'open' : ''}`;
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M9 18l6-6-6-6');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('stroke-linecap', 'round');
      toggleIcon.appendChild(path);
      
      // Create title input
      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.className = 'toggle-title';
      titleInput.value = toggle.title;
      titleInput.dataset.toggleId = toggle.id;
      
      // Create content area
      const contentDiv = document.createElement('div');
      contentDiv.className = `toggle-content ${toggle.isOpen ? 'open' : ''}`;
      
      const textarea = document.createElement('textarea');
      textarea.dataset.toggleId = toggle.id;
      textarea.placeholder = 'Start writing...';
      textarea.style.height = '300px';
      textarea.value = toggle.content;
      
      // Assemble the toggle section
      toggleHeader.appendChild(toggleIcon);
      toggleHeader.appendChild(titleInput);
      contentDiv.appendChild(textarea);
      toggleSection.appendChild(toggleHeader);
      toggleSection.appendChild(contentDiv);
      
      fragment.appendChild(toggleSection);
    });
    
    // Append all content at once
    this.togglesContainer.appendChild(fragment);
    
    // Attach event listeners
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
      textarea.addEventListener('input', (e) => {
        this.updateToggleContent(parseInt(e.target.dataset.toggleId), e.target.value);
      });
    });
  }
      }
