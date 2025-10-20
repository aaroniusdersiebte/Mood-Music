// Mood Manager Component
class MoodManager {
    constructor(app) {
        this.app = app;
        this.moods = [];
        this.currentMood = null;
        this.currentEditMood = null;
        
        this.setupMoodControls();
    }

    setupMoodControls() {
        // Add mood button
        document.getElementById('add-mood-btn').addEventListener('click', () => {
            this.showAddMoodModal();
        });

        // Add Modal controls
        document.getElementById('save-mood-btn').addEventListener('click', () => {
            this.saveMood();
        });

        document.getElementById('cancel-mood-btn').addEventListener('click', () => {
            this.hideAddMoodModal();
        });

        // Edit Modal controls
        document.getElementById('update-mood-btn').addEventListener('click', () => {
            this.updateMood();
        });

        document.getElementById('delete-mood-btn').addEventListener('click', () => {
            this.deleteCurrentMood();
        });

        document.getElementById('cancel-edit-mood-btn').addEventListener('click', () => {
            this.hideEditMoodModal();
        });

        // Add mood intensity slider
        const intensitySlider = document.getElementById('mood-intensity');
        const intensityValue = document.getElementById('intensity-value');
        
        if (intensitySlider && intensityValue) {
            intensitySlider.addEventListener('input', (e) => {
                intensityValue.textContent = e.target.value;
                this.updateMoodPreview();
            });
        }

        // Edit mood intensity slider
        const editIntensitySlider = document.getElementById('edit-mood-intensity');
        const editIntensityValue = document.getElementById('edit-intensity-value');
        
        if (editIntensitySlider && editIntensityValue) {
            editIntensitySlider.addEventListener('input', (e) => {
                editIntensityValue.textContent = e.target.value;
                this.updateEditMoodPreview();
            });
        }

        // Mood color picker
        const colorPicker = document.getElementById('mood-color');
        if (colorPicker) {
            colorPicker.addEventListener('input', () => {
                this.updateMoodPreview();
            });
        }

        // Edit Mood color picker
        const editColorPicker = document.getElementById('edit-mood-color');
        if (editColorPicker) {
            editColorPicker.addEventListener('input', () => {
                this.updateEditMoodPreview();
            });
        }

        // Mood effect selector
        const effectSelector = document.getElementById('mood-effect');
        if (effectSelector) {
            effectSelector.addEventListener('change', () => {
                this.toggleSecondaryColorVisibility();
                this.updateMoodPreview();
            });
        }

        // Edit Mood effect selector
        const editEffectSelector = document.getElementById('edit-mood-effect');
        if (editEffectSelector) {
            editEffectSelector.addEventListener('change', () => {
                this.toggleSecondaryColorVisibilityEdit();
                this.updateEditMoodPreview();
            });
        }

        // Secondary color pickers
        const secondaryColorPicker = document.getElementById('mood-color-secondary');
        if (secondaryColorPicker) {
            secondaryColorPicker.addEventListener('input', () => {
                this.updateMoodPreview();
            });
        }

        const editSecondaryColorPicker = document.getElementById('edit-mood-color-secondary');
        if (editSecondaryColorPicker) {
            editSecondaryColorPicker.addEventListener('input', () => {
                this.updateEditMoodPreview();
            });
        }

        // Mood name input
        const nameInput = document.getElementById('mood-name');
        if (nameInput) {
            nameInput.addEventListener('input', () => {
                this.updateMoodPreview();
            });
        }

        // Edit Mood name input
        const editNameInput = document.getElementById('edit-mood-name');
        if (editNameInput) {
            editNameInput.addEventListener('input', () => {
                this.updateEditMoodPreview();
            });
        }

        // Mood play buttons
        const playBtn = document.getElementById('mood-play-btn');
        if (playBtn) {
            playBtn.addEventListener('click', () => {
                if (this.currentMood) {
                    this.app.getMusicPlayer().playMood(this.currentMood, false);
                }
            });
        }

        const shuffleBtn = document.getElementById('mood-shuffle-btn');
        if (shuffleBtn) {
            shuffleBtn.addEventListener('click', () => {
                if (this.currentMood) {
                    this.app.getMusicPlayer().playMood(this.currentMood, true);
                }
            });
        }
    }

