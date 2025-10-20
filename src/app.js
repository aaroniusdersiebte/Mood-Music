// Main Application Controller
class MoodMusicApp {
    constructor() {
        this.config = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;

        // Initialize components
        this.storage = new StorageUtils();
        this.audioUtils = new AudioUtils();
        this.musicPlayer = new MusicPlayer(this);
        this.moodManager = new MoodManager(this);
        this.metadataManager = new MetadataManager(this);
        this.uiManager = new UIManager(this);

        this.init();
    }

    async init() {
        try {
            await this.loadConfig();
            await this.loadData();
            this.setupEventListeners();
            this.applyTheme();

            // Register global hotkeys
            await this.registerHotkeys();

            console.log('Mood Music Player initialized');
        } catch (error) {
            console.error('Error during initialization:', error);
            this.showNotification('Fehler beim Initialisieren der App', 'error');
        }
    }

    async loadConfig() {
        try {
            this.config = await window.ipcRenderer.invoke('get-config');
            console.log('Config loaded:', this.config);
        } catch (error) {
            console.error('Error loading config:', error);
            // Fallback config
            this.config = this.getDefaultConfig();
        }
    }

    async saveConfig() {
        this.config = await window.ipcRenderer.invoke('save-config', this.config);
    }

    async registerHotkeys() {
        if (!this.config || !this.config.hotkeys) {
            console.warn('No hotkeys configured');
            return;
        }

        try {
            await window.ipcRenderer.invoke('register-hotkeys', this.config.hotkeys);
            console.log('Hotkeys registered successfully');
        } catch (error) {
            console.error('Error registering hotkeys:', error);
            this.showNotification('Fehler beim Registrieren der Hotkeys', 'error');
        }
    }

    async loadData() {
        // Load moods and library from local storage
        const data = await this.storage.loadAll();
        this.moodManager.setMoods(data.moods || []);
        this.musicPlayer.setLibrary(data.library || []);

        // Load image library
        this.metadataManager.loadImageLibrary();

        // Update UI
        this.uiManager.updateMoodsList();
        this.uiManager.updateLibraryStats();
    }

    async saveData() {
        const data = {
            moods: this.moodManager.getMoods(),
            library: this.musicPlayer.getLibrary(),
            lastUpdated: Date.now()
        };
        
        await this.storage.saveAll(data);
    }

