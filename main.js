const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const NodeID3 = require('node-id3');

class MoodMusicApp {
    constructor() {
        this.mainWindow = null;
        this.obsServer = null;
        this.config = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.currentMood = null;
        this.obsConnections = [];
        
        this.initializeApp();
    }

    async initializeApp() {
        await app.whenReady();
        await this.loadConfig();
        await this.createWindow();
        this.setupIPC();
        this.startOBSServer();
    }

    async loadConfig() {
        const configPath = path.join(__dirname, 'data', 'config.json');
        try {
            const data = await fs.readFile(configPath, 'utf8');
            this.config = JSON.parse(data);
        } catch (error) {
            // Default configuration
            this.config = {
                theme: {
                    primaryColor: '#121212',
                    secondaryColor: '#847cf7',
                    accentColor: '#ffffff',
                    borderRadius: '8px'
                },
                audio: {
                    volume: 0.7,
                    fadeTime: 3
                },
                obs: {
                    port: 3000,
                    showDuration: 10,
                    transitionTime: 5,
                    alwaysShow: false
                },
                general: {
                    shuffleByDefault: true,
                    autoAdvance: true
                }
            };
            await this.saveConfig();
        }
    }

    async saveConfig() {
        const configPath = path.join(__dirname, 'data', 'config.json');
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            minWidth: 800,
            minHeight: 600,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            titleBarStyle: 'hiddenInset',
            backgroundColor: this.config.theme.primaryColor,
            show: false,
            icon: path.join(__dirname, 'assets', 'icon.png')
        });

        this.mainWindow.loadFile('src/index.html');
        
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
        });

        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Development tools
        if (process.argv.includes('--dev')) {
            this.mainWindow.webContents.openDevTools();
        }
    }

    setupIPC() {
        // Configuration
        ipcMain.handle('get-config', () => this.config);
        ipcMain.handle('save-config', async (event, newConfig) => {
            this.config = { ...this.config, ...newConfig };
            await this.saveConfig();
            return this.config;
        });

        // File dialogs
        ipcMain.handle('select-music-files', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openFile', 'multiSelections'],
                filters: [
                    { name: 'Audio Files', extensions: ['mp3', 'wav', 'flac', 'ogg', 'm4a'] }
                ]
            });
            return result.filePaths;
        });

        ipcMain.handle('select-music-folder', async () => {
            const result = await dialog.showOpenDialog(this.mainWindow, {
                properties: ['openDirectory']
            });
            return result.filePaths[0];
        });

        // Music metadata
        ipcMain.handle('get-music-metadata', async (event, filePath) => {
            try {
                const tags = NodeID3.read(filePath);
                const stats = await fs.stat(filePath);
                
                return {
                    title: tags.title || path.basename(filePath, path.extname(filePath)),
                    artist: tags.artist || 'Unknown Artist',
                    album: tags.album || 'Unknown Album',
                    duration: tags.length || 0,
                    year: tags.year || null,
                    genre: tags.genre ? [tags.genre] : [],
                    picture: tags.image ? {
                        data: Array.from(tags.image.imageBuffer), // Convert to array for JSON serialization
                        format: tags.image.mime
                    } : null,
                    fileSize: stats.size,
                    lastModified: stats.mtime
                };
            } catch (error) {
                console.error('Error reading metadata:', error);
                return {
                    title: path.basename(filePath, path.extname(filePath)),
                    artist: 'Unknown Artist',
                    album: 'Unknown Album',
                    duration: 0,
                    year: null,
                    genre: [],
                    picture: null
                };
            }
        });

        // Playback control
        ipcMain.handle('play-track', (event, track, mood) => {
            this.currentTrack = track;
            this.currentMood = mood;
            this.isPlaying = true;
            this.broadcastToOBS('track-changed', { track, mood, isPlaying: true });
        });

        ipcMain.handle('pause-track', () => {
            this.isPlaying = false;
            this.broadcastToOBS('playback-changed', { isPlaying: false });
        });

        ipcMain.handle('resume-track', () => {
            this.isPlaying = true;
            this.broadcastToOBS('playback-changed', { isPlaying: true });
        });

        // Open external links
        ipcMain.handle('open-external', (event, url) => {
            shell.openExternal(url);
        });

        // Handle dropped files
        ipcMain.handle('process-dropped-files', async (event, filePaths, targetMoodId) => {
            const processedFiles = [];
            
            for (const filePath of filePaths) {
                try {
                    const stat = await fs.stat(filePath);
                    if (stat.isFile()) {
                        const ext = path.extname(filePath).toLowerCase();
                        if (['.mp3', '.wav', '.flac', '.ogg', '.m4a'].includes(ext)) {
                            const metadata = await this.getTrackMetadata(filePath);
                            processedFiles.push({
                                path: filePath,
                                ...metadata,
                                addedAt: Date.now(),
                                targetMoodId
                            });
                        }
                    }
                } catch (error) {
                    console.error('Error processing dropped file:', filePath, error);
                }
            }
            
            return processedFiles;
        });

        // Validate file paths
        ipcMain.handle('validate-audio-files', async (event, filePaths) => {
            const validFiles = [];
            const invalidFiles = [];

            for (const filePath of filePaths) {
                try {
                    const stat = await fs.stat(filePath);
                    if (stat.isFile()) {
                        const ext = path.extname(filePath).toLowerCase();
                        if (['.mp3', '.wav', '.flac', '.ogg', '.m4a'].includes(ext)) {
                            validFiles.push(filePath);
                        } else {
                            invalidFiles.push({ path: filePath, reason: 'Unsupported format' });
                        }
                    } else {
                        invalidFiles.push({ path: filePath, reason: 'Not a file' });
                    }
                } catch (error) {
                    invalidFiles.push({ path: filePath, reason: 'File not accessible' });
                }
            }

            return { validFiles, invalidFiles };
        });

        // Register hotkeys
        ipcMain.handle('register-hotkeys', async (event, hotkeys) => {
            this.registerGlobalHotkeys(hotkeys);
        });
    }

    async getTrackMetadata(filePath) {
        try {
            const tags = NodeID3.read(filePath);
            const stats = await fs.stat(filePath);

            return {
                title: tags.title || path.basename(filePath, path.extname(filePath)),
                artist: tags.artist || 'Unknown Artist',
                album: tags.album || 'Unknown Album',
                duration: tags.length || 0,
                year: tags.year || null,
                genre: tags.genre ? [tags.genre] : [],
                picture: tags.image ? {
                    data: Array.from(tags.image.imageBuffer),
                    format: tags.image.mime
                } : null,
                fileSize: stats.size,
                lastModified: stats.mtime
            };
        } catch (error) {
            console.error('Error reading metadata:', error);
            return {
                title: path.basename(filePath, path.extname(filePath)),
                artist: 'Unknown Artist',
                album: 'Unknown Album',
                duration: 0,
                year: null,
                genre: [],
                picture: null
            };
        }
    }

    registerGlobalHotkeys(hotkeys) {
        // Unregister all previous hotkeys
        globalShortcut.unregisterAll();

        if (!hotkeys) {
            console.log('No hotkeys to register');
            return;
        }

        console.log('Registering global hotkeys:', hotkeys);

        // Register play/pause hotkey
        if (hotkeys.playPause) {
            const accelerator = this.hotkeyToAccelerator(hotkeys.playPause);
            if (accelerator) {
                try {
                    globalShortcut.register(accelerator, () => {
                        console.log('Play/Pause hotkey pressed');
                        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                            this.mainWindow.webContents.send('hotkey-triggered', 'play-pause');
                        }
                    });
                    console.log(`Registered play/pause: ${accelerator}`);
                } catch (error) {
                    console.error('Failed to register play/pause hotkey:', error);
                }
            }
        }

        // Register next track hotkey
        if (hotkeys.next) {
            const accelerator = this.hotkeyToAccelerator(hotkeys.next);
            if (accelerator) {
                try {
                    globalShortcut.register(accelerator, () => {
                        console.log('Next track hotkey pressed');
                        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                            this.mainWindow.webContents.send('hotkey-triggered', 'next');
                        }
                    });
                    console.log(`Registered next track: ${accelerator}`);
                } catch (error) {
                    console.error('Failed to register next hotkey:', error);
                }
            }
        }

        // Register previous track hotkey
        if (hotkeys.previous) {
            const accelerator = this.hotkeyToAccelerator(hotkeys.previous);
            if (accelerator) {
                try {
                    globalShortcut.register(accelerator, () => {
                        console.log('Previous track hotkey pressed');
                        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                            this.mainWindow.webContents.send('hotkey-triggered', 'previous');
                        }
                    });
                    console.log(`Registered previous track: ${accelerator}`);
                } catch (error) {
                    console.error('Failed to register previous hotkey:', error);
                }
            }
        }

        // Register mood playlist hotkeys
        if (hotkeys.moods && Array.isArray(hotkeys.moods)) {
            hotkeys.moods.forEach((moodHotkey) => {
                const accelerator = this.hotkeyToAccelerator(moodHotkey.hotkey);
                if (accelerator && moodHotkey.moodId) {
                    try {
                        globalShortcut.register(accelerator, () => {
                            console.log(`Mood hotkey pressed: ${moodHotkey.moodId}`);
                            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                                this.mainWindow.webContents.send('hotkey-triggered', 'play-mood', moodHotkey.moodId);
                            }
                        });
                        console.log(`Registered mood hotkey: ${accelerator} -> ${moodHotkey.moodId}`);
                    } catch (error) {
                        console.error(`Failed to register mood hotkey for ${moodHotkey.moodId}:`, error);
                    }
                }
            });
        }

        console.log('All hotkeys registered');
    }

    hotkeyToAccelerator(hotkey) {
        if (!hotkey || !hotkey.key) return null;

        const parts = [];

        // Add modifiers
        if (hotkey.ctrl) parts.push('CommandOrControl');
        if (hotkey.shift) parts.push('Shift');
        if (hotkey.alt) parts.push('Alt');
        if (hotkey.meta) parts.push('Super');

        // Convert key code to Electron format
        let key = hotkey.key;

        // Handle special keys
        if (key.startsWith('Key')) {
            key = key.replace('Key', '');
        } else if (key.startsWith('Digit')) {
            key = key.replace('Digit', '');
        } else if (key === 'Space') {
            key = 'Space';
        } else if (key === 'ArrowUp') {
            key = 'Up';
        } else if (key === 'ArrowDown') {
            key = 'Down';
        } else if (key === 'ArrowLeft') {
            key = 'Left';
        } else if (key === 'ArrowRight') {
            key = 'Right';
        }

        parts.push(key);

        return parts.join('+');
    }

    startOBSServer() {
        const expressApp = express();
        
        // Configure multer for file uploads
        const upload = multer({
            dest: path.join(__dirname, 'temp'),
            limits: {
                fileSize: 100 * 1024 * 1024 // 100MB limit
            },
            fileFilter: (req, file, cb) => {
                const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4'];
                const ext = path.extname(file.originalname).toLowerCase();
                const allowedExtensions = ['.mp3', '.wav', '.flac', '.ogg', '.m4a'];
                
                if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
                    cb(null, true);
                } else {
                    cb(new Error('Unsupported file type'), false);
                }
            }
        });
        
        // Add body parser middleware
        expressApp.use(bodyParser.json());
        expressApp.use(bodyParser.urlencoded({ extended: true }));
        
        // Serve static files from obs-overlay directory
        expressApp.use(express.static(path.join(__dirname, 'obs-overlay')));
        
        // SSE endpoint for real-time updates
        expressApp.get('/events', (req, res) => {
            res.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Cache-Control'
            });

            // Send initial heartbeat
            res.write(`data: ${JSON.stringify({
                type: 'connected',
                data: { timestamp: Date.now() }
            })}\n\n`);

            // Send current state if available
            if (this.currentTrack) {
                res.write(`data: ${JSON.stringify({
                    type: 'track-changed',
                    data: {
                        track: this.currentTrack,
                        mood: this.currentMood,
                        isPlaying: this.isPlaying
                    }
                })}\n\n`);
            }

            // Store connection
            this.obsConnections.push(res);

            // Handle client disconnect
            req.on('close', () => {
                const index = this.obsConnections.indexOf(res);
                if (index !== -1) {
                    this.obsConnections.splice(index, 1);
                }
                console.log(`OBS client disconnected. Active connections: ${this.obsConnections.length}`);
            });

            req.on('error', (err) => {
                console.error('SSE connection error:', err);
                const index = this.obsConnections.indexOf(res);
                if (index !== -1) {
                    this.obsConnections.splice(index, 1);
                }
            });
            
            console.log(`New OBS client connected. Active connections: ${this.obsConnections.length}`);
        });

        // API endpoint to get current state
        expressApp.get('/api/current', (req, res) => {
            res.json({
                track: this.currentTrack,
                mood: this.currentMood,
                isPlaying: this.isPlaying,
                config: {
                    obs: this.config.obs
                },
                timestamp: Date.now()
            });
        });

        // Health check endpoint
        expressApp.get('/health', (req, res) => {
            res.json({ 
                status: 'ok', 
                timestamp: Date.now(),
                connections: this.obsConnections.length
            });
        });

        try {
            this.obsServer = expressApp.listen(this.config.obs.port, () => {
                console.log(`🚀 OBS Server running on http://localhost:${this.config.obs.port}`);
                console.log(`🎥 OBS Overlay URL: http://localhost:${this.config.obs.port}`);
                console.log(`📊 Health check: http://localhost:${this.config.obs.port}/health`);
            });
            
            this.obsServer.on('error', (err) => {
                console.error('OBS Server error:', err);
                if (err.code === 'EADDRINUSE') {
                    console.log(`Port ${this.config.obs.port} is in use, trying port ${this.config.obs.port + 1}`);
                    this.config.obs.port += 1;
                    this.startOBSServer();
                }
            });
        } catch (error) {
            console.error('Failed to start OBS Server:', error);
        }
    }

    broadcastToOBS(type, data) {
        if (this.obsConnections && this.obsConnections.length > 0) {
            const message = `data: ${JSON.stringify({ type, data })}\n\n`;
            
            // Broadcast to all active connections
            this.obsConnections = this.obsConnections.filter((connection) => {
                try {
                    connection.write(message);
                    return true; // Keep connection
                } catch (error) {
                    console.error('Error broadcasting to OBS connection:', error);
                    return false; // Remove dead connection
                }
            });
            
            console.log(`📡 Broadcasted ${type} to ${this.obsConnections.length} OBS connections`);
        } else {
            console.log('📡 No OBS connections available for broadcast');
        }
    }
}

// App event handlers
app.whenReady().then(() => {
    new MoodMusicApp();
}).catch(error => {
    console.error('Error starting app:', error);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        new MoodMusicApp();
    }
});
