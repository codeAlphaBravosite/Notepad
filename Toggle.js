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

        const textarea = document.createElement('textarea');
        textarea.className = 'toggle-textarea';
        textarea.value = this.content;
        textarea.placeholder = 'Start writing...';

        content.appendChild(textarea);
        section.appendChild(header);
        section.appendChild(content);

        this.setupListeners(section, header, titleInput, textarea);
        
        // Set initial state
        if (this.isOpen) {
            this.toggleContent(section, true);
        }
        
        return section;
    }

    setupListeners(section, header, titleInput, textarea) {
        header.addEventListener('click', (e) => {
            if (e.target !== titleInput) {
                this.toggleContent(section);
                this.onChange?.();
            }
        });

        titleInput.addEventListener('input', (e) => {
            this.title = e.target.value;
            this.onChange?.();
        });

        textarea.addEventListener('input', (e) => {
            this.content = e.target.value;
            this.adjustTextareaHeight(textarea);
            this.onChange?.();
        });

        // Initial height adjustment
        this.adjustTextareaHeight(textarea);
    }

    adjustTextareaHeight(textarea) {
        // Reset height to auto to get the correct scrollHeight
        textarea.style.height = 'auto';
        // Set the height to match the content
        textarea.style.height = textarea.scrollHeight + 'px';
    }

    toggleContent(section, immediate = false) {
        const content = section.querySelector('.toggle-content');
        const icon = section.querySelector('svg');
        const textarea = content.querySelector('.toggle-textarea');
        
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            // Get the actual height of the content
            const height = textarea.scrollHeight + 32; // Add padding
            
            if (immediate) {
                content.style.transition = 'none';
                content.style.maxHeight = height + 'px';
                // Force reflow
                content.offsetHeight;
                content.style.transition = '';
            } else {
                content.style.maxHeight = height + 'px';
            }
            
            icon.style.transform = 'rotate(90deg)';
            content.classList.add('open');
        } else {
            content.style.maxHeight = '0';
            icon.style.transform = 'rotate(0deg)';
            content.classList.remove('open');
        }
    }

    setOnChange(callback) {
        this.onChange = callback;
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            content: this.content,
            isOpen: this.isOpen
        };
    }
}