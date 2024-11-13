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

        textarea.addEventListener('input', (e) => {
            this.content = e.target.value;
            this.onChange?.();

            // Save the current cursor position and scroll position
            const selectionStart = textarea.selectionStart;
            const selectionEnd = textarea.selectionEnd;
            const currentScrollTop = textarea.scrollTop;

            // Adjust height
            textarea.style.height = 'auto';
            const newHeight = Math.max(textarea.scrollHeight, 100);
            textarea.style.height = newHeight + 'px';

            // If content was added (height increased)
            if (textarea.scrollHeight > lastScrollHeight) {
                // Calculate the height difference
                const heightDiff = textarea.scrollHeight - lastScrollHeight;
                
                // If we're typing at the bottom half of the textarea
                const cursorPosition = textarea.selectionStart;
                const totalLength = textarea.value.length;
                if (cursorPosition > totalLength / 2) {
                    textarea.scrollTop = currentScrollTop + heightDiff;
                }
            }

            // Update last height
            lastScrollHeight = textarea.scrollHeight;
            lastScrollTop = textarea.scrollTop;

            // Restore the cursor position
            textarea.setSelectionRange(selectionStart, selectionEnd);
        });

        // Initial height adjustment
        requestAnimationFrame(() => {
            textarea.style.height = 'auto';
            textarea.style.height = Math.max(textarea.scrollHeight, 100) + 'px';
        });
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
