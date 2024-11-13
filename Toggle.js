class Toggle {
    constructor(id, title = '', content = '', isOpen = false) {
        this.id = id || crypto.randomUUID();
        this.title = title;
        this.content = content;
        this.isOpen = isOpen;
    }

    createDOM() {
        const section = document.createElement('div');
        section.className = 'toggle-section';
        section.dataset.id = this.id;

        const header = document.createElement('div');
        header.className = 'toggle-header';
        
        const toggleIcon = document.createElement('span');
        toggleIcon.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9 18l6-6-6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.className = 'toggle-title';
        titleInput.value = this.title;
        titleInput.placeholder = 'Section title...';

        header.appendChild(toggleIcon);
        header.appendChild(titleInput);

        const content = document.createElement('div');
        content.className = 'toggle-content';
        content.style.display = this.isOpen ? 'block' : 'none';

        const textarea = document.createElement('textarea');
        textarea.className = 'toggle-textarea';
        textarea.value = this.content;
        textarea.placeholder = 'Start writing...';
        textarea.setAttribute('data-gramm', 'false'); // Disable Grammarly
        textarea.setAttribute('data-enable-grammarly', 'false');

        content.appendChild(textarea);
        section.appendChild(header);
        section.appendChild(content);

        if (this.isOpen) {
            const icon = section.querySelector('svg');
            icon.style.transform = 'rotate(90deg)';
        }

        this.setupListeners(section, header, titleInput, textarea);
        return section;
    }

    setupListeners(section, header, titleInput, textarea) {
        header.addEventListener('click', (e) => {
            if (e.target !== titleInput) {
                this.toggleContent(section);
            }
        });

        titleInput.addEventListener('input', (e) => {
            this.title = e.target.value;
            this.onChange?.();
        });

        let isComposing = false;
        let lastCursorPosition = 0;
        let lastScrollTop = 0;
        let resizeTimeout;

        const preserveCursorPosition = () => {
            lastCursorPosition = textarea.selectionStart;
            lastScrollTop = textarea.scrollTop;
        };

        const restoreCursorPosition = () => {
            if (document.activeElement === textarea) {
                textarea.setSelectionRange(lastCursorPosition, lastCursorPosition);
                textarea.scrollTop = lastScrollTop;
            }
        };

        const updateTextareaHeight = () => {
            preserveCursorPosition();
            
            const minHeight = 200;
            const paddingTop = parseInt(window.getComputedStyle(textarea).paddingTop);
            const paddingBottom = parseInt(window.getComputedStyle(textarea).paddingBottom);
            const padding = paddingTop + paddingBottom;

            // Reset height to auto to get the correct scrollHeight
            textarea.style.height = 'auto';
            
            // Calculate new height
            const newHeight = Math.max(textarea.scrollHeight, minHeight);
            textarea.style.height = `${newHeight}px`;

            // Ensure content is visible around cursor
            if (document.activeElement === textarea) {
                const cursorY = textarea.getBoundingClientRect().top + 
                              (lastCursorPosition / textarea.value.length) * textarea.scrollHeight;
                
                const viewportHeight = window.innerHeight;
                const keyboardHeight = window.innerWidth <= 640 ? viewportHeight * 0.4 : 0;
                const visibleHeight = viewportHeight - keyboardHeight - padding;

                if (cursorY > visibleHeight) {
                    textarea.scrollTop = lastScrollTop;
                }
            }

            restoreCursorPosition();
        };

        // Handle input events
        textarea.addEventListener('input', () => {
            if (!isComposing) {
                this.content = textarea.value;
                this.onChange?.();
                
                if (resizeTimeout) {
                    clearTimeout(resizeTimeout);
                }
                
                resizeTimeout = setTimeout(updateTextareaHeight, 10);
            }
        });

        // Handle composition events (for IME input)
        textarea.addEventListener('compositionstart', () => {
            isComposing = true;
        });

        textarea.addEventListener('compositionend', () => {
            isComposing = false;
            this.content = textarea.value;
            this.onChange?.();
            updateTextareaHeight();
        });

        // Handle focus events
        textarea.addEventListener('focus', () => {
            if (window.innerWidth <= 640) {
                requestAnimationFrame(() => {
                    const rect = textarea.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const targetY = rect.top + scrollTop - 100;
                    window.scrollTo({
                        top: targetY,
                        behavior: 'smooth'
                    });
                });
            }
            updateTextareaHeight();
        });

        // Handle scroll events
        textarea.addEventListener('scroll', () => {
            lastScrollTop = textarea.scrollTop;
        });

        // Handle keydown events
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                preserveCursorPosition();
                requestAnimationFrame(() => {
                    updateTextareaHeight();
                });
            }
        });

        // Handle selection changes
        textarea.addEventListener('select', preserveCursorPosition);
        textarea.addEventListener('click', preserveCursorPosition);
        textarea.addEventListener('keyup', preserveCursorPosition);

        // Initial setup
        requestAnimationFrame(updateTextareaHeight);

        // Handle window resize
        const debouncedResize = debounce(() => {
            if (this.isOpen) {
                updateTextareaHeight();
            }
        }, 100);

        window.addEventListener('resize', debouncedResize);
    }

    toggleContent(section) {
        const content = section.querySelector('.toggle-content');
        const icon = section.querySelector('svg');
        const textarea = content.querySelector('.toggle-textarea');
        
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            content.style.display = 'block';
            icon.style.transform = 'rotate(90deg)';
            
            requestAnimationFrame(() => {
                textarea.style.height = 'auto';
                textarea.style.height = Math.max(textarea.scrollHeight, 200) + 'px';
            });
        } else {
            content.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
        }
    }

    setOnChange(callback) {
        this.onChange = callback;
    }
}

// Utility function for debouncing
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}