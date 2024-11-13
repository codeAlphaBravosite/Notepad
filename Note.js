class Note {
    constructor(data = {}) {
        this.id = data.id || Date.now();
        this.title = data.title || '';
        this.toggles = (data.toggles || []).map(t => new Toggle(t.id, t.title, t.content, t.isOpen));
        this.created = data.created || new Date().toISOString();
        this.updated = data.updated || new Date().toISOString();

        if (this.toggles.length === 0) {
            this.addDefaultToggles();
        }
    }

    addDefaultToggles() {
        for (let i = 1; i <= 3; i++) {
            this.toggles.push(new Toggle(null, `Section ${i}`, ''));
        }
    }

    toJSON() {
        return {
            id: this.id,
            title: this.title,
            toggles: this.toggles.map(t => ({
                id: t.id,
                title: t.title,
                content: t.content,
                isOpen: t.isOpen
            })),
            created: this.created,
            updated: new Date().toISOString()
        };
    }

    addToggle() {
        const newToggle = new Toggle(null, `Section ${this.toggles.length + 1}`, '');
        this.toggles.push(newToggle);
        return newToggle;
    }
}