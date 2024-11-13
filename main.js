import { NoteManager } from './noteManager.js';
import { UIManager } from './uiManager.js';

const noteManager = new NoteManager();
const uiManager = new UIManager(noteManager);

uiManager.initialize();