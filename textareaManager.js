export class TextareaManager {
  constructor(textarea) {
    this.textarea = textarea;
    this.isComposing = false;
    this.lastScrollTop = 0;
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.textarea.addEventListener('input', () => this.handleInput());
    this.textarea.addEventListener('compositionstart', () => this.handleCompositionStart());
    this.textarea.addEventListener('compositionend', () => this.handleCompositionEnd());
    this.textarea.addEventListener('focus', () => this.handleFocus());
    this.textarea.addEventListener('blur', () => this.handleBlur());
    this.textarea.addEventListener('scroll', () => this.handleScroll());
  }

  handleInput() {
    if (this.isComposing) return;
    this.adjustHeight();
  }

  handleCompositionStart() {
    this.isComposing = true;
  }

  handleCompositionEnd() {
    this.isComposing = false;
    this.adjustHeight();
  }

  handleFocus() {
    // Store the current scroll position when focusing
    this.lastScrollTop = window.scrollY;
    
    // Prevent immediate scroll
    requestAnimationFrame(() => {
      window.scrollTo(0, this.lastScrollTop);
    });
  }

  handleBlur() {
    // Restore scroll position on blur
    window.scrollTo(0, this.lastScrollTop);
  }

  handleScroll() {
    // Only update scroll position if user manually scrolled
    if (document.activeElement === this.textarea) {
      this.lastScrollTop = window.scrollY;
    }
  }

  adjustHeight() {
    const previousHeight = this.textarea.style.height;
    
    // Reset height to recalculate
    this.textarea.style.height = 'auto';
    
    // Calculate new height with padding
    const computedStyle = window.getComputedStyle(this.textarea);
    const paddingTop = parseFloat(computedStyle.paddingTop);
    const paddingBottom = parseFloat(computedStyle.paddingBottom);
    const newHeight = Math.max(
      100, // minimum height
      this.textarea.scrollHeight + paddingTop + paddingBottom
    );
    
    // Only update if height actually changed
    if (previousHeight !== `${newHeight}px`) {
      this.textarea.style.height = `${newHeight}px`;
      
      // Maintain cursor visibility without forcing scroll
      if (document.activeElement === this.textarea) {
        const cursorPosition = this.getCursorPosition();
        if (cursorPosition) {
          this.scrollToCursor(cursorPosition);
        }
      }
    }
  }

  getCursorPosition() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return null;

    const range = selection.getRangeAt(0);
    const rects = range.getClientRects();
    if (rects.length === 0) return null;

    return {
      top: rects[0].top,
      bottom: rects[0].bottom
    };
  }

  scrollToCursor(cursorPosition) {
    const viewportHeight = window.visualViewport?.height || window.innerHeight;
    const keyboardHeight = window.innerHeight - viewportHeight;
    const buffer = 20; // Pixels of space above and below cursor

    if (cursorPosition.bottom > viewportHeight - keyboardHeight - buffer) {
      const scrollAmount = cursorPosition.bottom - (viewportHeight - keyboardHeight) + buffer;
      window.scrollBy({
        top: scrollAmount,
        behavior: 'instant'
      });
    } else if (cursorPosition.top < buffer) {
      const scrollAmount = cursorPosition.top - buffer;
      window.scrollBy({
        top: scrollAmount,
        behavior: 'instant'
      });
    }
  }
}