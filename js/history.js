const History = {
  _undoStack: [],
  _redoStack: [],
  _maxSize: 50,

  push(planState) {
    this._undoStack.push(JSON.parse(JSON.stringify(planState)));
    if (this._undoStack.length > this._maxSize) {
      this._undoStack.shift();
    }
    this._redoStack = [];
  },

  undo(currentState) {
    if (this._undoStack.length === 0) return null;
    this._redoStack.push(JSON.parse(JSON.stringify(currentState)));
    if (this._redoStack.length > this._maxSize) {
      this._redoStack.shift();
    }
    return this._undoStack.pop();
  },

  redo(currentState) {
    if (this._redoStack.length === 0) return null;
    this._undoStack.push(JSON.parse(JSON.stringify(currentState)));
    if (this._undoStack.length > this._maxSize) {
      this._undoStack.shift();
    }
    return this._redoStack.pop();
  },

  canUndo() {
    return this._undoStack.length > 0;
  },

  canRedo() {
    return this._redoStack.length > 0;
  },

  clear() {
    this._undoStack = [];
    this._redoStack = [];
  }
};
