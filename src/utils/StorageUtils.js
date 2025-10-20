// Storage Utilities
class StorageUtils {
    constructor() {
        this.storagePrefix = 'moodmusic_';
        this.version = '1.0';
        this.compressionEnabled = true;
        
        // Initialize storage
        this.initializeStorage();
    }

    initializeStorage() {
        // Check if localStorage is available
        if (!this.isStorageAvailable()) {
            console.warn('localStorage is not available, using memory storage');
            this.useMemoryStorage = true;
            this.memoryStorage = {};
        }

        // Check and migrate old data if necessary
        this.checkMigration();
    }

    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }

    // Core storage methods
    async save(key, data) {
        try {
            const storageKey = this.storagePrefix + key;
            const serializedData = this.serialize(data);
            
            if (this.useMemoryStorage) {
                this.memoryStorage[storageKey] = serializedData;
            } else {
                localStorage.setItem(storageKey, serializedData);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    async load(key, defaultValue = null) {
        try {
            const storageKey = this.storagePrefix + key;
            let serializedData;
            
            if (this.useMemoryStorage) {
                serializedData = this.memoryStorage[storageKey];
            } else {
                serializedData = localStorage.getItem(storageKey);
            }
            
            if (serializedData === null) {
                return defaultValue;
            }
            
            return this.deserialize(serializedData);
        } catch (error) {
            console.error('Error loading data:', error);
            return defaultValue;
        }
    }

    async remove(key) {
        try {
            const storageKey = this.storagePrefix + key;
            
            if (this.useMemoryStorage) {
                delete this.memoryStorage[storageKey];
            } else {
                localStorage.removeItem(storageKey);
            }
            
            return true;
        } catch (error) {
            console.error('Error removing data:', error);
            return false;
        }
    }

    async clear() {
        try {
            if (this.useMemoryStorage) {
                this.memoryStorage = {};
            } else {
                // Remove only keys with our prefix
                const keys = Object.keys(localStorage).filter(key => 
                    key.startsWith(this.storagePrefix)
                );
                keys.forEach(key => localStorage.removeItem(key));
            }
            
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    // High-level data methods
    async saveAll(data) {
        const results = await Promise.all([
            this.save('moods', data.moods || []),
            this.save('library', data.library || []),
            this.save('settings', data.settings || {}),
            this.save('metadata', {
                lastUpdated: data.lastUpdated || Date.now(),
                version: this.version
            })
        ]);
        
        return results.every(result => result === true);
    }

    async loadAll() {
        const [moods, library, settings, metadata] = await Promise.all([
            this.load('moods', []),
            this.load('library', []),
            this.load('settings', {}),
            this.load('metadata', {})
        ]);
        
        return {
            moods,
            library,
            settings,
            metadata
        };
    }

    // Specific data type methods
    async saveMoods(moods) {
        return await this.save('moods', moods);
    }

    async loadMoods() {
        return await this.load('moods', []);
    }

    async saveLibrary(library) {
        return await this.save('library', library);
    }

    async loadLibrary() {
        return await this.load('library', []);
    }

    async saveSettings(settings) {
        return await this.save('settings', settings);
    }

    async loadSettings() {
        return await this.load('settings', {});
    }

    // Backup and restore
    async createBackup() {
        const allData = await this.loadAll();
        const backup = {
            ...allData,
            backupDate: Date.now(),
            appVersion: this.version
        };
        
        return JSON.stringify(backup, null, 2);
    }

    async restoreFromBackup(backupData) {
        try {
            const data = typeof backupData === 'string' ? 
                JSON.parse(backupData) : backupData;
            
            // Validate backup data
            if (!this.validateBackupData(data)) {
                throw new Error('Invalid backup data format');
            }
            
            // Clear existing data
            await this.clear();
            
            // Restore data
            const success = await this.saveAll(data);
            
            if (success) {
                console.log('Backup restored successfully');
                return true;
            } else {
                throw new Error('Failed to save restored data');
            }
        } catch (error) {
            console.error('Error restoring backup:', error);
            return false;
        }
    }

    validateBackupData(data) {
        const requiredFields = ['moods', 'library'];
        return requiredFields.every(field => 
            data.hasOwnProperty(field) && Array.isArray(data[field])
        );
    }

    // Data serialization
    serialize(data) {
        try {
            let serialized = JSON.stringify(data);
            
            if (this.compressionEnabled && this.isCompressionBeneficial(serialized)) {
                serialized = this.compress(serialized);
            }
            
            return serialized;
        } catch (error) {
            console.error('Error serializing data:', error);
            throw error;
        }
    }

    deserialize(serializedData) {
        try {
            let data = serializedData;
            
            // Check if data is compressed
            if (this.isCompressed(data)) {
                data = this.decompress(data);
            }
            
            return JSON.parse(data);
        } catch (error) {
            console.error('Error deserializing data:', error);
            throw error;
        }
    }

    // Simple compression (Base64 encoding for now)
    compress(data) {
        try {
            // Mark as compressed
            const compressed = btoa(unescape(encodeURIComponent(data)));
            return '__COMPRESSED__' + compressed;
        } catch (error) {
            console.warn('Compression failed, using uncompressed data');
            return data;
        }
    }

    decompress(compressedData) {
        try {
            const data = compressedData.replace('__COMPRESSED__', '');
            return decodeURIComponent(escape(atob(data)));
        } catch (error) {
            console.error('Decompression failed:', error);
            throw error;
        }
    }

    isCompressed(data) {
        return typeof data === 'string' && data.startsWith('__COMPRESSED__');
    }

    isCompressionBeneficial(data) {
        // Only compress if data is larger than 1KB
        return data.length > 1024;
    }

    // Migration methods
    checkMigration() {
        const currentVersion = this.load('version', '0.0');
        
        if (currentVersion !== this.version) {
            this.performMigration(currentVersion, this.version);
        }
    }

    async performMigration(fromVersion, toVersion) {
        console.log(`Migrating data from version ${fromVersion} to ${toVersion}`);
        
        try {
            // Add migration logic here as needed
            switch (fromVersion) {
                case '0.0':
                    // Initial version, no migration needed
                    break;
                default:
                    console.log('No migration needed');
            }
            
            // Update version
            await this.save('version', toVersion);
            console.log('Migration completed successfully');
        } catch (error) {
            console.error('Migration failed:', error);
        }
    }

    // Storage statistics and management
    getStorageInfo() {
        if (this.useMemoryStorage) {
            const totalSize = JSON.stringify(this.memoryStorage).length;
            const keys = Object.keys(this.memoryStorage).filter(key => 
                key.startsWith(this.storagePrefix)
            );
            
            return {
                type: 'memory',
                totalSize,
                keys: keys.length,
                available: true
            };
        }
        
        try {
            const keys = Object.keys(localStorage).filter(key => 
                key.startsWith(this.storagePrefix)
            );
            
            let totalSize = 0;
            keys.forEach(key => {
                totalSize += localStorage.getItem(key).length;
            });
            
            return {
                type: 'localStorage',
                totalSize,
                keys: keys.length,
                available: true,
                quota: this.getStorageQuota()
            };
        } catch (error) {
            return {
                type: 'unknown',
                available: false,
                error: error.message
            };
        }
    }

    getStorageQuota() {
        if (navigator.storage && navigator.storage.estimate) {
            return navigator.storage.estimate();
        }
        
        // Fallback estimation for older browsers
        return Promise.resolve({
            quota: 5 * 1024 * 1024, // 5MB estimation
            usage: 0
        });
    }

    async optimizeStorage() {
        try {
            const allData = await this.loadAll();
            
            // Remove empty or invalid entries
            if (allData.moods) {
                allData.moods = allData.moods.filter(mood => 
                    mood && mood.id && mood.name
                );
            }
            
            if (allData.library) {
                allData.library = allData.library.filter(track => 
                    track && track.id && track.path
                );
            }
            
            // Save optimized data
            const success = await this.saveAll(allData);
            
            if (success) {
                console.log('Storage optimized successfully');
                return true;
            }
        } catch (error) {
            console.error('Storage optimization failed:', error);
        }
        
        return false;
    }

    // Export/Import methods
    async exportData(includeSettings = true) {
        const data = await this.loadAll();
        const exportData = {
            moods: data.moods,
            library: data.library
        };
        
        if (includeSettings) {
            exportData.settings = data.settings;
        }
        
        exportData.exportDate = Date.now();
        exportData.version = this.version;
        
        return exportData;
    }

    async importData(importedData, mergeMode = false) {
        try {
            if (!this.validateImportData(importedData)) {
                throw new Error('Invalid import data format');
            }
            
            if (mergeMode) {
                const existingData = await this.loadAll();
                
                // Merge moods (avoid duplicates by name)
                const existingMoodNames = existingData.moods.map(m => m.name.toLowerCase());
                const newMoods = importedData.moods.filter(m => 
                    !existingMoodNames.includes(m.name.toLowerCase())
                );
                importedData.moods = [...existingData.moods, ...newMoods];
                
                // Merge library (avoid duplicates by path)
                const existingPaths = existingData.library.map(t => t.path);
                const newTracks = importedData.library.filter(t => 
                    !existingPaths.includes(t.path)
                );
                importedData.library = [...existingData.library, ...newTracks];
            }
            
            const success = await this.saveAll(importedData);
            
            if (success) {
                console.log('Data imported successfully');
                return {
                    success: true,
                    moodsCount: importedData.moods.length,
                    tracksCount: importedData.library.length
                };
            } else {
                throw new Error('Failed to save imported data');
            }
        } catch (error) {
            console.error('Import failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    validateImportData(data) {
        return data && 
               typeof data === 'object' &&
               Array.isArray(data.moods) &&
               Array.isArray(data.library);
    }

    // Utility methods
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async cleanup() {
        // Remove old temporary data
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith(this.storagePrefix + 'temp_')
        );
        
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
        
        for (const key of keys) {
            try {
                const data = JSON.parse(localStorage.getItem(key));
                if (data.timestamp && data.timestamp < cutoffTime) {
                    localStorage.removeItem(key);
                }
            } catch (error) {
                // Remove corrupted entries
                localStorage.removeItem(key);
            }
        }
    }
}
