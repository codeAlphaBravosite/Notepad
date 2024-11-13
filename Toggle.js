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

        let lastScrollTop = 0;
        let lastScrollHeight = textarea.scrollHeight;

        const adjustTextarea = () => {
            const currentScrollTop = textarea.scrollTop;
            const currentScrollHeight = textarea.scrollHeight;
            
            // Store current cursor position
            const selectionStart = textarea.selectionStart;
            const selectionEnd = textarea.selectionEnd;

            // Temporarily collapse the textarea to get the natural height
            textarea.style.height = 'auto';
            
            // Set the new height
            const newHeight = Math.max(textarea.scrollHeight, 200);
            textarea.style.height = newHeight + 'px';

            // Restore cursor position
            textarea.setSelectionRange(selectionStart, selectionEnd);

            // Maintain scroll position relative to content
            if (currentScrollHeight !== lastScrollHeight) {
                textarea.scrollTop = currentScrollTop;
            }

            lastScrollHeight = textarea.scrollHeight;
            lastScrollTop = textarea.scrollTop;
        };

        // Handle input events
        textarea.addEventListener('input', () => {
            this.content = textarea.value;
            this.onChange?.();
            adjustTextarea();
        });

        // Handle initial load and focus
        textarea.addEventListener('focus', adjustTextarea);

        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.isOpen) {
                adjustTextarea();
            }
        });

        // Initial setup
        if (this.isOpen) {
            requestAnimationFrame(adjustTextarea);
        }
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