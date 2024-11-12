// State management
let notes = JSON.parse(localStorage.getItem('notes') || '[]');
let currentNote = null;
let undoStack = [];
let redoStack = [];

// DOM Elements
const app = document.getElementById('app');
const notesList = document.getElementById('notes-list');
const editor = document.getElementById('editor');
const searchInput = document.getElementById('search');
const noteTitle = document.getElementById('note-title');
const togglesContainer = document.getElementById('toggles-container');
const undoButton = document.getElementById('undo-button');
const redoButton = document.getElementById('redo-button');

// Event Listeners
document.getElementById('new-note').addEventListener('click', createNewNote);
document.getElementById('back-button').addEventListener('click', closeEditor);
document.getElementById('delete-button').addEventListener('click', deleteCurrentNote);
document.getElementById('add-toggle').addEventListener('click', addNewToggle);
undoButton.addEventListener('click', undo);
redoButton.addEventListener('click', redo);
searchInput.addEventListener('input', filterNotes);
noteTitle.addEventListener('input', (e) => {
  if (currentNote) {
    pushToUndoStack();
    updateNoteTitle(e);
  }
});

// Initialize the app
renderNotesList();

function createNewNote() {
  const initialToggles = Array.from({ length: 5 }, (_, i) => ({
    id: Date.now() + i,
    title: `Section ${i + 1}`,
    content: '',
    isOpen: false
  }));

  const note = {
    id: Date.now(),
    title: '',
    toggles: initialToggles,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  };
  
  notes.unshift(note);
  saveNotes();
  openEditor(note);
  clearUndoRedoStacks();
}

function openEditor(note) {
  currentNote = JSON.parse(JSON.stringify(note)); // Deep clone
  editor.classList.remove('hidden');
  document.getElementById('notes-list-view').classList.add('hidden');
  renderEditor();
  clearUndoRedoStacks();
}

function deleteCurrentNote() {
  if (!currentNote) return;
  
  if (confirm('Are you sure you want to delete this note?')) {
    notes = notes.filter(note => note.id !== currentNote.id);
    saveNotes();
    closeEditor();
  }
}

function addNewToggle() {
  if (!currentNote) return;
  
  pushToUndoStack();
  
  const newToggle = {
    id: Date.now(),
    title: `Section ${currentNote.toggles.length + 1}`,
    content: '',
    isOpen: true
  };
  
  currentNote.toggles.push(newToggle);
  updateNote();
  renderEditor();
}

function updateNoteTitle(event) {
  if (!currentNote) return;
  
  currentNote.title = event.target.value;
  updateNote();
}

function updateToggleTitle(toggleId, newTitle) {
  if (!currentNote) return;
  
  pushToUndoStack();
  const toggle = currentNote.toggles.find(t => t.id === toggleId);
  if (toggle) {
    toggle.title = newTitle;
    updateNote();
  }
}

function updateToggleContent(toggleId, newContent) {
  if (!currentNote) return;
  
  pushToUndoStack();
  const toggle = currentNote.toggles.find(t => t.id === toggleId);
  if (toggle) {
    toggle.content = newContent;
    updateNote();
  }
}

function toggleSection(toggleId) {
  if (!currentNote) return;
  
  const toggle = currentNote.toggles.find(t => t.id === toggleId);
  if (toggle) {
    toggle.isOpen = !toggle.isOpen;
    updateNote();
    renderEditor();
  }
}

function updateNote() {
  if (!currentNote) return;
  
  currentNote.updated = new Date().toISOString();
  const index = notes.findIndex(note => note.id === currentNote.id);
  if (index !== -1) {
    notes[index] = JSON.parse(JSON.stringify(currentNote));
    saveNotes();
  }
}

function saveNotes() {
  try {
    localStorage.setItem('notes', JSON.stringify(notes));
  } catch (error) {
    console.error('Failed to save notes:', error);
    alert('Failed to save notes. Local storage might be full.');
  }
}

function filterNotes() {
  const searchTerm = searchInput.value.toLowerCase();
  renderNotesList(searchTerm);
}

function renderNotesList(searchTerm = '') {
  const filteredNotes = notes.filter(note => {
    const titleMatch = note.title.toLowerCase().includes(searchTerm);
    const contentMatch = note.toggles.some(toggle => 
      toggle.title.toLowerCase().includes(searchTerm) ||
      toggle.content.toLowerCase().includes(searchTerm)
    );
    return titleMatch || contentMatch;
  });

  notesList.innerHTML = filteredNotes.length ? filteredNotes.map(note => `
    <div class="note-card" data-note-id="${note.id}">
      <h2>${note.title || 'Untitled Note'}</h2>
      <p>${note.toggles.map(t => t.content).join(' ').slice(0, 150) || 'No content'}</p>
      <div class="note-meta">
        Last updated: ${new Date(note.updated).toLocaleDateString()}
      </div>
    </div>
  `).join('') : '<p class="empty-state">No notes found</p>';

  // Attach click handlers
  document.querySelectorAll('.note-card').forEach(card => {
    card.addEventListener('click', () => {
      const noteId = parseInt(card.dataset.noteId);
      const note = notes.find(n => n.id === noteId);
      if (note) openEditor(note);
    });
  });
}

function renderEditor() {
  if (!currentNote) return;

  noteTitle.value = currentNote.title;
  
  togglesContainer.innerHTML = currentNote.toggles.map(toggle => `
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
        >${toggle.content}</textarea>
      </div>
    </div>
  `).join('');

  // Attach event listeners
  document.querySelectorAll('.toggle-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (!e.target.classList.contains('toggle-title')) {
        toggleSection(parseInt(header.dataset.toggleId));
      }
    });
  });

  document.querySelectorAll('.toggle-title').forEach(input => {
    input.addEventListener('change', (e) => {
      updateToggleTitle(parseInt(e.target.dataset.toggleId), e.target.value);
    });
    input.addEventListener('click', (e) => e.stopPropagation());
  });

  document.querySelectorAll('textarea').forEach(textarea => {
    textarea.addEventListener('input', (e) => {
      updateToggleContent(parseInt(e.target.dataset.toggleId), e.target.value);
      autoResizeTextarea(textarea);
    });
    autoResizeTextarea(textarea);
  });

  updateUndoRedoButtons();
}

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = textarea.scrollHeight + 'px';
}

// Undo/Redo functionality
function pushToUndoStack() {
  undoStack.push(JSON.stringify(currentNote));
  redoStack = []; // Clear redo stack when new changes are made
  updateUndoRedoButtons();
}

function undo() {
  if (undoStack.length === 0) return;
  
  redoStack.push(JSON.stringify(currentNote));
  currentNote = JSON.parse(undoStack.pop());
  updateNote();
  renderEditor();
  updateUndoRedoButtons();
}

function redo() {
  if (redoStack.length === 0) return;
  
  undoStack.push(JSON.stringify(currentNote));
  currentNote = JSON.parse(redoStack.pop());
  updateNote();
  renderEditor();
  updateUndoRedoButtons();
}

function clearUndoRedoStacks() {
  undoStack = [];
  redoStack = [];
  updateUndoRedoButtons();
}

function updateUndoRedoButtons() {
  undoButton.disabled = undoStack.length === 0;
  redoButton.disabled = redoStack.length === 0;
}

function hasUnsavedChanges() {
  return undoStack.length > 0;
}

// Error handling for localStorage
window.addEventListener('storage', (e) => {
  if (e.key === 'notes') {
    try {
      notes = JSON.parse(e.newValue || '[]');
      renderNotesList();
    } catch (error) {
      console.error('Failed to parse notes from storage:', error);
    }
  }
});
