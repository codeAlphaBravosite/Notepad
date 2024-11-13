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

        // Initialize scroll tracking variables
        let isTyping = false;
        let typingTimer;
        const cursorPositions = new Map();

        const updateTextarea = () => {
            // Store current cursor and scroll positions
            const selectionStart = textarea.selectionStart;
            const selectionEnd = textarea.selectionEnd;
            const scrollTop = textarea.scrollTop;

            // Calculate cursor position relative to viewport
            const cursorCoords = this.getCaretCoordinates(textarea);
            if (cursorCoords) {
                cursorPositions.set(textarea, cursorCoords);
            }

            // Update height
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(textarea.scrollHeight, 100) + 'px';

            // Restore cursor position
            textarea.setSelectionRange(selectionStart, selectionEnd);

            // Adjust scroll position to keep cursor in view
            if (isTyping) {
                const newCursorCoords = this.getCaretCoordinates(textarea);
                if (newCursorCoords && cursorCoords) {
                    const scrollAdjustment = newCursorCoords.top - cursorCoords.top;
                    textarea.scrollTop = scrollTop + scrollAdjustment;
                }
            }
        };

        textarea.addEventListener('input', () => {
            this.content = textarea.value;
            this.onChange?.();

            isTyping = true;
            clearTimeout(typingTimer);
            
            updateTextarea();
            
            typingTimer = setTimeout(() => {
                isTyping = false;
            }, 1000);
        });

        textarea.addEventListener('focus', updateTextarea);
        textarea.addEventListener('blur', updateTextarea);

        // Handle scroll position during continuous typing
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                requestAnimationFrame(updateTextarea);
            }
        });

        // Initial setup
        requestAnimationFrame(() => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(textarea.scrollHeight, 100) + 'px';
        });
    }

    getCaretCoordinates(textarea) {
        const position = textarea.selectionStart;
        
        // Create a mirror div to measure
        const mirror = document.createElement('div');
        mirror.style.cssText = window.getComputedStyle(textarea).cssText;
        mirror.style.height = 'auto';
        mirror.style.position = 'absolute';
        mirror.style.visibility = 'hidden';
        mirror.style.whiteSpace = 'pre-wrap';
        
        // Create content before cursor
        const content = textarea.value.substring(0, position);
        mirror.textContent = content;
        
        // Add mirror to DOM temporarily
        document.body.appendChild(mirror);
        
        // Get coordinates
        const coords = {
            top: mirror.offsetHeight,
            left: mirror.offsetWidth
        };
        
        // Clean up
        document.body.removeChild(mirror);
        
        return coords;
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
                textarea.style.height = Math.max(textarea.scrollHeight, 100) + 'px';
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