// OBS Overlay JavaScript
class MoodMusicOverlay {
    constructor() {
        this.currentTrack = null;
        this.currentMood = null;
        this.isVisible = false;
        this.showTimeout = null;
        this.hideTimeout = null;
        this.progressInterval = null;
        this.particleInterval = null;
        this.visualizerInterval = null;
        
        // Settings (will be received from main app)
        this.settings = {
            alwaysShow: false,
            showDuration: 10000,
            transitionTime: 5000,
            enableParticles: true,
            enableVisualizer: true,
            position: 'bottom-left'
        };
        
        this.init();
    }

    init() {
        this.setupElements();
        this.connectToEventSource();
        this.setupVisualizer();
        this.startParticleSystem();
        
        console.log('Mood Music Overlay initialized');
    }

    setupElements() {
        this.overlay = document.getElementById('overlay');
        this.trackContainer = document.getElementById('track-container');
        this.albumArt = document.getElementById('album-art');
        this.effectLayer = document.getElementById('effect-layer');
        this.moodOverlay = document.getElementById('mood-overlay');
        this.trackTitle = document.getElementById('track-title');
        this.trackArtist = document.getElementById('track-artist');
        this.trackAlbum = document.getElementById('track-album');
        this.moodName = document.getElementById('mood-name');
        this.progressFill = document.getElementById('progress-fill');
        this.currentTime = document.getElementById('current-time');
        this.totalTime = document.getElementById('total-time');
        this.visualizer = document.getElementById('visualizer');
        this.particles = document.getElementById('particles');
        this.backgroundEffect = document.getElementById('background-effect');
    }

