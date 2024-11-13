export class HistoryManager {
  constructor(onChange) {
    this.undoStack = [];
    this.redoStack = [];
    this.onChange = onChange;
    this.maxStackSize = 100;
    this.updateButtons();
  }

  push(state) {
    if (!state) return;
    
    try {
      const serializedState = JSON.stringify(state);
      
      if (this.undoStack.length > 0 && 
          this.undoStack[this.undoStack.length - 1] === serializedState) {
        return;
      }
      
      this.undoStack.push(serializedState);
      
      if (this.undoStack.length > this.maxStackSize) {
        this.undoStack.shift();
      }
      
      this.redoStack = [];
      this.updateButtons();
    } catch (error) {
      console.error('Error pushing state to history:', error);
    }
  }

  undo(currentState) {
    if (this.undoStack.length === 0) return null;
    
    try {
      this.redoStack.push(JSON.stringify(currentState));
      const previousState = JSON.parse(this.undoStack.pop());
      this.updateButtons();
      return previousState;
    } catch (error) {
      console.error('Error during undo:', error);
      return null;
    }
  }

  redo(currentState) {
    if (this.redoStack.length === 0) return null;
    
    try {
      this.undoStack.push(JSON.stringify(currentState));
      const nextState = JSON.parse(this.redoStack.pop());
      this.updateButtons();
      return nextState;
    } catch (error) {
      console.error('Error during redo:', error);
      return null;
    }
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
    this.updateButtons();
  }

  updateButtons() {
    if (typeof this.onChange === 'function') {
      this.onChange({
        canUndo: this.undoStack.length > 0,
        canRedo: this.redoStack.length > 0
      });
    }
  }
}