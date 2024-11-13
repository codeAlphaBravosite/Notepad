class Toggle {
    constructor(id, title = '', content = '') {
        this.id = id || crypto.randomUUID();
        this.title = title;
        this.content = content;
        this.isOpen = false;
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

        textarea.addEventListener('input', (e) => {
            this.content = e.target.value;
            this.onChange?.();
        });
    }

    toggleContent(section) {
        const content = section.querySelector('.toggle-content');
        const icon = section.querySelector('svg');
        
        this.isOpen = !this.isOpen;
        
        if (this.isOpen) {
            content.classList.add('open');
            icon.style.transform = 'rotate(90deg)';
        } else {
            content.classList.remove('open');
            icon.style.transform = 'rotate(0deg)';
        }
    }

    setOnChange(callback) {
        this.onChange = callback;
    }
}