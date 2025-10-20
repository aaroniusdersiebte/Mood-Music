// UI Manager Component
class UIManager {
    constructor(app) {
        this.app = app;
        this.draggedTracks = [];
        this.contextMenuTarget = null;
        
        this.setupUI();
        this.setupModals();
        this.setupContextMenu();
        this.setupDragAndDrop();
    }

    setupUI() {
        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.showSettingsModal();
        });

        // Add music button
        document.getElementById('add-music-btn').addEventListener('click', () => {
            this.showAddMusicOptions();
        });

        // Show library button
        document.getElementById('show-library-btn').addEventListener('click', () => {
            this.showLibraryView();
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                this.hideModal();
            });
        });

        // Modal overlay click to close - Improved to prevent accidental closing during text selection
        const modalOverlay = document.getElementById('modal-overlay');
        let mouseDownTarget = null;

        modalOverlay.addEventListener('mousedown', (e) => {
            mouseDownTarget = e.target;
        });

        modalOverlay.addEventListener('click', (e) => {
            // Only close if both mousedown and click happened on the overlay itself (not on modal content)
            if (e.target === e.currentTarget && mouseDownTarget === e.currentTarget) {
                this.hideModal();
            }
            mouseDownTarget = null;
        });

        // Settings tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Copy OBS URL button
        document.getElementById('copy-obs-url').addEventListener('click', () => {
            this.copyOBSUrl();
        });

        // Setup hotkey inputs
        this.setupHotkeyInputs();
    }

    setupModals() {
        // Settings modal save/cancel
        document.getElementById('save-settings-btn').addEventListener('click', () => {
            this.saveSettings();
        });

        document.getElementById('cancel-settings-btn').addEventListener('click', () => {
            this.hideModal();
        });
    }

    setupContextMenu() {
        let contextMenu = document.getElementById('context-menu');
        
        // Hide context menu on click outside
        document.addEventListener('click', () => {
            contextMenu.style.display = 'none';
        });

        // Context menu actions
        contextMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.dataset.action;
            if (action && this.contextMenuTarget) {
                this.handleContextAction(action, this.contextMenuTarget);
            }
            contextMenu.style.display = 'none';
        });
    }

    setupDragAndDrop() {
        // Global drag and drop for files
        document.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
        });

        document.addEventListener('drop', (e) => {
            e.preventDefault();
            this.handleFileDrop(e);
        });
    }

    // Mood UI methods
    updateMoodsList() {
        const moodsList = document.getElementById('moods-list');
        const moods = this.app.getMoodManager().getMoods();
        
        moodsList.innerHTML = '';

        moods.forEach(mood => {
            const moodElement = this.createMoodElement(mood);
            moodsList.appendChild(moodElement);
        });
    }

    createMoodElement(mood) {
        const element = document.createElement('div');
        element.className = 'mood-item';
        element.dataset.moodId = mood.id;
        
        // Apply effect styling only if this mood is currently selected
        const isActive = this.app.getMoodManager().currentMood && this.app.getMoodManager().currentMood.id === mood.id;
        if (isActive) {
            const effectCSS = this.app.getMoodManager().getEffectCSS(mood.effect, mood.intensity, mood.color);
            Object.assign(element.style, effectCSS);
        }

        element.innerHTML = `
            <div class="mood-color" style="background-color: ${mood.color}"></div>
            <div class="mood-info">
                <div class="mood-name">${this.escapeHtml(mood.name)}</div>
                <div class="mood-count">${mood.tracks.length} Titel</div>
            </div>
            <button class="mood-play" data-action="play-mood">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </button>
        `;

        // Event listeners
        element.addEventListener('click', (e) => {
            if (e.target.closest('.mood-play')) {
                this.app.getMusicPlayer().playMood(mood, true);
            } else {
                this.app.getMoodManager().selectMood(mood.id);
            }
        });

        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, 'mood', mood);
        });

        // Enhanced Drag and drop support
        element.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            element.classList.add('drag-over');
        });

        element.addEventListener('dragleave', (e) => {
            // Only remove if actually leaving the element
            if (!element.contains(e.relatedTarget)) {
                element.classList.remove('drag-over');
            }
        });

        element.addEventListener('drop', (e) => {
            e.preventDefault();
            element.classList.remove('drag-over', 'drop-target');
            
            try {
                // Try to get track data from JSON first
                const trackData = e.dataTransfer.getData('application/json');
                if (trackData) {
                    const track = JSON.parse(trackData);
                    this.app.getMoodManager().addTracksToMood(mood.id, [track.id]);
                    this.app.showNotification(`"${track.title}" zu "${mood.name}" hinzugefügt`, 'success');
                } else {
                    // Fallback to plain text
                    const trackId = e.dataTransfer.getData('text/plain');
                    if (trackId) {
                        this.app.getMoodManager().addTracksToMood(mood.id, [trackId]);
                        this.app.showNotification(`Track zu "${mood.name}" hinzugefügt`, 'success');
                    }
                }
            } catch (error) {
                console.error('Error handling drop:', error);
                this.app.showNotification('Fehler beim Hinzufügen zur Mood', 'error');
            }
        });

        return element;
    }

    setActiveMood(moodId) {
        document.querySelectorAll('.mood-item').forEach(item => {
            const isActive = item.dataset.moodId === moodId;
            item.classList.toggle('active', isActive);
            
            // Apply or remove effect styling based on active state
            if (isActive && moodId) {
                const mood = this.app.getMoodManager().getMoodById(moodId);
                if (mood) {
                    const effectCSS = this.app.getMoodManager().getEffectCSS(mood.effect, mood.intensity, mood.color);
                    Object.assign(item.style, effectCSS);
                }
            } else {
                // Remove effect styling for inactive moods
                item.style.animation = '';
                item.style.filter = '';
                item.style.background = '';
                item.style.boxShadow = '';
            }
        });
    }

    updateMoodContent(mood) {
        const moodTitle = document.getElementById('mood-title');
        const moodPlayBtn = document.getElementById('mood-play-btn');
        const moodShuffleBtn = document.getElementById('mood-shuffle-btn');
        const tracksContainer = document.getElementById('tracks-container');

        moodTitle.textContent = mood.name;
        moodPlayBtn.style.display = mood.tracks.length > 0 ? 'flex' : 'none';
        moodShuffleBtn.style.display = mood.tracks.length > 0 ? 'flex' : 'none';

        this.updateTracksView(mood.tracks, mood);
    }

    clearMoodContent() {
        document.getElementById('mood-title').textContent = 'Wählen Sie eine Mood aus';
        document.getElementById('mood-play-btn').style.display = 'none';
        document.getElementById('mood-shuffle-btn').style.display = 'none';
        document.getElementById('tracks-container').innerHTML = `
            <div class="empty-state">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                </svg>
                <p>Wählen Sie eine Mood aus oder fügen Sie Musik hinzu</p>
            </div>
        `;
    }

    showLibraryView() {
        const library = this.app.getMusicPlayer().getLibrary();
        
        // Clear current mood selection
        this.app.getMoodManager().currentMood = null;
        this.setActiveMood(null);
        
        // Update header
        document.getElementById('mood-title').textContent = 'Gesamte Bibliothek';
        document.getElementById('mood-play-btn').style.display = library.length > 0 ? 'flex' : 'none';
        document.getElementById('mood-shuffle-btn').style.display = library.length > 0 ? 'flex' : 'none';
        
        // Update play button text for library
        const playBtn = document.getElementById('mood-play-btn');
        const shuffleBtn = document.getElementById('mood-shuffle-btn');
        
        playBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
            </svg>
            Alle abspielen
        `;
        
        shuffleBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46 20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z"/>
            </svg>
            Alle shuffeln
        `;
        
        // Setup library play buttons
        playBtn.onclick = () => {
            if (library.length > 0) {
                this.app.getMusicPlayer().playTrack(library[0], library);
            }
        };
        
        shuffleBtn.onclick = () => {
            if (library.length > 0) {
                const shuffledLibrary = [...library];
                // Fisher-Yates shuffle
                for (let i = shuffledLibrary.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [shuffledLibrary[i], shuffledLibrary[j]] = [shuffledLibrary[j], shuffledLibrary[i]];
                }
                this.app.getMusicPlayer().playTrack(shuffledLibrary[0], shuffledLibrary);
            }
        };
        
        // Show all tracks
        this.updateTracksView(library);
    }

    updateTracksView(tracks, mood = null) {
        const tracksContainer = document.getElementById('tracks-container');
        
        if (tracks.length === 0) {
            tracksContainer.innerHTML = `
                <div class="empty-state">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" opacity="0.3">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                    </svg>
                    <p>Keine Titel in dieser Mood</p>
                </div>
            `;
            return;
        }

        tracksContainer.innerHTML = '';
        
        tracks.forEach((track, index) => {
            const trackElement = this.createTrackElement(track, index + 1, mood);
            tracksContainer.appendChild(trackElement);
        });
    }

    createTrackElement(track, number, mood = null) {
        const element = document.createElement('div');
        element.className = 'track-item';
        element.dataset.trackId = track.id;
        element.draggable = true; // Make tracks draggable

        const currentTrack = this.app.getMusicPlayer().getCurrentTrack();
        if (currentTrack && currentTrack.id === track.id) {
            element.classList.add('playing');
        }

        element.innerHTML = `
            <div class="track-number">${number}</div>
            <button class="play-btn">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                </svg>
            </button>
            <div class="track-details">
                <div class="track-title">${this.escapeHtml(track.title)}</div>
                <div class="track-artist">${this.escapeHtml(track.artist)}</div>
            </div>
            <div class="track-duration">${this.app.formatTime(track.duration)}</div>
        `;

        // Event listeners
        element.addEventListener('click', (e) => {
            if (e.target.closest('.play-btn')) {
                if (mood) {
                    this.app.getMusicPlayer().playTrack(track, mood.tracks, mood);
                } else {
                    this.app.getMusicPlayer().playTrack(track);
                }
            }
        });

        element.addEventListener('dblclick', () => {
            if (mood) {
                this.app.getMusicPlayer().playTrack(track, mood.tracks, mood);
            } else {
                this.app.getMusicPlayer().playTrack(track);
            }
        });

        element.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.showContextMenu(e, 'track', { track, mood });
        });

        // Drag events
        element.addEventListener('dragstart', (e) => {
            this.draggedTracks = [track.id];
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('text/plain', track.id);
            e.dataTransfer.setData('application/json', JSON.stringify(track));
            
            // Visual feedback
            element.classList.add('dragging');
            
            // Add visual indicators to droppable moods
            document.querySelectorAll('.mood-item').forEach(moodItem => {
                moodItem.classList.add('drop-target');
            });
        });
        
        element.addEventListener('dragend', (e) => {
            element.classList.remove('dragging');
            
            // Remove drop indicators
            document.querySelectorAll('.mood-item').forEach(moodItem => {
                moodItem.classList.remove('drop-target', 'drag-over');
            });
        });

        return element;
    }

    // Player UI methods
    updateNowPlaying(track, mood) {
        const nowPlaying = document.getElementById('now-playing');
        const currentCover = document.getElementById('current-cover');
        const currentTitle = document.getElementById('current-title');
        const currentArtist = document.getElementById('current-artist');
        const currentAlbum = document.getElementById('current-album');

        nowPlaying.style.display = 'flex';

        // Get display metadata (custom or original)
        const displayMetadata = this.app.getMetadataManager().getDisplayMetadata(track);

        // Update cover art
        const coverToShow = displayMetadata.cover;
        if (coverToShow) {
            if (typeof coverToShow === 'string') {
                // Base64 or data URL
                currentCover.src = coverToShow;
            } else if (coverToShow.data) {
                // Blob data
                const blob = new Blob([coverToShow.data], { type: coverToShow.format });
                const url = URL.createObjectURL(blob);
                currentCover.src = url;
                currentCover.onload = () => URL.revokeObjectURL(url);
            }
        } else {
            currentCover.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iIzMzMzMzMyI+PHBhdGggZD0iTTEyIDN2MTAuNTVjLS41OS0uMzQtMS4yNy0uNTUtMi0uNTUtMi4yMSAwLTQgMS43OS00IDRzMS43OSA0IDQgNCA0LTEuNzkgNC00VjdoNFYzaC02eiIvPjwvc3ZnPg==';
        }

        currentTitle.textContent = displayMetadata.title;
        currentArtist.textContent = displayMetadata.artist;
        currentAlbum.textContent = displayMetadata.album;

        // Apply mood styling if available
        if (mood) {
            const effectCSS = this.app.getMoodManager().getEffectCSS(mood.effect, mood.intensity, mood.color);
            Object.assign(nowPlaying.style, {
                background: `linear-gradient(135deg, var(--primary-color) 0%, ${mood.color}20 100%)`,
                ...effectCSS
            });
        }
    }

    updatePlaybackState(isPlaying) {
        const playIcon = document.getElementById('play-icon');
        const pauseIcon = document.getElementById('pause-icon');
        
        if (isPlaying) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
        }

        // Update track items
        document.querySelectorAll('.track-item').forEach(item => {
            const currentTrack = this.app.getMusicPlayer().getCurrentTrack();
            const isCurrentTrack = currentTrack && item.dataset.trackId === currentTrack.id;
            item.classList.toggle('playing', isCurrentTrack && isPlaying);
        });
    }

    updateProgress(currentTime, duration) {
        const progressFill = document.getElementById('progress-fill');
        const progressSlider = document.getElementById('progress-slider');
        const currentTimeEl = document.getElementById('current-time');
        const durationTimeEl = document.getElementById('duration-time');

        const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
        
        progressFill.style.width = `${progress}%`;
        progressSlider.value = progress;
        
        currentTimeEl.textContent = this.app.formatTime(currentTime);
        durationTimeEl.textContent = this.app.formatTime(duration);
    }

    updateVolumeSlider(volume) {
        const volumeSlider = document.getElementById('volume-slider');
        volumeSlider.value = volume * 100;
    }

    updateLibraryStats() {
        const totalTracks = document.getElementById('total-tracks');
        const library = this.app.getMusicPlayer().getLibrary();
        totalTracks.textContent = `${library.length} Tracks`;
    }

    // Modal methods
    showModal(modalId) {
        const overlay = document.getElementById('modal-overlay');
        const modal = document.getElementById(modalId);
        
        // Hide all modals first
        document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        
        overlay.style.display = 'flex';
        modal.style.display = 'block';
    }

    hideModal() {
        document.getElementById('modal-overlay').style.display = 'none';
    }

    showSettingsModal() {
        this.loadSettingsValues();
        this.showModal('settings-modal');
    }

    loadSettingsValues() {
        const config = this.app.getConfig();

        // General settings
        document.getElementById('shuffle-default').checked = config.general.shuffleByDefault;
        document.getElementById('auto-advance').checked = config.general.autoAdvance;

        // Audio settings
        document.getElementById('fade-time').value = config.audio.fadeTime;

        // OBS settings
        document.getElementById('obs-port').value = config.obs.port;
        document.getElementById('obs-always-show').checked = config.obs.alwaysShow;
        document.getElementById('obs-show-duration').value = config.obs.showDuration;
        document.getElementById('obs-transition-time').value = config.obs.transitionTime;
        document.getElementById('obs-url').textContent = `http://localhost:${config.obs.port}`;

        // Appearance settings
        document.getElementById('primary-color').value = config.theme.primaryColor;
        document.getElementById('secondary-color').value = config.theme.secondaryColor;

        // Hotkey settings
        this.loadHotkeySettings();
    }

    async saveSettings() {
        const config = this.app.getConfig();

        // General settings
        config.general.shuffleByDefault = document.getElementById('shuffle-default').checked;
        config.general.autoAdvance = document.getElementById('auto-advance').checked;

        // Audio settings
        config.audio.fadeTime = parseFloat(document.getElementById('fade-time').value);

        // OBS settings
        config.obs.port = parseInt(document.getElementById('obs-port').value);
        config.obs.alwaysShow = document.getElementById('obs-always-show').checked;
        config.obs.showDuration = parseInt(document.getElementById('obs-show-duration').value);
        config.obs.transitionTime = parseInt(document.getElementById('obs-transition-time').value);

        // Appearance settings
        config.theme.primaryColor = document.getElementById('primary-color').value;
        config.theme.secondaryColor = document.getElementById('secondary-color').value;

        // Hotkey settings
        this.saveHotkeySettings();

        await this.app.saveConfig();

        // Register hotkeys with the backend
        await this.app.registerHotkeys();

        this.app.applyTheme();
        this.hideModal();
        this.app.showNotification('Einstellungen gespeichert', 'success');
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-tab`);
        });
    }

    // Context menu methods
    showContextMenu(event, type, data) {
        const contextMenu = document.getElementById('context-menu');
        this.contextMenuTarget = { type, data };
        
        // Update context menu items based on type
        this.updateContextMenu(type, data);
        
        contextMenu.style.display = 'block';
        contextMenu.style.left = `${event.pageX}px`;
        contextMenu.style.top = `${event.pageY}px`;
        
        // Ensure menu stays within viewport
        const rect = contextMenu.getBoundingClientRect();
        if (rect.right > window.innerWidth) {
            contextMenu.style.left = `${event.pageX - rect.width}px`;
        }
        if (rect.bottom > window.innerHeight) {
            contextMenu.style.top = `${event.pageY - rect.height}px`;
        }
    }

    updateContextMenu(type, data) {
        const contextMenu = document.getElementById('context-menu');
        
        if (type === 'mood') {
            contextMenu.innerHTML = `
                <div class="context-item" data-action="play-mood">Mood abspielen</div>
                <div class="context-item" data-action="shuffle-mood">Mood shuffeln</div>
                <div class="context-item separator"></div>
                <div class="context-item" data-action="edit-mood">Bearbeiten</div>
                <div class="context-item" data-action="delete-mood">Löschen</div>
            `;
        } else if (type === 'track') {
            const moods = this.app.getMoodManager().getMoods();
            const moodOptions = moods.length > 0 ? 
                moods.map(mood => `<div class="context-item" data-action="add-to-specific-mood" data-mood-id="${mood.id}">Zu "${mood.name}" hinzufügen</div>`).join('') :
                '<div class="context-item disabled">Erst Mood erstellen</div>';
                
            contextMenu.innerHTML = `
                <div class="context-item" data-action="play-track">Abspielen</div>
                <div class="context-item separator"></div>
                <div class="context-item" data-action="show-add-to-mood">Zu Mood hinzufügen ►</div>
                ${moodOptions}
                <div class="context-item separator"></div>
                <div class="context-item" data-action="edit-metadata">Metadaten bearbeiten</div>
                <div class="context-item" data-action="show-info">Informationen</div>
                ${data.mood ? '<div class="context-item" data-action="remove-from-mood">Aus Mood entfernen</div>' : ''}
            `;
        }
    }

    handleContextAction(action, target) {
        const { type, data } = target;
        
        switch (action) {
            case 'play-mood':
                if (type === 'mood') {
                    this.app.getMusicPlayer().playMood(data, false);
                }
                break;
                
            case 'shuffle-mood':
                if (type === 'mood') {
                    this.app.getMusicPlayer().playMood(data, true);
                }
                break;
                
            case 'delete-mood':
                if (type === 'mood') {
                    this.app.getMoodManager().deleteMood(data.id);
                }
                break;
                
            case 'edit-mood':
                if (type === 'mood') {
                    this.app.getMoodManager().showEditMoodModal(data);
                }
                break;
                
            case 'play-track':
                if (type === 'track') {
                    this.app.getMusicPlayer().playTrack(data.track);
                }
                break;
                
            case 'add-to-specific-mood':
                if (type === 'track') {
                    const moodId = event.target.dataset.moodId;
                    if (moodId) {
                        this.app.getMoodManager().addTracksToMood(moodId, [data.track.id]);
                    }
                }
                break;
                
            case 'remove-from-mood':
                if (type === 'track' && data.mood) {
                    this.app.getMoodManager().removeTrackFromMood(data.mood.id, data.track.id);
                }
                break;
                
            case 'show-info':
                if (type === 'track') {
                    this.showTrackInfo(data.track);
                }
                break;

            case 'edit-metadata':
                if (type === 'track') {
                    this.showEditTrackMetadataModal(data.track);
                }
                break;
        }
    }

    // Drag and drop methods
    async handleFileDrop(event) {
        const files = Array.from(event.dataTransfer.files);
        const audioFiles = files.filter(file => {
            const type = file.type;
            return type.startsWith('audio/') || 
                   ['.mp3', '.wav', '.flac', '.ogg', '.m4a'].includes(file.name.toLowerCase().substr(file.name.lastIndexOf('.')));
        });

        if (audioFiles.length > 0) {
            const filePaths = audioFiles.map(file => file.path);
            await this.app.getMusicPlayer().addFiles(filePaths);
        }
    }

    // File operations
    async showAddMusicOptions() {
        const options = ['Dateien hinzufügen', 'Ordner hinzufügen'];
        const choice = await this.showChoice('Musik hinzufügen', options);
        
        if (choice === 0) {
            const filePaths = await window.ipcRenderer.invoke('select-music-files');
            if (filePaths && filePaths.length > 0) {
                await this.app.getMusicPlayer().addFiles(filePaths);
            }
        } else if (choice === 1) {
            const folderPath = await window.ipcRenderer.invoke('select-music-folder');
            if (folderPath) {
                await this.app.getMusicPlayer().addFolder(folderPath);
            }
        }
    }

    async showChoice(title, options) {
        return new Promise((resolve) => {
            // Create a simple choice dialog
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay';
            overlay.style.display = 'flex';
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-header">
                    <h3>${title}</h3>
                </div>
                <div class="modal-body">
                    ${options.map((option, index) => 
                        `<button class="btn choice-btn" data-choice="${index}" style="width: 100%; margin-bottom: 8px;">${option}</button>`
                    ).join('')}
                </div>
                <div class="modal-footer">
                    <button class="btn cancel-choice">Abbrechen</button>
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            const cleanup = () => {
                document.body.removeChild(overlay);
            };
            
            modal.addEventListener('click', (e) => {
                if (e.target.classList.contains('choice-btn')) {
                    const choice = parseInt(e.target.dataset.choice);
                    cleanup();
                    resolve(choice);
                } else if (e.target.classList.contains('cancel-choice')) {
                    cleanup();
                    resolve(-1);
                }
            });
        });
    }

    showTrackInfo(track) {
        // Create a track info modal
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'flex';
        
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-header">
                <h3>Track Information</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                <div class="track-info-grid" style="display: grid; grid-template-columns: 1fr 2fr; gap: 12px;">
                    <strong>Titel:</strong> <span>${this.escapeHtml(track.title)}</span>
                    <strong>Künstler:</strong> <span>${this.escapeHtml(track.artist)}</span>
                    <strong>Album:</strong> <span>${this.escapeHtml(track.album)}</span>
                    <strong>Dauer:</strong> <span>${this.app.formatTime(track.duration)}</span>
                    <strong>Jahr:</strong> <span>${track.year || 'Unbekannt'}</span>
                    <strong>Genre:</strong> <span>${track.genre.join(', ') || 'Unbekannt'}</span>
                    <strong>Pfad:</strong> <span style="word-break: break-all; font-family: monospace; font-size: 12px;">${track.path}</span>
                </div>
            </div>
        `;
        
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        const cleanup = () => {
            document.body.removeChild(overlay);
        };
        
        modal.querySelector('.modal-close').addEventListener('click', cleanup);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup();
        });
    }

    copyOBSUrl() {
        const url = document.getElementById('obs-url').textContent;
        navigator.clipboard.writeText(url).then(() => {
            this.app.showNotification('URL kopiert', 'success');
        }).catch(() => {
            this.app.showNotification('Fehler beim Kopieren', 'error');
        });
    }

    showEditTrackMetadataModal(track) {
        this.app.getMetadataManager().showEditTrackMetadataModal(track);
    }

    // Hotkey management methods
    setupHotkeyInputs() {
        // Basic player hotkeys
        const hotkeyInputs = document.querySelectorAll('.hotkey-input');
        hotkeyInputs.forEach(input => {
            input.addEventListener('keydown', (e) => {
                e.preventDefault();
                this.captureHotkey(input, e);
            });

            input.addEventListener('click', () => {
                input.value = 'Press a key combination...';
                input.dataset.hotkey = '';
            });
        });

        // Clear hotkey buttons
        document.querySelectorAll('.clear-hotkey').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.previousElementSibling;
                if (input && input.classList.contains('hotkey-input')) {
                    input.value = '';
                    input.dataset.hotkey = '';
                }
            });
        });

        // Add mood hotkey button
        const addMoodHotkeyBtn = document.getElementById('add-mood-hotkey');
        if (addMoodHotkeyBtn) {
            addMoodHotkeyBtn.addEventListener('click', () => {
                this.addMoodHotkey();
            });
        }
    }

    captureHotkey(input, event) {
        const modifiers = [];
        const key = event.key;

        // Skip if only modifier key is pressed
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
            return;
        }

        // Build modifier string
        if (event.ctrlKey) modifiers.push('Ctrl');
        if (event.shiftKey) modifiers.push('Shift');
        if (event.altKey) modifiers.push('Alt');
        if (event.metaKey) modifiers.push('Meta');

        // Format the key
        let displayKey = key;
        if (key === ' ') displayKey = 'Space';
        else if (key.length === 1) displayKey = key.toUpperCase();

        // Build hotkey string
        const hotkeyString = [...modifiers, displayKey].join('+');

        // Store and display
        input.value = hotkeyString;
        input.dataset.hotkey = JSON.stringify({
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey,
            key: event.code
        });

        input.blur();
    }

    populateMoodHotkeys() {
        const container = document.getElementById('mood-hotkeys-container');
        const config = this.app.getConfig();
        const moods = this.app.getMoodManager().getMoods();

        container.innerHTML = '';

        // Load existing mood hotkeys from config
        if (config.hotkeys && config.hotkeys.moods) {
            config.hotkeys.moods.forEach((moodHotkey, index) => {
                this.addMoodHotkey(moodHotkey, index);
            });
        }
    }

    addMoodHotkey(existingHotkey = null, index = null) {
        const container = document.getElementById('mood-hotkeys-container');
        const moods = this.app.getMoodManager().getMoods();
        const hotkeyIndex = index !== null ? index : container.children.length;

        const hotkeyItem = document.createElement('div');
        hotkeyItem.className = 'hotkey-item mood-hotkey-item';
        hotkeyItem.dataset.index = hotkeyIndex;

        // Create mood selector
        const moodSelect = document.createElement('select');
        moodSelect.className = 'mood-hotkey-select';
        moodSelect.innerHTML = '<option value="">Mood wählen...</option>';
        moods.forEach(mood => {
            const option = document.createElement('option');
            option.value = mood.id;
            option.textContent = mood.name;
            if (existingHotkey && existingHotkey.moodId === mood.id) {
                option.selected = true;
            }
            moodSelect.appendChild(option);
        });

        // Create hotkey input
        const hotkeyInput = document.createElement('input');
        hotkeyInput.type = 'text';
        hotkeyInput.className = 'hotkey-input mood-hotkey-input';
        hotkeyInput.readOnly = true;
        hotkeyInput.placeholder = 'Click to set hotkey...';

        if (existingHotkey && existingHotkey.hotkey) {
            hotkeyInput.value = existingHotkey.hotkeyDisplay || '';
            hotkeyInput.dataset.hotkey = JSON.stringify(existingHotkey.hotkey);
        }

        // Add event listeners to new input
        hotkeyInput.addEventListener('keydown', (e) => {
            e.preventDefault();
            this.captureHotkey(hotkeyInput, e);
        });

        hotkeyInput.addEventListener('click', () => {
            hotkeyInput.value = 'Press a key combination...';
            hotkeyInput.dataset.hotkey = '';
        });

        // Create remove button
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn small remove-mood-hotkey';
        removeBtn.textContent = '✕';
        removeBtn.addEventListener('click', () => {
            hotkeyItem.remove();
        });

        // Assemble the item
        hotkeyItem.appendChild(moodSelect);
        hotkeyItem.appendChild(hotkeyInput);
        hotkeyItem.appendChild(removeBtn);

        container.appendChild(hotkeyItem);
    }

    loadHotkeySettings() {
        const config = this.app.getConfig();

        // Default hotkeys structure
        if (!config.hotkeys) {
            config.hotkeys = {
                playPause: null,
                next: null,
                previous: null,
                moods: []
            };
        }

        // Load basic player hotkeys
        const playPauseInput = document.getElementById('hotkey-play-pause');
        const nextInput = document.getElementById('hotkey-next');
        const prevInput = document.getElementById('hotkey-previous');

        if (config.hotkeys.playPause) {
            playPauseInput.value = config.hotkeys.playPause.display || '';
            playPauseInput.dataset.hotkey = JSON.stringify(config.hotkeys.playPause);
        }

        if (config.hotkeys.next) {
            nextInput.value = config.hotkeys.next.display || '';
            nextInput.dataset.hotkey = JSON.stringify(config.hotkeys.next);
        }

        if (config.hotkeys.previous) {
            prevInput.value = config.hotkeys.previous.display || '';
            prevInput.dataset.hotkey = JSON.stringify(config.hotkeys.previous);
        }

        // Load mood hotkeys
        this.populateMoodHotkeys();
    }

    saveHotkeySettings() {
        const config = this.app.getConfig();

        if (!config.hotkeys) {
            config.hotkeys = {
                playPause: null,
                next: null,
                previous: null,
                moods: []
            };
        }

        // Save basic player hotkeys
        const playPauseInput = document.getElementById('hotkey-play-pause');
        const nextInput = document.getElementById('hotkey-next');
        const prevInput = document.getElementById('hotkey-previous');

        // Check if elements exist before accessing dataset
        config.hotkeys.playPause = (playPauseInput && playPauseInput.dataset.hotkey) ? {
            ...JSON.parse(playPauseInput.dataset.hotkey),
            display: playPauseInput.value
        } : null;

        config.hotkeys.next = (nextInput && nextInput.dataset.hotkey) ? {
            ...JSON.parse(nextInput.dataset.hotkey),
            display: nextInput.value
        } : null;

        config.hotkeys.previous = (prevInput && prevInput.dataset.hotkey) ? {
            ...JSON.parse(prevInput.dataset.hotkey),
            display: prevInput.value
        } : null;

        // Save mood hotkeys
        config.hotkeys.moods = [];
        document.querySelectorAll('.mood-hotkey-item').forEach(item => {
            const moodSelect = item.querySelector('.mood-hotkey-select');
            const hotkeyInput = item.querySelector('.mood-hotkey-input');

            if (moodSelect && hotkeyInput && moodSelect.value && hotkeyInput.dataset.hotkey) {
                config.hotkeys.moods.push({
                    moodId: moodSelect.value,
                    hotkey: JSON.parse(hotkeyInput.dataset.hotkey),
                    hotkeyDisplay: hotkeyInput.value
                });
            }
        });

        return config.hotkeys;
    }

    // Utility methods
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}