    toggleSecondaryColorVisibility() {
        const effect = document.getElementById('mood-effect').value;
        const secondaryGroup = document.getElementById('secondary-color-group');
        if (secondaryGroup) {
            secondaryGroup.style.display = (effect === 'gradient' || effect === 'glow') ? 'block' : 'none';
        }
    }

    toggleSecondaryColorVisibilityEdit() {
        const effect = document.getElementById('edit-mood-effect').value;
        const secondaryGroup = document.getElementById('edit-secondary-color-group');
        if (secondaryGroup) {
            secondaryGroup.style.display = (effect === 'gradient' || effect === 'glow') ? 'block' : 'none';
        }
    }

    showAddMoodModal() {
        // Reset form
        document.getElementById('mood-name').value = '';
        document.getElementById('mood-color').value = '#847cf7';
        document.getElementById('mood-color-secondary').value = '#ff6b6b';
        document.getElementById('mood-effect').value = 'none';
        document.getElementById('mood-intensity').value = '5';
        document.getElementById('intensity-value').textContent = '5';

        // Hide secondary color initially
        this.toggleSecondaryColorVisibility();

        // Update preview
        this.updateMoodPreview();

        // Show modal
        this.app.getUIManager().showModal('add-mood-modal');
    }

    hideAddMoodModal() {
        this.app.getUIManager().hideModal();
    }
    
    showEditMoodModal(mood) {
        this.currentEditMood = mood;

        // Fill form with current mood data
        document.getElementById('edit-mood-name').value = mood.name;
        document.getElementById('edit-mood-color').value = mood.color;
        document.getElementById('edit-mood-color-secondary').value = mood.colorSecondary || '#ff6b6b';
        document.getElementById('edit-mood-effect').value = mood.effect || 'none';
        document.getElementById('edit-mood-intensity').value = mood.intensity || 5;
        document.getElementById('edit-intensity-value').textContent = mood.intensity || 5;

        // Show/hide secondary color based on effect
        this.toggleSecondaryColorVisibilityEdit();

        // Update statistics
        document.getElementById('edit-mood-track-count').textContent = mood.tracks ? mood.tracks.length : 0;
        document.getElementById('edit-mood-created').textContent = new Date(mood.createdAt).toLocaleDateString('de-DE');
        document.getElementById('edit-mood-updated').textContent = new Date(mood.updatedAt || mood.createdAt).toLocaleDateString('de-DE');

        // Update preview
        this.updateEditMoodPreview();

        // Show modal
        this.app.getUIManager().showModal('edit-mood-modal');
    }
    
    hideEditMoodModal() {
        this.currentEditMood = null;
        this.app.getUIManager().hideModal();
    }
    
    async updateMood() {
        if (!this.currentEditMood) return;

        const name = document.getElementById('edit-mood-name').value.trim();
        const color = document.getElementById('edit-mood-color').value;
        const colorSecondary = document.getElementById('edit-mood-color-secondary').value;
        const effect = document.getElementById('edit-mood-effect').value;
        const intensity = parseInt(document.getElementById('edit-mood-intensity').value);

        if (!name) {
            this.app.showNotification('Bitte geben Sie einen Namen ein', 'error');
            return;
        }

        // Check for duplicate names (exclude current mood)
        if (this.moods.some(mood => mood.id !== this.currentEditMood.id && mood.name.toLowerCase() === name.toLowerCase())) {
            this.app.showNotification('Eine Mood mit diesem Namen existiert bereits', 'error');
            return;
        }

        // Update mood object
        this.currentEditMood.name = name;
        this.currentEditMood.color = color;
        this.currentEditMood.colorSecondary = colorSecondary;
        this.currentEditMood.effect = effect;
        this.currentEditMood.intensity = intensity;
        this.currentEditMood.updatedAt = Date.now();

        // Update UI
        this.app.getUIManager().updateMoodsList();

        if (this.currentMood && this.currentMood.id === this.currentEditMood.id) {
            this.currentMood = this.currentEditMood;
            this.app.getUIManager().updateMoodContent(this.currentMood);
        }

        this.hideEditMoodModal();
        this.app.showNotification('Mood erfolgreich aktualisiert', 'success');

        await this.app.saveData();
    }
    
