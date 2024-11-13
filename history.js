// History management module
export class HistoryManager {
  constructor(onChange) {
    this.undoStack = [];
    this.redoStack = [];
    this.onChange = onChange;
  }

  push(state) {
    this.undoStack.push(JSON.stringify(state));
    this.redoStack = [];
    this.updateButtons();
  }

  undo(currentState) {
    if (this.undoStack.length === 0) return null;
    
    this.redoStack.push(JSON.stringify(currentState));
    const previousState = JSON.parse(this.undoStack.pop());
    this.updateButtons();
    return previousState;
  }

  redo(currentState) {
    if (this.redoStack.length === 0) return null;
    
    this.undoStack.push(JSON.stringify(currentState));
    const nextState = JSON.parse(this.redoStack.pop());
    this.updateButtons();
    return nextState;
  }

  updateButtons() {
    if (this.onChange) {
      this.onChange({
        canUndo: this.undoStack.length > 0,
        canRedo: this.redoStack.length > 0
      });
    }
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateButtons();
  }
}
