// Metadata Manager Component
class MetadataManager {
    constructor(app) {
        this.app = app;
        this.currentEditTrack = null;
        this.imageLibrary = []; // Store uploaded images for reuse
        this.setupMetadataControls();
    }

    setupMetadataControls() {
        // Cover upload button
        const uploadBtn = document.getElementById('upload-cover-btn');
        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                document.getElementById('cover-file-input').click();
            });
        }

        // File input change
        const fileInput = document.getElementById('cover-file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleCoverUpload(e.target.files[0]);
            });
        }

        // Choose from library
        const libraryBtn = document.getElementById('choose-from-library-btn');
        if (libraryBtn) {
            libraryBtn.addEventListener('click', () => {
                this.showImageLibrary();
            });
        }

        // Remove cover
        const removeCoverBtn = document.getElementById('remove-cover-btn');
        if (removeCoverBtn) {
            removeCoverBtn.addEventListener('click', () => {
                this.removeCover();
            });
        }

        // Close library
        const closeLibraryBtn = document.getElementById('close-library-btn');
        if (closeLibraryBtn) {
            closeLibraryBtn.addEventListener('click', () => {
                this.hideImageLibrary();
            });
        }

        // Save metadata
        const saveBtn = document.getElementById('save-track-metadata-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveTrackMetadata();
            });
        }

        // Reset metadata
        const resetBtn = document.getElementById('reset-track-metadata-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetTrackMetadata();
            });
        }

        // Cancel
        const cancelBtn = document.getElementById('cancel-track-metadata-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.hideEditTrackMetadataModal();
            });
        }
    }

    showEditTrackMetadataModal(track) {
        this.currentEditTrack = track;

        // Load current or original metadata
        const displayTitle = track.customMetadata?.title || track.title;
        const displayArtist = track.customMetadata?.artist || track.artist;
        const displayCover = track.customMetadata?.cover || track.picture;

        document.getElementById('edit-track-title').value = displayTitle;
        document.getElementById('edit-track-artist').value = displayArtist;

        // Show original metadata
        document.getElementById('original-title').textContent = track.title;
        document.getElementById('original-artist').textContent = track.artist;
        document.getElementById('original-album').textContent = track.album;

        // Show cover preview
        this.updateCoverPreview(displayCover);

        // Show modal
        this.app.getUIManager().showModal('edit-track-modal');
    }

    hideEditTrackMetadataModal() {
        this.currentEditTrack = null;
        this.app.getUIManager().hideModal();
    }

    updateCoverPreview(cover) {
        const preview = document.getElementById('edit-track-cover-preview');

        if (cover) {
            if (typeof cover === 'string') {
                // Base64 or data URL
                preview.src = cover;
            } else if (cover.data) {
                // Blob data
                const blob = new Blob([new Uint8Array(cover.data)], { type: cover.format });
                const url = URL.createObjectURL(blob);
                preview.src = url;
                preview.onload = () => URL.revokeObjectURL(url);
            }
        } else {
            // Default cover
            preview.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSIjNjY2NjY2IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMiAzdjEwLjU1Yy0uNTktLjM0LTEuMjctLjU1LTItLjU1LTIuMjEgMC00IDEuNzktNCA0czEuNzkgNCA0IDQgNC0xLjc5IDQtNFY3aDRWM2gtNnoiLz48L3N2Zz4=';
        }
    }

    async handleCoverUpload(file) {
        if (!file || !file.type.startsWith('image/')) {
            this.app.showNotification('Bitte wählen Sie eine Bilddatei aus', 'error');
            return;
        }

        try {
            // Compress and convert to base64
            const compressedImage = await this.compressImage(file);

            // Update preview
            this.updateCoverPreview(compressedImage);

            // Add to image library if not already there
            if (!this.imageLibrary.find(img => img.data === compressedImage)) {
                this.imageLibrary.push({
                    id: Date.now().toString(),
                    data: compressedImage,
                    uploadedAt: Date.now(),
                    originalName: file.name
                });

                // Save image library
                this.saveImageLibrary();
            }

            // Store temporarily for current track
            if (this.currentEditTrack) {
                if (!this.currentEditTrack.customMetadata) {
                    this.currentEditTrack.customMetadata = {};
                }
                this.currentEditTrack.customMetadata.cover = compressedImage;
            }

            this.app.showNotification('Bild hochgeladen und komprimiert', 'success');
        } catch (error) {
            console.error('Error uploading cover:', error);
            this.app.showNotification('Fehler beim Hochladen des Bildes', 'error');
        }
    }

    async compressImage(file, maxWidth = 500, maxHeight = 500, quality = 0.8) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                const img = new Image();

                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round((height * maxWidth) / width);
                            width = maxWidth;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round((width * maxHeight) / height);
                            height = maxHeight;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;

                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convert to base64
                    const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressedDataUrl);
                };

                img.onerror = reject;
                img.src = e.target.result;
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    removeCover() {
        if (this.currentEditTrack) {
            if (!this.currentEditTrack.customMetadata) {
                this.currentEditTrack.customMetadata = {};
            }
            this.currentEditTrack.customMetadata.cover = null;
            this.updateCoverPreview(null);
            this.app.showNotification('Cover entfernt', 'success');
        }
    }

    showImageLibrary() {
        const library = document.getElementById('image-library');
        const grid = document.getElementById('image-library-grid');

        // Clear grid
        grid.innerHTML = '';

        if (this.imageLibrary.length === 0) {
            grid.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">Noch keine Bilder in der Bibliothek</p>';
        } else {
            this.imageLibrary.forEach((image) => {
                const imgElement = document.createElement('div');
                imgElement.className = 'library-image-item';
                imgElement.innerHTML = `
                    <img src="${image.data}" alt="Cover">
                    <div class="library-image-overlay">
                        <button class="btn small select-image-btn" data-image-id="${image.id}">Auswählen</button>
                    </div>
                `;

                // Add click handler
                imgElement.querySelector('.select-image-btn').addEventListener('click', () => {
                    this.selectImageFromLibrary(image.id);
                });

                grid.appendChild(imgElement);
            });
        }

        library.style.display = 'block';
    }

    hideImageLibrary() {
        document.getElementById('image-library').style.display = 'none';
    }

    selectImageFromLibrary(imageId) {
        const image = this.imageLibrary.find(img => img.id === imageId);
        if (image && this.currentEditTrack) {
            if (!this.currentEditTrack.customMetadata) {
                this.currentEditTrack.customMetadata = {};
            }
            this.currentEditTrack.customMetadata.cover = image.data;
            this.updateCoverPreview(image.data);
            this.hideImageLibrary();
            this.app.showNotification('Bild aus Bibliothek ausgewählt', 'success');
        }
    }

    saveTrackMetadata() {
        if (!this.currentEditTrack) return;

        const newTitle = document.getElementById('edit-track-title').value.trim();
        const newArtist = document.getElementById('edit-track-artist').value.trim();

        // Initialize custom metadata if doesn't exist
        if (!this.currentEditTrack.customMetadata) {
            this.currentEditTrack.customMetadata = {};
        }

        // Save title if changed from original
        if (newTitle && newTitle !== this.currentEditTrack.title) {
            this.currentEditTrack.customMetadata.title = newTitle;
        } else if (newTitle === this.currentEditTrack.title) {
            // Remove custom title if same as original
            delete this.currentEditTrack.customMetadata.title;
        }

        // Save artist if changed from original
        if (newArtist && newArtist !== this.currentEditTrack.artist) {
            this.currentEditTrack.customMetadata.artist = newArtist;
        } else if (newArtist === this.currentEditTrack.artist) {
            // Remove custom artist if same as original
            delete this.currentEditTrack.customMetadata.artist;
        }

        // Update the track in library
        this.app.getMusicPlayer().updateTrackInLibrary(this.currentEditTrack);

        // Save all data
        this.app.saveData();

        // Update UI if this track is currently playing
        const currentTrack = this.app.getMusicPlayer().getCurrentTrack();
        if (currentTrack && currentTrack.id === this.currentEditTrack.id) {
            this.app.onTrackChanged(this.currentEditTrack, this.app.getMoodManager().getCurrentMood());
        }

        // Refresh views
        this.app.getUIManager().updateLibraryStats();
        if (this.app.getMoodManager().getCurrentMood()) {
            this.app.getUIManager().updateMoodContent(this.app.getMoodManager().getCurrentMood());
        }

        this.hideEditTrackMetadataModal();
        this.app.showNotification('Metadaten gespeichert', 'success');
    }

    resetTrackMetadata() {
        if (!this.currentEditTrack) return;

        const confirmed = confirm('Möchten Sie alle benutzerdefinierten Metadaten zurücksetzen?');
        if (!confirmed) return;

        // Remove all custom metadata
        delete this.currentEditTrack.customMetadata;

        // Update UI
        document.getElementById('edit-track-title').value = this.currentEditTrack.title;
        document.getElementById('edit-track-artist').value = this.currentEditTrack.artist;
        this.updateCoverPreview(this.currentEditTrack.picture);

        this.app.showNotification('Metadaten zurückgesetzt', 'success');
    }

    loadImageLibrary() {
        try {
            const stored = localStorage.getItem('mood-music-image-library');
            if (stored) {
                this.imageLibrary = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading image library:', error);
            this.imageLibrary = [];
        }
    }

    saveImageLibrary() {
        try {
            localStorage.setItem('mood-music-image-library', JSON.stringify(this.imageLibrary));
        } catch (error) {
            console.error('Error saving image library:', error);
        }
    }

    // Get display metadata (custom or original)
    getDisplayMetadata(track) {
        return {
            title: track.customMetadata?.title || track.title,
            artist: track.customMetadata?.artist || track.artist,
            album: track.customMetadata?.album || track.album,
            cover: track.customMetadata?.cover || track.picture
        };
    }
}