    async deleteCurrentMood() {
        if (!this.currentEditMood) return;
        
        const confirmed = confirm(`Möchten Sie die Mood "${this.currentEditMood.name}" wirklich löschen?\n\nDies kann nicht rückgängig gemacht werden.`);
        if (!confirmed) return;
        
        await this.deleteMood(this.currentEditMood.id);
        this.hideEditMoodModal();
    }

    async saveMood() {
        const name = document.getElementById('mood-name').value.trim();
        const color = document.getElementById('mood-color').value;
        const colorSecondary = document.getElementById('mood-color-secondary').value;
        const effect = document.getElementById('mood-effect').value;
        const intensity = parseInt(document.getElementById('mood-intensity').value);

        if (!name) {
            this.app.showNotification('Bitte geben Sie einen Namen ein', 'error');
            return;
        }

        // Check for duplicate names
        if (this.moods.some(mood => mood.name.toLowerCase() === name.toLowerCase())) {
            this.app.showNotification('Eine Mood mit diesem Namen existiert bereits', 'error');
            return;
        }

        const mood = {
            id: this.generateId(),
            name,
            color,
            colorSecondary,
            effect,
            intensity,
            tracks: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        this.moods.push(mood);
        this.app.getUIManager().updateMoodsList();
        this.hideAddMoodModal();
        this.app.showNotification('Mood erfolgreich erstellt', 'success');

        await this.app.saveData();
    }

    selectMood(moodId) {
        const mood = this.getMoodById(moodId);
        if (!mood) return;

        this.currentMood = mood;
        this.app.getUIManager().setActiveMood(moodId);
        this.app.getUIManager().updateMoodContent(mood);
    }

    async deleteMood(moodId) {
        const mood = this.getMoodById(moodId);
        if (!mood) return;

        if (!confirm(`Möchten Sie die Mood "${mood.name}" wirklich löschen?`)) {
            return;
        }

        this.moods = this.moods.filter(m => m.id !== moodId);
        
        if (this.currentMood && this.currentMood.id === moodId) {
            this.currentMood = null;
            this.app.getUIManager().clearMoodContent();
        }

        this.app.getUIManager().updateMoodsList();
        this.app.showNotification('Mood gelöscht', 'success');
        
        await this.app.saveData();
    }

    async addTracksToMood(moodId, trackIds) {
        const mood = this.getMoodById(moodId);
        if (!mood) return;

        const library = this.app.getMusicPlayer().getLibrary();
        const newTracks = [];

        trackIds.forEach(trackId => {
            const track = library.find(t => t.id === trackId);
            if (track && !mood.tracks.some(t => t.id === trackId)) {
                newTracks.push(track);
                mood.tracks.push(track);
            }
        });

        if (newTracks.length > 0) {
            mood.updatedAt = Date.now();
            this.app.getUIManager().updateMoodsList();
            
            if (this.currentMood && this.currentMood.id === moodId) {
                this.app.getUIManager().updateMoodContent(mood);
            }

            this.app.showNotification(`${newTracks.length} Titel zur Mood hinzugefügt`, 'success');
            await this.app.saveData();
        }
    }

    async removeTrackFromMood(moodId, trackId) {
        const mood = this.getMoodById(moodId);
        if (!mood) return;

        mood.tracks = mood.tracks.filter(t => t.id !== trackId);
        mood.updatedAt = Date.now();

        this.app.getUIManager().updateMoodsList();
        
        if (this.currentMood && this.currentMood.id === moodId) {
            this.app.getUIManager().updateMoodContent(mood);
        }

        await this.app.saveData();
    }

    async updateMoodData(moodId, updates) {
        const mood = this.getMoodById(moodId);
        if (!mood) return;

        Object.assign(mood, updates, { updatedAt: Date.now() });

        this.app.getUIManager().updateMoodsList();

        if (this.currentMood && this.currentMood.id === moodId) {
            this.currentMood = mood;
            this.app.getUIManager().updateMoodContent(mood);
        }

        await this.app.saveData();
    }

    // Drag and drop support
    handleTrackDrop(moodId, trackIds) {
        this.addTracksToMood(moodId, trackIds);
    }
    
    async addTrackToMood(moodId, trackPath) {
        const mood = this.getMoodById(moodId);
        if (!mood) return;
        
        // Check if track is already in mood
        if (mood.tracks.some(t => t.path === trackPath)) {
            return; // Already exists
        }
        
        // Find track in library
        const library = this.app.getMusicPlayer().getLibrary();
        const track = library.find(t => t.path === trackPath);
        
        if (track) {
            mood.tracks.push(track);
            mood.updatedAt = Date.now();
            
            this.app.getUIManager().updateMoodsList();
            
            if (this.currentMood && this.currentMood.id === moodId) {
                this.app.getUIManager().updateMoodContent(mood);
            }
            
            await this.app.saveData();
        }
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getMoodById(id) {
        return this.moods.find(mood => mood.id === id);
    }

    getMoods() {
        return this.moods;
    }

    setMoods(moods) {
        this.moods = moods || [];
    }

    getCurrentMood() {
        return this.currentMood;
    }

    searchMoods(query) {
        const lowercaseQuery = query.toLowerCase();
        return this.moods.filter(mood => 
            mood.name.toLowerCase().includes(lowercaseQuery)
        );
    }

    getMoodsByEffect(effect) {
        return this.moods.filter(mood => mood.effect === effect);
    }

    getMoodsByColor(color) {
        return this.moods.filter(mood => mood.color === color);
    }

    // Effect utilities
    getEffectCSS(effect, intensity, color) {
        const normalizedIntensity = intensity / 10;
        
        switch (effect) {
            case 'pulse':
                return {
                    animation: `pulse ${2 / normalizedIntensity}s infinite`,
                    animationTimingFunction: 'ease-in-out'
                };
                
            case 'wave':
                return {
                    animation: `wave ${3 / normalizedIntensity}s infinite`,
                    animationTimingFunction: 'ease-in-out'
                };
                
            case 'glow':
                const glowIntensity = normalizedIntensity * 20;
                return {
                    animation: `glow ${2 / normalizedIntensity}s infinite`,
                    filter: `drop-shadow(0 0 ${glowIntensity}px ${color})`
                };
                
            case 'gradient':
                const angle = normalizedIntensity * 360;
                return {
                    background: `linear-gradient(${angle}deg, ${color} 0%, transparent 100%)`,
                    animation: `gradientShift ${4 / normalizedIntensity}s infinite`
                };
                
            default:
                return {};
        }
    }

    // Statistics
    getMoodStats() {
        return {
            totalMoods: this.moods.length,
            totalTracks: this.moods.reduce((sum, mood) => sum + mood.tracks.length, 0),
            averageTracksPerMood: this.moods.length > 0 ? 
                Math.round(this.moods.reduce((sum, mood) => sum + mood.tracks.length, 0) / this.moods.length) : 0,
            mostPopularEffect: this.getMostPopularEffect(),
            oldestMood: this.getOldestMood(),
            newestMood: this.getNewestMood()
        };
    }

    getMostPopularEffect() {
        const effectCounts = {};
        this.moods.forEach(mood => {
            effectCounts[mood.effect] = (effectCounts[mood.effect] || 0) + 1;
        });
        
        let mostPopular = 'none';
        let maxCount = 0;
        
        Object.entries(effectCounts).forEach(([effect, count]) => {
            if (count > maxCount) {
                maxCount = count;
                mostPopular = effect;
            }
        });
        
        return mostPopular;
    }

    getOldestMood() {
        return this.moods.reduce((oldest, mood) => 
            !oldest || mood.createdAt < oldest.createdAt ? mood : oldest, null);
    }

    getNewestMood() {
        return this.moods.reduce((newest, mood) => 
            !newest || mood.createdAt > newest.createdAt ? mood : newest, null);
    }

    // Export/Import
    exportMoods() {
        const data = {
            moods: this.moods,
            exportedAt: Date.now(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `mood-music-moods-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        
        URL.revokeObjectURL(url);
        this.app.showNotification('Moods exportiert', 'success');
    }

    // Mood Preview for Edit Modal
    updateEditMoodPreview() {
        const preview = document.getElementById('edit-mood-preview');
        const previewText = preview?.querySelector('.mood-preview-text');
        const previewBackground = preview?.querySelector('.mood-preview-background');

        if (!preview || !previewText || !previewBackground) return;

        const name = document.getElementById('edit-mood-name').value.trim() || 'Mood bearbeiten';
        const color = document.getElementById('edit-mood-color').value;
        const colorSecondary = document.getElementById('edit-mood-color-secondary').value;
        const effect = document.getElementById('edit-mood-effect').value;
        const intensity = parseInt(document.getElementById('edit-mood-intensity').value);

        // Update text
        previewText.textContent = name;

        // Remove existing effect classes
        preview.className = 'mood-preview';

        // Set CSS custom properties
        preview.style.setProperty('--mood-color', color);
        preview.style.setProperty('--mood-color-secondary', colorSecondary);

        // Apply effect and intensity
        if (effect !== 'none') {
            preview.classList.add(`effect-${effect}`);

            // Apply intensity class
            const intensityClass = this.getIntensityClass(intensity);
            preview.classList.add(intensityClass);
        }

        // Update background color
        previewBackground.style.backgroundColor = color;
    }

    // Helper function to get contrasting text color
    getContrastColor(hexColor) {
        // Convert hex to RGB
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        // Calculate luminance
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        
        return luminance > 0.5 ? '#000000' : '#ffffff';
    }

    // Helper function to lighten a color
    lightenColor(hexColor, percent) {
        const r = parseInt(hexColor.slice(1, 3), 16);
        const g = parseInt(hexColor.slice(3, 5), 16);
        const b = parseInt(hexColor.slice(5, 7), 16);
        
        const newR = Math.min(255, Math.floor(r + (255 - r) * percent / 100));
        const newG = Math.min(255, Math.floor(g + (255 - g) * percent / 100));
        const newB = Math.min(255, Math.floor(b + (255 - b) * percent / 100));
        
        return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
    }

    // Mood Preview
    updateMoodPreview() {
        const preview = document.getElementById('mood-preview');
        const previewText = preview?.querySelector('.mood-preview-text');
        const previewBackground = preview?.querySelector('.mood-preview-background');

        if (!preview || !previewText || !previewBackground) return;

        const name = document.getElementById('mood-name').value.trim() || 'Meine neue Mood';
        const color = document.getElementById('mood-color').value;
        const colorSecondary = document.getElementById('mood-color-secondary').value;
        const effect = document.getElementById('mood-effect').value;
        const intensity = parseInt(document.getElementById('mood-intensity').value);

        // Update text
        previewText.textContent = name;

        // Remove existing effect classes
        preview.className = 'mood-preview';

        // Set CSS custom properties
        preview.style.setProperty('--mood-color', color);
        preview.style.setProperty('--mood-color-secondary', colorSecondary);

        // Apply effect and intensity
        if (effect !== 'none') {
            preview.classList.add(`effect-${effect}`);

            // Apply intensity class
            const intensityClass = this.getIntensityClass(intensity);
            preview.classList.add(intensityClass);
        }

        // Update background color
        previewBackground.style.backgroundColor = color;
    }
    
    getIntensityClass(intensity) {
        if (intensity >= 8) return 'intensity-high';
        if (intensity >= 5) return 'intensity-medium';
        return 'intensity-low';
    }
    
    async importMoods(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (!data.moods || !Array.isArray(data.moods)) {
                throw new Error('Invalid file format');
            }

            let imported = 0;
            data.moods.forEach(mood => {
                // Check if mood already exists
                if (!this.moods.some(existing => existing.name === mood.name)) {
                    mood.id = this.generateId(); // Generate new ID
                    mood.importedAt = Date.now();
                    this.moods.push(mood);
                    imported++;
                }
            });

            if (imported > 0) {
                this.app.getUIManager().updateMoodsList();
                await this.app.saveData();
                this.app.showNotification(`${imported} Moods importiert`, 'success');
            } else {
                this.app.showNotification('Keine neuen Moods gefunden', 'warning');
            }
        } catch (error) {
            console.error('Error importing moods:', error);
            this.app.showNotification('Fehler beim Importieren der Moods', 'error');
        }
    }
}