    setupEventListeners() {
        // Setup drag and drop for the entire application
        this.setupDragAndDrop();

        // Listen for global hotkey events from main process
        if (window.ipcRenderer && window.ipcRenderer.on) {
            window.ipcRenderer.on('hotkey-triggered', (event, action, data) => {
                console.log('Hotkey triggered:', action, data);
                this.handleHotkeyAction(action, data);
            });
        }

        // Global keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    this.musicPlayer.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.musicPlayer.previousTrack();
                    }
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.musicPlayer.nextTrack();
                    }
                    break;
                case 'ArrowUp':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.musicPlayer.changeVolume(0.1);
                    }
                    break;
                case 'ArrowDown':
                    if (e.ctrlKey) {
                        e.preventDefault();
                        this.musicPlayer.changeVolume(-0.1);
                    }
                    break;
            }
        });

        // Auto-save on changes
        window.addEventListener('beforeunload', () => {
            this.saveData();
        });

        // Save data periodically
        setInterval(() => {
            this.saveData();
        }, 30000); // Every 30 seconds
    }

    handleHotkeyAction(action, data) {
        switch (action) {
            case 'play-pause':
                this.musicPlayer.togglePlayPause();
                this.showNotification('Play/Pause', 'info');
                break;

            case 'next':
                this.musicPlayer.nextTrack();
                this.showNotification('Next Track', 'info');
                break;

            case 'previous':
                this.musicPlayer.previousTrack();
                this.showNotification('Previous Track', 'info');
                break;

            case 'play-mood':
                if (data) {
                    const mood = this.moodManager.getMoodById(data);
                    if (mood) {
                        this.musicPlayer.playMood(mood, true);
                        this.showNotification(`Playing: ${mood.name}`, 'success');
                    } else {
                        this.showNotification('Mood nicht gefunden', 'error');
                    }
                }
                break;

            default:
                console.warn('Unknown hotkey action:', action);
        }
    }

    setupDragAndDrop() {
        const dropZones = [
            document.body, // Global drop zone
            document.getElementById('mood-content'), // Mood content area
            document.getElementById('tracks-container') // Tracks container
        ];

        dropZones.forEach(zone => {
            if (!zone) return;

            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, this.preventDefaults, false);
                document.body.addEventListener(eventName, this.preventDefaults, false);
            });

            // Highlight drop zone
            ['dragenter', 'dragover'].forEach(eventName => {
                zone.addEventListener(eventName, () => this.highlight(zone), false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
                zone.addEventListener(eventName, () => this.unhighlight(zone), false);
            });

            // Handle dropped files
            zone.addEventListener('drop', (e) => this.handleDrop(e, zone), false);
        });
    }

    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    highlight(element) {
        element.classList.add('drag-over');
        
        // Show drop indicator
        if (!document.getElementById('drop-indicator')) {
            const indicator = document.createElement('div');
            indicator.id = 'drop-indicator';
            indicator.innerHTML = `
                <div class="drop-indicator-content">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M9 16h6v-6h4l-7-7-7 7h4v6zm-4 2h14v2H5v-2z"/>
                    </svg>
                    <h3>Musik-Dateien hier ablegen</h3>
                    <p>MP3, WAV, FLAC, OGG, M4A werden unterstützt</p>
                </div>
            `;
            indicator.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(132, 124, 247, 0.1);
                border: 3px dashed var(--secondary-color);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                backdrop-filter: blur(5px);
                color: var(--secondary-color);
                text-align: center;
                pointer-events: none;
            `;
            document.body.appendChild(indicator);
        }
    }

    unhighlight(element) {
        element.classList.remove('drag-over');
        
        // Remove drop indicator
        const indicator = document.getElementById('drop-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    async handleDrop(e, dropZone) {
        const dt = e.dataTransfer;
        const files = Array.from(dt.files);
        
        if (files.length === 0) return;
        
        // Show loading notification
        this.showNotification('Dateien werden verarbeitet...', 'info');
        
        try {
            // Get file paths (in Electron, we can access the path)
            const filePaths = files.map(file => file.path).filter(path => path);
            
            if (filePaths.length === 0) {
                this.showNotification('Keine gültigen Dateipfade gefunden', 'error');
                return;
            }
            
            // Validate files first
            const validation = await window.ipcRenderer.invoke('validate-audio-files', filePaths);
            
            if (validation.invalidFiles.length > 0) {
                const invalidCount = validation.invalidFiles.length;
                this.showNotification(`${invalidCount} Datei(en) werden nicht unterstützt`, 'warning');
            }
            
            if (validation.validFiles.length === 0) {
                this.showNotification('Keine unterstützten Audio-Dateien gefunden', 'error');
                return;
            }
            
            // Determine target mood
            const currentMood = this.moodManager.getCurrentMood();
            const targetMoodId = currentMood ? currentMood.id : null;
            
            // Process files
            const processedFiles = await window.ipcRenderer.invoke(
                'process-dropped-files', 
                validation.validFiles, 
                targetMoodId
            );
            
            // Add to library
            for (const track of processedFiles) {
                this.musicPlayer.addTrackToLibrary(track);
                
                // If we have a target mood, add to that mood as well
                if (targetMoodId && currentMood) {
                    this.moodManager.addTrackToMood(currentMood.id, track.path);
                }
            }
            
            // Update UI
            this.uiManager.updateLibraryStats();
            if (currentMood) {
                this.uiManager.updateMoodContent(currentMood);
            }
            
            // Save data
            await this.saveData();
            
            // Show success notification
            const successMsg = processedFiles.length === 1 
                ? `1 Track hinzugefügt${targetMoodId ? ' zur aktuellen Mood' : ''}` 
                : `${processedFiles.length} Tracks hinzugefügt${targetMoodId ? ' zur aktuellen Mood' : ''}`;
            this.showNotification(successMsg, 'success');
            
        } catch (error) {
            console.error('Error handling dropped files:', error);
            this.showNotification('Fehler beim Verarbeiten der Dateien', 'error');
        }
    }

    applyTheme() {
        if (!this.config || !this.config.theme) {
            console.warn('Config or theme not available, using defaults');
            return;
        }
        
        const root = document.documentElement;
        root.style.setProperty('--primary-color', this.config.theme.primaryColor);
        root.style.setProperty('--secondary-color', this.config.theme.secondaryColor);
        root.style.setProperty('--accent-color', this.config.theme.accentColor);
        if (this.config.theme.borderRadius) {
            root.style.setProperty('--border-radius', this.config.theme.borderRadius);
        }
    }

    // Event handlers for components
    onTrackChanged(track, mood) {
        this.currentTrack = track;
        if (this.uiManager && this.uiManager.updateNowPlaying) {
            this.uiManager.updateNowPlaying(track, mood);
        }
        
        // Notify main process for OBS
        window.ipcRenderer.invoke('play-track', track, mood);
    }

    onPlaybackStateChanged(isPlaying) {
        this.isPlaying = isPlaying;
        if (this.uiManager && this.uiManager.updatePlaybackState) {
            this.uiManager.updatePlaybackState(isPlaying);
        }
        
        if (isPlaying) {
            window.ipcRenderer.invoke('resume-track');
        } else {
            window.ipcRenderer.invoke('pause-track');
        }
    }

    onTimeUpdate(currentTime, duration) {
        this.currentTime = currentTime;
        this.duration = duration;
        if (this.uiManager && this.uiManager.updateProgress) {
            this.uiManager.updateProgress(currentTime, duration);
        }
    }

    onVolumeChanged(volume) {
        if (this.config && this.config.audio) {
            this.config.audio.volume = volume;
        }
        if (this.uiManager && this.uiManager.updateVolumeSlider) {
            this.uiManager.updateVolumeSlider(volume);
        }
    }

    // Public API for components
    getConfig() {
        return this.config;
    }

    getMoodManager() {
        return this.moodManager;
    }

    getMusicPlayer() {
        return this.musicPlayer;
    }

    getUIManager() {
        return this.uiManager;
    }

    getMetadataManager() {
        return this.metadataManager;
    }

    // Utility methods
    getDefaultConfig() {
        return {
            theme: {
                primaryColor: '#121212',
                secondaryColor: '#847cf7',
                accentColor: '#ffffff',
                borderRadius: '8px'
            },
            general: {
                shuffleByDefault: false,
                autoAdvance: true
            },
            audio: {
                volume: 0.7,
                fadeTime: 3
            },
            obs: {
                port: 3000,
                alwaysShow: false,
                showDuration: 10,
                transitionTime: 5
            }
        };
    }

    formatTime(seconds) {
        if (!seconds || seconds === 0) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    showNotification(message, type = 'info') {
        // Create a simple notification system
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;
        
        const bgColor = type === 'error' ? '#ef4444' : 
                        type === 'success' ? '#22c55e' : 
                        type === 'warning' ? '#f59e0b' : 
                        'var(--secondary-color)';
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 16px 20px;
            background: ${bgColor};
            color: white;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            animation: slideIn 0.3s ease;
            min-width: 300px;
            max-width: 500px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, type === 'error' ? 5000 : 3000);
    }
    
    getNotificationIcon(type) {
        switch (type) {
            case 'success':
                return '✓';
            case 'error':
                return '✗';
            case 'warning':
                return '⚠';
            default:
                return 'ℹ';
        }
    }
}

// Add notification animations to CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're in Electron
    if (typeof window.require !== 'undefined') {
        window.ipcRenderer = window.require('electron').ipcRenderer;
    } else {
        // Fallback for development in browser
        window.ipcRenderer = {
            invoke: (channel, ...args) => {
                console.log(`IPC Mock: ${channel}`, ...args);
                return Promise.resolve();
            }
        };
    }
    
    // Start the application
    window.app = new MoodMusicApp();
});
