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
        let isComposing = false;

        const updateTextareaHeight = () => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(textarea.scrollHeight, 200) + 'px';
        };

        textarea.addEventListener('compositionstart', () => {
            isComposing = true;
        });

        textarea.addEventListener('compositionend', () => {
            isComposing = false;
            updateTextareaHeight();
        });

        textarea.addEventListener('input', () => {
            if (!isComposing) {
                this.content = textarea.value;
                this.onChange?.();
                updateTextareaHeight();
            }
        });

        textarea.addEventListener('focus', () => {
            if (window.innerWidth <= 640) {
                document.body.style.paddingBottom = '40vh';
                textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            updateTextareaHeight();
        });

        textarea.addEventListener('blur', () => {
            if (window.innerWidth <= 640) {
                document.body.style.paddingBottom = '0';
            }
            updateTextareaHeight();
        });

        textarea.addEventListener('scroll', () => {
            lastScrollTop = textarea.scrollTop;
        });

        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const currentPos = textarea.selectionStart;
                const textBeforeCursor = textarea.value.substring(0, currentPos);
                const lineCount = (textBeforeCursor.match(/\n/g) || []).length;
                
                requestAnimationFrame(() => {
                    updateTextareaHeight();
                    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight);
                    const visibleLines = Math.floor(textarea.clientHeight / lineHeight);
                    if (lineCount > visibleLines - 3) {
                        textarea.scrollTop = lastScrollTop + lineHeight;
                    }
                });
            }
        });

        requestAnimationFrame(updateTextareaHeight);
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