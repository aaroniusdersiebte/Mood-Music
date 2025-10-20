// Music Player Component
class MusicPlayer {
    constructor(app) {
        this.app = app;
        this.audio = null;
        this.library = [];
        this.currentPlaylist = [];
        this.currentIndex = 0;
        this.isShuffled = false;
        this.repeatMode = 'none'; // none, one, all
        this.currentMood = null;
        this.fadeTimeouts = [];
        
        this.initializePlayer();
    }

    initializePlayer() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupPlayer());
        } else {
            this.setupPlayer();
        }
    }

    setupPlayer() {
        this.audio = document.getElementById('audio-player');
        if (!this.audio) {
            console.error('Audio element not found! Retrying in 100ms...');
            setTimeout(() => this.setupPlayer(), 100);
            return;
        }
        
        this.setupAudioEvents();
        this.setupPlayerControls();
    }

    setupAudioEvents() {
        if (!this.audio) {
            console.error('Cannot setup audio events: audio element not found');
            return;
        }

        this.audio.addEventListener('loadedmetadata', () => {
            if (this.app && this.app.onTimeUpdate) {
                this.app.onTimeUpdate(0, this.audio.duration);
            }
        });

        this.audio.addEventListener('timeupdate', () => {
            if (this.app && this.app.onTimeUpdate) {
                this.app.onTimeUpdate(this.audio.currentTime, this.audio.duration);
            }
        });

        this.audio.addEventListener('ended', () => {
            this.handleTrackEnd();
        });

        this.audio.addEventListener('error', (e) => {
            console.error('Audio error:', e);
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Fehler beim Abspielen der Datei', 'error');
            }
            this.nextTrack();
        });

        this.audio.addEventListener('canplay', () => {
            // Auto-play if we have a track queued
            if (this.audio.src && this.app && this.app.isPlaying) {
                this.audio.play().catch(console.error);
            }
        });
    }

    setupPlayerControls() {
        // Play/Pause button
        const playPauseBtn = document.getElementById('play-pause-btn');
        if (playPauseBtn) {
            playPauseBtn.addEventListener('click', () => {
                this.togglePlayPause();
            });
        }

        // Previous/Next buttons
        const prevBtn = document.getElementById('prev-btn');
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                this.previousTrack();
            });
        }

        const nextBtn = document.getElementById('next-btn');
        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                this.nextTrack();
            });
        }

        // Volume control
        const volumeSlider = document.getElementById('volume-slider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                const volume = e.target.value / 100;
                this.setVolume(volume);
            });
        }

        // Progress control
        const progressSlider = document.getElementById('progress-slider');
        if (progressSlider) {
            progressSlider.addEventListener('input', (e) => {
                if (this.audio && this.audio.duration) {
                    const time = (e.target.value / 100) * this.audio.duration;
                    this.seekTo(time);
                }
            });
        }

        // Set initial volume
        if (this.app && this.app.getConfig) {
            const config = this.app.getConfig();
            if (config && config.audio && config.audio.volume !== undefined) {
                this.setVolume(config.audio.volume);
            }
        }
    }

    async addFiles(filePaths) {
        const newTracks = [];
        
        for (const filePath of filePaths) {
            try {
                const metadata = await window.ipcRenderer.invoke('get-music-metadata', filePath);
                const track = {
                    id: this.generateId(),
                    path: filePath,
                    title: metadata.title,
                    artist: metadata.artist,
                    album: metadata.album,
                    duration: metadata.duration,
                    year: metadata.year,
                    genre: metadata.genre,
                    picture: metadata.picture,
                    addedAt: Date.now()
                };
                
                newTracks.push(track);
                this.library.push(track);
            } catch (error) {
                console.error('Error adding file:', filePath, error);
                this.app.showNotification(`Fehler beim Hinzufügen: ${filePath}`, 'error');
            }
        }

        if (newTracks.length > 0) {
            this.app.showNotification(`${newTracks.length} Titel hinzugefügt`, 'success');
            this.app.getUIManager().updateLibraryStats();
            await this.app.saveData();
        }

        return newTracks;
    }

    async addFolder(folderPath) {
        const fs = window.require('fs').promises;
        const path = window.require('path');
        
        try {
            const files = await fs.readdir(folderPath);
            const audioFiles = files.filter(file => {
                const ext = path.extname(file).toLowerCase();
                return ['.mp3', '.wav', '.flac', '.ogg', '.m4a'].includes(ext);
            });
            
            const filePaths = audioFiles.map(file => path.join(folderPath, file));
            return await this.addFiles(filePaths);
        } catch (error) {
            console.error('Error adding folder:', error);
            this.app.showNotification('Fehler beim Hinzufügen des Ordners', 'error');
            return [];
        }
    }

    playTrack(track, playlist = null, mood = null) {
        if (playlist) {
            this.currentPlaylist = [...playlist];
            this.currentIndex = playlist.findIndex(t => t.id === track.id);
        } else {
            this.currentPlaylist = [track];
            this.currentIndex = 0;
        }

        this.currentMood = mood;
        this.loadAndPlayTrack(track);
    }

    playMood(mood, shuffle = true) {
        const tracks = mood.tracks || [];
        if (tracks.length === 0) {
            this.app.showNotification('Diese Mood enthält keine Titel', 'warning');
            return;
        }

        this.currentPlaylist = [...tracks];
        this.currentMood = mood;
        
        if (shuffle) {
            this.shufflePlaylist();
        }
        
        this.currentIndex = 0;
        this.loadAndPlayTrack(this.currentPlaylist[0]);
    }

    loadAndPlayTrack(track) {
        if (!track) return;

        // Stop current playback with fade
        this.fadeOut(() => {
            this.audio.src = `file://${track.path}`;
            this.audio.load();
            
            // Notify app of track change
            this.app.onTrackChanged(track, this.currentMood);
            
            // Start playback
            this.play();
        });
    }

    play() {
        if (!this.audio) {
            console.error('Cannot play: audio element not available');
            return;
        }

        this.audio.play().then(() => {
            if (this.app && this.app.onPlaybackStateChanged) {
                this.app.onPlaybackStateChanged(true);
            }
            this.fadeIn();
        }).catch(error => {
            console.error('Error playing audio:', error);
            if (this.app && this.app.showNotification) {
                this.app.showNotification('Fehler beim Abspielen', 'error');
            }
        });
    }

    pause() {
        if (this.audio) {
            this.audio.pause();
        }
        if (this.app && this.app.onPlaybackStateChanged) {
            this.app.onPlaybackStateChanged(false);
        }
    }

    togglePlayPause() {
        if (!this.audio) {
            console.error('Cannot toggle play/pause: audio element not available');
            return;
        }

        if (this.audio.paused) {
            this.play();
        } else {
            this.pause();
        }
    }

    nextTrack() {
        if (this.currentPlaylist.length === 0) return;

        if (this.repeatMode === 'one') {
            this.loadAndPlayTrack(this.currentPlaylist[this.currentIndex]);
            return;
        }

        this.currentIndex++;
        
        if (this.currentIndex >= this.currentPlaylist.length) {
            if (this.repeatMode === 'all') {
                this.currentIndex = 0;
            } else {
                this.pause();
                return;
            }
        }

        this.loadAndPlayTrack(this.currentPlaylist[this.currentIndex]);
    }

    previousTrack() {
        if (this.currentPlaylist.length === 0) return;

        // If we're more than 3 seconds into the track, restart it
        if (this.audio.currentTime > 3) {
            this.seekTo(0);
            return;
        }

        this.currentIndex--;
        
        if (this.currentIndex < 0) {
            if (this.repeatMode === 'all') {
                this.currentIndex = this.currentPlaylist.length - 1;
            } else {
                this.currentIndex = 0;
                this.seekTo(0);
                return;
            }
        }

        this.loadAndPlayTrack(this.currentPlaylist[this.currentIndex]);
    }

    handleTrackEnd() {
        if (this.app.getConfig().general.autoAdvance) {
            this.nextTrack();
        } else {
            this.app.onPlaybackStateChanged(false);
        }
    }

    seekTo(time) {
        if (this.audio.duration) {
            this.audio.currentTime = Math.max(0, Math.min(time, this.audio.duration));
        }
    }

    setVolume(volume) {
        volume = Math.max(0, Math.min(1, volume));
        if (this.audio) {
            this.audio.volume = volume;
        }
        if (this.app && this.app.onVolumeChanged) {
            this.app.onVolumeChanged(volume);
        }
    }

    changeVolume(delta) {
        this.setVolume(this.audio.volume + delta);
    }

    shufflePlaylist() {
        // Fisher-Yates shuffle
        for (let i = this.currentPlaylist.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.currentPlaylist[i], this.currentPlaylist[j]] = [this.currentPlaylist[j], this.currentPlaylist[i]];
        }
        this.currentIndex = 0;
    }

    fadeOut(callback) {
        this.clearFadeTimeouts();
        
        const fadeTime = this.app.getConfig().audio.fadeTime * 1000;
        const startVolume = this.audio.volume;
        const steps = 20;
        const stepTime = fadeTime / steps;
        const volumeStep = startVolume / steps;
        
        let currentStep = 0;
        
        const fadeInterval = setInterval(() => {
            currentStep++;
            this.audio.volume = Math.max(0, startVolume - (volumeStep * currentStep));
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                this.audio.volume = 0;
                if (callback) callback();
            }
        }, stepTime);
        
        this.fadeTimeouts.push(fadeInterval);
    }

    fadeIn() {
        this.clearFadeTimeouts();
        
        const fadeTime = this.app.getConfig().audio.fadeTime * 1000;
        const targetVolume = this.app.getConfig().audio.volume;
        const steps = 20;
        const stepTime = fadeTime / steps;
        const volumeStep = targetVolume / steps;
        
        let currentStep = 0;
        this.audio.volume = 0;
        
        const fadeInterval = setInterval(() => {
            currentStep++;
            this.audio.volume = Math.min(targetVolume, volumeStep * currentStep);
            
            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                this.audio.volume = targetVolume;
            }
        }, stepTime);
        
        this.fadeTimeouts.push(fadeInterval);
    }

    clearFadeTimeouts() {
        this.fadeTimeouts.forEach(timeout => clearInterval(timeout));
        this.fadeTimeouts = [];
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    getCurrentTrack() {
        return this.currentPlaylist[this.currentIndex] || null;
    }

    getLibrary() {
        return this.library;
    }

    setLibrary(library) {
        this.library = library || [];
    }

    searchLibrary(query) {
        const lowercaseQuery = query.toLowerCase();
        return this.library.filter(track => 
            track.title.toLowerCase().includes(lowercaseQuery) ||
            track.artist.toLowerCase().includes(lowercaseQuery) ||
            track.album.toLowerCase().includes(lowercaseQuery)
        );
    }

    removeTrack(trackId) {
        this.library = this.library.filter(track => track.id !== trackId);
        this.app.getUIManager().updateLibraryStats();
        this.app.saveData();
    }

    getTrackById(id) {
        return this.library.find(track => track.id === id);
    }
    
    addTrackToLibrary(track) {
        // Check if track already exists in library
        const existingTrack = this.library.find(t => t.path === track.path);
        if (existingTrack) {
            return existingTrack;
        }

        // Add ID if not present
        if (!track.id) {
            track.id = this.generateId();
        }

        // Add timestamp if not present
        if (!track.addedAt) {
            track.addedAt = Date.now();
        }

        this.library.push(track);
        return track;
    }

    updateTrackInLibrary(track) {
        const index = this.library.findIndex(t => t.id === track.id);
        if (index !== -1) {
            this.library[index] = track;

            // Update track in current playlist if it's there
            const playlistIndex = this.currentPlaylist.findIndex(t => t.id === track.id);
            if (playlistIndex !== -1) {
                this.currentPlaylist[playlistIndex] = track;
            }

            // Update in all moods
            this.app.getMoodManager().getMoods().forEach(mood => {
                const moodTrackIndex = mood.tracks.findIndex(t => t.id === track.id);
                if (moodTrackIndex !== -1) {
                    mood.tracks[moodTrackIndex] = track;
                }
            });
        }
    }
}