    connectToEventSource() {
        // Connect to Server-Sent Events from the main application
        this.eventSource = new EventSource('/events');
        
        this.eventSource.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleEvent(data.type, data.data);
            } catch (error) {
                console.error('Error parsing event data:', error);
            }
        };

        this.eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            // Attempt to reconnect after 5 seconds
            setTimeout(() => {
                this.connectToEventSource();
            }, 5000);
        };
    }

    handleEvent(type, data) {
        switch (type) {
            case 'track-changed':
                this.updateTrack(data.track, data.mood);
                this.show();
                break;
            case 'playback-changed':
                this.updatePlaybackState(data.isPlaying);
                break;
            case 'settings-changed':
                this.updateSettings(data.settings);
                break;
            case 'time-update':
                this.updateProgress(data.currentTime, data.duration);
                break;
        }
    }

    updateTrack(track, mood) {
        this.currentTrack = track;
        this.currentMood = mood;
        
        // Add loading state
        this.overlay.classList.add('loading');
        
        // Update track information
        this.trackTitle.textContent = track.title || 'Unknown Title';
        this.trackArtist.textContent = track.artist || 'Unknown Artist';
        this.trackAlbum.textContent = track.album || 'Unknown Album';
        this.moodName.textContent = mood ? `${mood.name} MOOD` : '';
        
        // Update album art
        this.updateAlbumArt(track);
        
        // Apply mood effects with delay for smooth transition
        setTimeout(() => {
            if (mood) {
                this.applyMoodEffects(mood);
            }
            
            // Remove loading state
            this.overlay.classList.remove('loading');
            
            // Add entrance animations
            this.addEntranceAnimations();
            
            // Handle text overflow after a delay
            setTimeout(() => {
                this.handleTextOverflow();
            }, 100);
        }, 200);
    }

    updateAlbumArt(track) {
        const albumArtImg = this.albumArt.querySelector('img');
        
        if (track.picture && track.picture.data) {
            try {
                const blob = new Blob([new Uint8Array(track.picture.data)], { 
                    type: track.picture.format || 'image/jpeg' 
                });
                const url = URL.createObjectURL(blob);
                
                // Create new image element
                const newImg = document.createElement('img');
                newImg.onload = () => {
                    // Smooth transition
                    if (albumArtImg) {
                        albumArtImg.style.opacity = '0';
                        setTimeout(() => {
                            this.albumArt.innerHTML = '';
                            this.albumArt.appendChild(newImg);
                            newImg.style.opacity = '0';
                            setTimeout(() => {
                                newImg.style.opacity = '1';
                            }, 50);
                        }, 200);
                    } else {
                        this.albumArt.innerHTML = '';
                        this.albumArt.appendChild(newImg);
                    }
                    URL.revokeObjectURL(url);
                };
                newImg.onerror = () => {
                    this.showDefaultAlbumArt();
                    URL.revokeObjectURL(url);
                };
                newImg.src = url;
            } catch (error) {
                console.error('Error loading album art:', error);
                this.showDefaultAlbumArt();
            }
        } else {
            this.showDefaultAlbumArt();
        }
    }
    
    showDefaultAlbumArt() {
        this.albumArt.innerHTML = '<div class="default-icon">♪</div>';
    }



    applyMoodEffects(mood) {
        // Remove existing mood classes
        this.overlay.className = this.overlay.className.replace(/mood-\w+/g, '');
        this.overlay.className = this.overlay.className.replace(/intensity-\w+/g, '');
        
        // Set CSS custom properties
        document.documentElement.style.setProperty('--mood-color', mood.color);
        
        // Apply effect classes
        const effectClass = `mood-${mood.effect}`;
        const intensityClass = this.getIntensityClass(mood.intensity);
        
        this.overlay.classList.add(effectClass, intensityClass);
        
        // Apply mood-specific visual enhancements
        this.applyMoodSpecificEffects(mood);
        
        // Handle text overflow for long titles
        this.handleTextOverflow();
        
        console.log('Applied mood effects:', mood.effect, mood.color, intensityClass);
    }
    
    applyMoodSpecificEffects(mood) {
        // Apply mood-based visual themes
        const moodName = mood.name.toLowerCase();
        
        // Remove existing mood-specific classes
        this.overlay.className = this.overlay.className.replace(/mood-(energetic|calm|dark|bright)/g, '');
        
        // Apply mood-specific effects based on name
        if (moodName.includes('energetic') || moodName.includes('upbeat') || moodName.includes('party')) {
            this.overlay.classList.add('mood-energetic');
        } else if (moodName.includes('calm') || moodName.includes('relax') || moodName.includes('chill')) {
            this.overlay.classList.add('mood-calm');
        } else if (moodName.includes('dark') || moodName.includes('gothic') || moodName.includes('metal')) {
            this.overlay.classList.add('mood-dark');
        } else if (moodName.includes('bright') || moodName.includes('happy') || moodName.includes('pop')) {
            this.overlay.classList.add('mood-bright');
        }
        
        // Apply color-based effects
        this.applyColorBasedEffects(mood.color);
    }
    
    applyColorBasedEffects(color) {
        // Convert hex to RGB to determine brightness
        const hex = color.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        
        // Calculate brightness (0-255)
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        
        // Apply brightness-based effects
        if (brightness > 150) {
            // Light colors - add dark text shadows
            this.overlay.style.setProperty('--text-shadow', '0 2px 4px rgba(0, 0, 0, 0.8)');
        } else {
            // Dark colors - add light text shadows
            this.overlay.style.setProperty('--text-shadow', '0 2px 4px rgba(255, 255, 255, 0.2)');
        }
        
        // Create complementary accent color
        const complementary = this.getComplementaryColor(color);
        document.documentElement.style.setProperty('--mood-accent', complementary);
    }
    
    getComplementaryColor(hex) {
        // Simple complementary color calculation
        const color = hex.replace('#', '');
        const r = parseInt(color.substr(0, 2), 16);
        const g = parseInt(color.substr(2, 2), 16);
        const b = parseInt(color.substr(4, 2), 16);
        
        // Calculate complementary
        const compR = (255 - r).toString(16).padStart(2, '0');
        const compG = (255 - g).toString(16).padStart(2, '0');
        const compB = (255 - b).toString(16).padStart(2, '0');
        
        return `#${compR}${compG}${compB}`;
    }

    getIntensityClass(intensity) {
        if (intensity >= 8) return 'intensity-high';
        if (intensity >= 5) return 'intensity-medium';
        return 'intensity-low';
    }

    updatePlaybackState(isPlaying) {
        if (isPlaying) {
            this.startProgressTracking();
            this.startVisualizer();
        } else {
            this.stopProgressTracking();
            this.stopVisualizer();
            
            if (!this.settings.alwaysShow) {
                this.scheduleHide();
            }
        }
    }

    updateProgress(currentTime, duration) {
        if (duration > 0) {
            const progress = (currentTime / duration) * 100;
            this.progressFill.style.width = `${progress}%`;
            this.currentTime.textContent = this.formatTime(currentTime);
        }
    }

    updateSettings(settings) {
        this.settings = { ...this.settings, ...settings };
        
        // Apply position
        this.setPosition(this.settings.position);
        
        // Toggle features
        if (!this.settings.enableParticles) {
            this.stopParticleSystem();
        } else {
            this.startParticleSystem();
        }
        
        if (!this.settings.enableVisualizer) {
            this.visualizer.style.display = 'none';
        } else {
            this.visualizer.style.display = 'block';
        }
    }

    setPosition(position) {
        this.overlay.className = this.overlay.className.replace(/position-\w+-\w+/g, '');
        this.overlay.classList.add(`position-${position}`);
        
        // Reset position styles
        this.overlay.style.top = '';
        this.overlay.style.bottom = '';
        this.overlay.style.left = '';
        this.overlay.style.right = '';
        
        const [vertical, horizontal] = position.split('-');
        
        switch (vertical) {
            case 'top':
                this.overlay.style.top = '40px';
                break;
            case 'bottom':
                this.overlay.style.bottom = '40px';
                break;
            case 'center':
                this.overlay.style.top = '50%';
                this.overlay.style.transform = 'translateY(-50%)';
                break;
        }
        
        switch (horizontal) {
            case 'left':
                this.overlay.style.left = '40px';
                break;
            case 'right':
                this.overlay.style.right = '40px';
                break;
            case 'center':
                this.overlay.style.left = '50%';
                this.overlay.style.transform += ' translateX(-50%)';
                break;
        }
    }

    show() {
        clearTimeout(this.hideTimeout);
        
        this.overlay.classList.remove('hidden');
        this.overlay.classList.add('visible');
        this.isVisible = true;
        
        if (!this.settings.alwaysShow) {
            this.scheduleHide();
        }
    }

    hide() {
        this.overlay.classList.remove('visible');
        this.overlay.classList.add('hidden');
        this.isVisible = false;
    }

    scheduleHide() {
        clearTimeout(this.hideTimeout);
        this.hideTimeout = setTimeout(() => {
            this.hide();
        }, this.settings.showDuration);
    }

    startProgressTracking() {
        this.stopProgressTracking();
        this.progressInterval = setInterval(() => {
            // Progress will be updated via events from main app
        }, 1000);
    }

    stopProgressTracking() {
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    setupVisualizer() {
        const canvas = this.visualizer;
        const ctx = canvas.getContext('2d');
        
        // Set canvas size
        canvas.width = canvas.offsetWidth * window.devicePixelRatio;
        canvas.height = canvas.offsetHeight * window.devicePixelRatio;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        this.visualizerCtx = ctx;
        this.visualizerWidth = canvas.offsetWidth;
        this.visualizerHeight = canvas.offsetHeight;
    }

    startVisualizer() {
        if (!this.settings.enableVisualizer) return;
        
        this.stopVisualizer();
        this.visualizerInterval = setInterval(() => {
            this.drawVisualizer();
        }, 60); // ~16fps
    }

    stopVisualizer() {
        if (this.visualizerInterval) {
            clearInterval(this.visualizerInterval);
            this.visualizerInterval = null;
        }
        
        if (this.visualizerCtx) {
            this.visualizerCtx.clearRect(0, 0, this.visualizerWidth, this.visualizerHeight);
        }
    }

    drawVisualizer() {
        if (!this.visualizerCtx) return;
        
        const ctx = this.visualizerCtx;
        const width = this.visualizerWidth;
        const height = this.visualizerHeight;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Generate fake audio data for demonstration
        const bars = 32;
        const barWidth = width / bars;
        const color = getComputedStyle(document.documentElement).getPropertyValue('--glow-color').trim();
        
        for (let i = 0; i < bars; i++) {
            // Simulate audio data
            const value = Math.random() * 0.8 + 0.2;
            const barHeight = value * height * 0.8;
            
            // Create gradient
            const gradient = ctx.createLinearGradient(0, height, 0, height - barHeight);
            gradient.addColorStop(0, color + '80');
            gradient.addColorStop(1, color);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(i * barWidth, height - barHeight, barWidth - 2, barHeight);
        }
    }

    startParticleSystem() {
        if (!this.settings.enableParticles) return;
        
        this.stopParticleSystem();
        this.createParticles();
        
        this.particleInterval = setInterval(() => {
            this.createParticle();
        }, 2000);
    }

    stopParticleSystem() {
        if (this.particleInterval) {
            clearInterval(this.particleInterval);
            this.particleInterval = null;
        }
        
        // Remove existing particles
        this.particles.innerHTML = '';
    }

    createParticles() {
        // Create initial particles
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                this.createParticle();
            }, i * 500);
        }
    }

    createParticle() {
        if (!this.settings.enableParticles) return;
        
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        // Random position
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 2 + 's';
        particle.style.animationDuration = (6 + Math.random() * 4) + 's';
        
        this.particles.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        }, 10000);
    }

    updateParticleColors(color) {
        const particles = this.particles.querySelectorAll('.particle');
        particles.forEach(particle => {
            particle.style.background = color;
            particle.style.boxShadow = `0 0 4px ${color}`;
        });
    }

    addEntranceAnimations() {
        // Add staggered entrance animations to elements
        const elements = [
            { el: this.trackTitle, delay: 0 },
            { el: this.trackArtist, delay: 100 },
            { el: this.trackAlbum, delay: 200 },
            { el: this.moodName, delay: 300 },
            { el: this.albumArt, delay: 50 }
        ];
        
        elements.forEach(({ el, delay }) => {
            if (!el) return;
            
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
            
            setTimeout(() => {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, delay);
        });
        
        // Add special album art animation
        if (this.albumArt) {
            this.albumArt.style.transform = 'scale(0.8) rotate(-5deg)';
            setTimeout(() => {
                this.albumArt.style.transform = 'scale(1) rotate(0deg)';
            }, 200);
        }
    }

    formatTime(seconds) {
        if (!seconds || seconds === 0) return '0:00';
        
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    // Handle text overflow with scrolling
    handleTextOverflow() {
        const elements = [
            { element: this.trackTitle, className: 'overflow' },
            { element: this.trackArtist, className: 'overflow' },
            { element: this.trackAlbum, className: 'overflow' }
        ];
        
        elements.forEach(({ element, className }) => {
            if (!element) return;
            
            const isOverflowing = element.scrollWidth > element.clientWidth;
            element.classList.toggle(className, isOverflowing);
            
            // Add marquee effect for very long text
            if (isOverflowing && element.scrollWidth > element.clientWidth * 1.5) {
                element.style.animationDuration = `${Math.max(5, element.textContent.length * 0.1)}s`;
            }
        });
    }

    // Cleanup method
    destroy() {
        if (this.eventSource) {
            this.eventSource.close();
        }
        
        this.stopProgressTracking();
        this.stopVisualizer();
        this.stopParticleSystem();
        
        clearTimeout(this.hideTimeout);
        clearTimeout(this.showTimeout);
    }
}

// Initialize overlay when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.moodMusicOverlay = new MoodMusicOverlay();
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause animations when tab is not visible
        if (window.moodMusicOverlay) {
            window.moodMusicOverlay.stopVisualizer();
            window.moodMusicOverlay.stopParticleSystem();
        }
    } else {
        // Resume animations when tab becomes visible
        if (window.moodMusicOverlay) {
            window.moodMusicOverlay.startVisualizer();
            window.moodMusicOverlay.startParticleSystem();
        }
    }
});

// Handle window resize
window.addEventListener('resize', () => {
    if (window.moodMusicOverlay) {
        window.moodMusicOverlay.setupVisualizer();
    }
});
