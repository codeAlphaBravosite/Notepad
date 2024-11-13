class NotesApp {
    constructor() {
        this.notes = this.loadNotes();
        this.currentNote = null;
        this.undoStack = [];
        this.redoStack = [];
        
        this.initializeElements();
        this.setupEventListeners();
        this.renderNotesList();
    }

    initializeElements() {
        this.notesListView = document.getElementById('notes-list-view');
        this.notesList = document.getElementById('notes-list');
        this.editor = document.getElementById('editor');
        this.titleInput = document.getElementById('note-title');
        this.togglesContainer = document.getElementById('toggles-container');
        this.searchInput = document.getElementById('search');
    }

    setupEventListeners() {
        document.getElementById('new-note').addEventListener('click', () => this.createNote());
        document.getElementById('back-button').addEventListener('click', () => this.showNotesList());
        document.getElementById('delete-button').addEventListener('click', () => this.deleteCurrentNote());
        document.getElementById('add-toggle').addEventListener('click', () => this.addToggleToCurrentNote());
        document.getElementById('undo-button').addEventListener('click', () => this.undo());
        document.getElementById('redo-button').addEventListener('click', () => this.redo());
        this.searchInput.addEventListener('input', () => this.handleSearch());
        this.titleInput.addEventListener('input', () => this.handleTitleChange());
    }

    loadNotes() {
        const savedNotes = localStorage.getItem('notes');
        return savedNotes ? JSON.parse(savedNotes).map(n => new Note(n)) : [];
    }

    saveNotes() {
        localStorage.setItem('notes', JSON.stringify(this.notes));
    }

    createNote() {
        const note = new Note();
        this.notes.unshift(note);
        this.saveNotes();
        this.showNote(note);
    }

    showNote(note) {
        this.currentNote = note;
        this.titleInput.value = note.title;
        this.editor.classList.remove('hidden');
        this.notesListView.classList.add('hidden');
        
        this.renderToggles();
        this.saveToUndoStack();
    }

    renderToggles() {
        this.togglesContainer.innerHTML = '';
        this.currentNote.toggles.forEach(toggle => {
            const toggleElement = toggle.createDOM();
            toggle.setOnChange(() => this.handleNoteChange());
            this.togglesContainer.appendChild(toggleElement);
        });
    }

    showNotesList() {
        this.editor.classList.add('hidden');
        this.notesListView.classList.remove('hidden');
        this.currentNote = null;
        this.renderNotesList();
    }

    handleSearch() {
        this.renderNotesList();
    }

    renderNotesList() {
        const searchTerm = this.searchInput.value.toLowerCase();
        const filteredNotes = this.notes.filter(note =>
            note.title.toLowerCase().includes(searchTerm) ||
            note.toggles.some(t => 
                t.title.toLowerCase().includes(searchTerm) ||
                t.content.toLowerCase().includes(searchTerm)
            )
        );

        this.notesList.innerHTML = filteredNotes.map(note => this.createNoteCard(note)).join('');
        
        document.querySelectorAll('.note-card').forEach(card => {
            card.addEventListener('click', () => {
                const note = this.notes.find(n => n.id === parseInt(card.dataset.id));
                if (note) this.showNote(note);
            });
        });
    }

    createNoteCard(note) {
        const date = new Date(note.updated).toLocaleDateString();
        return `
            <div class="note-card" data-id="${note.id}">
                <h2>${note.title || 'Untitled'}</h2>
                <p>${note.toggles.length} sections</p>
                <div class="note-meta">Last updated: ${date}</div>
            </div>
        `;
    }

    handleTitleChange() {
        if (!this.currentNote) return;
        this.currentNote.title = this.titleInput.value;
        this.handleNoteChange();
    }

    handleNoteChange() {
        if (!this.currentNote) return;
        this.saveToUndoStack();
        this.saveNotes();
    }

    addToggleToCurrentNote() {
        if (!this.currentNote) return;
        const newToggle = this.currentNote.addToggle();
        const toggleElement = newToggle.createDOM();
        newToggle.setOnChange(() => this.handleNoteChange());
        this.togglesContainer.appendChild(toggleElement);
        this.handleNoteChange();
    }

    deleteCurrentNote() {
        if (!this.currentNote) return;
        
        if (confirm('Are you sure you want to delete this note?')) {
            this.notes = this.notes.filter(note => note.id !== this.currentNote.id);
            this.saveNotes();
            this.showNotesList();
        }
    }

    saveToUndoStack() {
        const currentState = {
            ...this.currentNote.toJSON(),
            toggleStates: this.currentNote.toggles.map(t => ({ id: t.id, isOpen: t.isOpen }))
        };
        this.undoStack.push(JSON.stringify(currentState));
        this.redoStack = [];
        this.updateUndoRedoButtons();
    }

    undo() {
        if (this.undoStack.length <= 1) return;
        
        const currentState = this.undoStack.pop();
        this.redoStack.push(currentState);
        
        const previousState = JSON.parse(this.undoStack[this.undoStack.length - 1]);
        this.restoreNoteState(previousState);
        this.updateUndoRedoButtons();
    }

    redo() {
        if (this.redoStack.length === 0) return;
        
        const nextState = this.redoStack.pop();
        this.undoStack.push(nextState);
        
        const newState = JSON.parse(nextState);
        this.restoreNoteState(newState);
        this.updateUndoRedoButtons();
    }

    restoreNoteState(state) {
        const noteIndex = this.notes.findIndex(n => n.id === state.id);
        if (noteIndex === -1) return;

        const note = new Note(state);
        
        if (state.toggleStates) {
            note.toggles.forEach(toggle => {
                const savedState = state.toggleStates.find(s => s.id === toggle.id);
                if (savedState) {
                    toggle.isOpen = savedState.isOpen;
                }
            });
        }

        this.notes[noteIndex] = note;
        this.currentNote = note;
        this.titleInput.value = note.title;
        this.renderToggles();
        this.saveNotes();
    }

    updateUndoRedoButtons() {
        document.getElementById('undo-button').disabled = this.undoStack.length <= 1;
        document.getElementById('redo-button').disabled = this.redoStack.length === 0;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new NotesApp();
});
