// Audio Utilities
class AudioUtils {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        this.isInitialized = false;
    }

    async initializeAudioContext() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.isInitialized = true;
        } catch (error) {
            console.error('Error initializing audio context:', error);
        }
    }

    connectAudioElement(audioElement) {
        if (!this.isInitialized) {
            this.initializeAudioContext();
        }

        if (this.source) {
            this.source.disconnect();
        }

        try {
            this.source = this.audioContext.createMediaElementSource(audioElement);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioContext.destination);
        } catch (error) {
            console.error('Error connecting audio element:', error);
        }
    }

    getFrequencyData() {
        if (!this.analyser) return null;
        
        this.analyser.getByteFrequencyData(this.dataArray);
        return this.dataArray;
    }

    getAverageFrequency() {
        const data = this.getFrequencyData();
        if (!data) return 0;

        const sum = data.reduce((a, b) => a + b, 0);
        return sum / data.length;
    }

    getLowFrequency() {
        const data = this.getFrequencyData();
        if (!data) return 0;

        // Get low frequencies (bass)
        const lowEnd = Math.floor(data.length * 0.1);
        const lowData = data.slice(0, lowEnd);
        const sum = lowData.reduce((a, b) => a + b, 0);
        return sum / lowData.length;
    }

    getMidFrequency() {
        const data = this.getFrequencyData();
        if (!data) return 0;

        // Get mid frequencies
        const start = Math.floor(data.length * 0.1);
        const end = Math.floor(data.length * 0.7);
        const midData = data.slice(start, end);
        const sum = midData.reduce((a, b) => a + b, 0);
        return sum / midData.length;
    }

    getHighFrequency() {
        const data = this.getFrequencyData();
        if (!data) return 0;

        // Get high frequencies (treble)
        const start = Math.floor(data.length * 0.7);
        const highData = data.slice(start);
        const sum = highData.reduce((a, b) => a + b, 0);
        return sum / highData.length;
    }

    // Audio effects and processing
    createEqualizer(audioElement) {
        if (!this.isInitialized) {
            this.initializeAudioContext();
        }

        const filters = {};
        const frequencies = [60, 170, 350, 1000, 3500, 10000];
        
        frequencies.forEach((freq, index) => {
            const filter = this.audioContext.createBiquadFilter();
            filter.type = index === 0 ? 'lowshelf' : 
                         index === frequencies.length - 1 ? 'highshelf' : 'peaking';
            filter.frequency.value = freq;
            filter.Q.value = 1;
            filter.gain.value = 0;
            
            filters[freq] = filter;
        });

        return filters;
    }

    applyFadeEffect(audioElement, direction, duration = 1000) {
        const startVolume = direction === 'in' ? 0 : audioElement.volume;
        const endVolume = direction === 'in' ? audioElement.volume : 0;
        const steps = 50;
        const stepTime = duration / steps;
        const volumeStep = Math.abs(endVolume - startVolume) / steps;

        if (direction === 'in') {
            audioElement.volume = 0;
        }

        let currentStep = 0;
        const fadeInterval = setInterval(() => {
            currentStep++;
            
            if (direction === 'in') {
                audioElement.volume = Math.min(endVolume, volumeStep * currentStep);
            } else {
                audioElement.volume = Math.max(0, startVolume - (volumeStep * currentStep));
            }

            if (currentStep >= steps) {
                clearInterval(fadeInterval);
                audioElement.volume = endVolume;
            }
        }, stepTime);

        return fadeInterval;
    }

    // Audio format detection and validation
    isAudioFile(filename) {
        const audioExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a', '.aac', '.wma'];
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return audioExtensions.includes(extension);
    }

    getAudioFileInfo(file) {
        return new Promise((resolve, reject) => {
            const audio = new Audio();
            const url = URL.createObjectURL(file);
            
            audio.addEventListener('loadedmetadata', () => {
                const info = {
                    duration: audio.duration,
                    size: file.size,
                    type: file.type,
                    name: file.name,
                    lastModified: file.lastModified
                };
                
                URL.revokeObjectURL(url);
                resolve(info);
            });

            audio.addEventListener('error', () => {
                URL.revokeObjectURL(url);
                reject(new Error('Invalid audio file'));
            });

            audio.src = url;
        });
    }

    // Audio visualization helpers
    generateVisualizationData(type = 'bars') {
        const data = this.getFrequencyData();
        if (!data) return [];

        switch (type) {
            case 'bars':
                return this.generateBarsData(data);
            case 'wave':
                return this.generateWaveData(data);
            case 'circle':
                return this.generateCircleData(data);
            default:
                return Array.from(data);
        }
    }

    generateBarsData(data) {
        const barCount = 32;
        const step = Math.floor(data.length / barCount);
        const bars = [];

        for (let i = 0; i < barCount; i++) {
            const start = i * step;
            const end = start + step;
            const slice = data.slice(start, end);
            const average = slice.reduce((a, b) => a + b, 0) / slice.length;
            bars.push(average / 255); // Normalize to 0-1
        }

        return bars;
    }

    generateWaveData(data) {
        const wavePoints = 64;
        const step = Math.floor(data.length / wavePoints);
        const wave = [];

        for (let i = 0; i < wavePoints; i++) {
            const index = i * step;
            wave.push((data[index] || 0) / 255); // Normalize to 0-1
        }

        return wave;
    }

    generateCircleData(data) {
        const points = 60;
        const step = Math.floor(data.length / points);
        const circle = [];

        for (let i = 0; i < points; i++) {
            const index = i * step;
            const value = (data[index] || 0) / 255;
            const angle = (i / points) * Math.PI * 2;
            
            circle.push({
                angle,
                radius: 0.3 + (value * 0.7), // Base radius + dynamic part
                value
            });
        }

        return circle;
    }

    // Crossfade between two audio elements
    crossfade(fromElement, toElement, duration = 3000) {
        const steps = 50;
        const stepTime = duration / steps;
        const fromStartVolume = fromElement.volume;
        const toStartVolume = 0;
        const volumeStep = fromStartVolume / steps;

        toElement.volume = 0;
        toElement.play();

        let currentStep = 0;
        const crossfadeInterval = setInterval(() => {
            currentStep++;
            
            fromElement.volume = Math.max(0, fromStartVolume - (volumeStep * currentStep));
            toElement.volume = Math.min(fromStartVolume, volumeStep * currentStep);

            if (currentStep >= steps) {
                clearInterval(crossfadeInterval);
                fromElement.pause();
                fromElement.volume = fromStartVolume;
                toElement.volume = fromStartVolume;
            }
        }, stepTime);

        return crossfadeInterval;
    }

    // Audio format conversion helpers
    async convertToBlob(audioBuffer, format = 'audio/wav') {
        const offlineContext = new OfflineAudioContext(
            audioBuffer.numberOfChannels,
            audioBuffer.length,
            audioBuffer.sampleRate
        );

        const source = offlineContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineContext.destination);
        source.start();

        const renderedBuffer = await offlineContext.startRendering();
        return this.audioBufferToBlob(renderedBuffer, format);
    }

    audioBufferToBlob(audioBuffer, format) {
        const length = audioBuffer.length;
        const numberOfChannels = audioBuffer.numberOfChannels;
        const sampleRate = audioBuffer.sampleRate;
        const arrayBuffer = new ArrayBuffer(length * numberOfChannels * 2);
        const view = new DataView(arrayBuffer);

        let offset = 0;
        for (let i = 0; i < length; i++) {
            for (let channel = 0; channel < numberOfChannels; channel++) {
                const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
                view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
                offset += 2;
            }
        }

        return new Blob([arrayBuffer], { type: format });
    }

    // Cleanup methods
    dispose() {
        if (this.source) {
            this.source.disconnect();
        }
        
        if (this.analyser) {
            this.analyser.disconnect();
        }
        
        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        this.audioContext = null;
        this.analyser = null;
        this.dataArray = null;
        this.source = null;
        this.isInitialized = false;
    }
}
