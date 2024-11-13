export class StorageManager {
  static save(key, data) {
    if (!key || typeof key !== 'string') return;
    
    try {
      const serializedData = JSON.stringify(data);
      localStorage.setItem(key, serializedData);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
      
      // Attempt to clear some space if storage is full
      if (error.name === 'QuotaExceededError') {
        this.clearOldData();
        try {
          localStorage.setItem(key, JSON.stringify(data));
        } catch (retryError) {
          console.error('Failed to save even after clearing space:', retryError);
        }
      }
    }
  }

  static load(key, defaultValue = null) {
    if (!key || typeof key !== 'string') return defaultValue;
    
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } catch (error) {
      console.error('Error loading from localStorage:', error);
      return defaultValue;
    }
  }

  static clearOldData() {
    try {
      const keys = Object.keys(localStorage);
      const oldestKeys = keys.sort((a, b) => {
        const aTime = localStorage.getItem(a)?.updated || 0;
        const bTime = localStorage.getItem(b)?.updated || 0;
        return aTime - bTime;
      }).slice(0, Math.ceil(keys.length * 0.2)); // Remove oldest 20%
      
      oldestKeys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Error clearing old data:', error);
    }
  }
}