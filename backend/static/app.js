// UI Global State
let activeVideoId = null;
let pollTimer = null;
let hlsPlayer = null;

// DOM Elements
const btnProcessLocal = document.getElementById('btn-process-local');
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadProgressContainer = document.getElementById('upload-progress-container');
const uploadProgressBar = document.getElementById('upload-progress-bar');
const uploadPercentText = document.getElementById('upload-percent');
const uploadSizeText = document.getElementById('upload-size');

const monitorEmpty = document.getElementById('monitor-empty');
const monitorActive = document.getElementById('monitor-active');
const monitorVideoId = document.getElementById('monitor-video-id');
const monitorBadge = document.getElementById('monitor-badge');
const monitorDuration = document.getElementById('monitor-duration');
const monitorRenditionsCount = document.getElementById('monitor-renditions-count');
const monitorErrorBox = document.getElementById('monitor-error-box');
const monitorErrorMsg = document.getElementById('monitor-error-msg');

const nodeQueued = document.getElementById('node-queued');
const nodeProcessing = document.getElementById('node-processing');
const nodeUploading = document.getElementById('node-uploading');
const nodeReady = document.getElementById('node-ready');
const line1 = document.getElementById('line-1');
const line2 = document.getElementById('line-2');
const line3 = document.getElementById('line-3');

const libraryTbody = document.getElementById('library-tbody');

const playerModal = document.getElementById('player-modal');
const playerVideoId = document.getElementById('player-video-id');
const hlsVideo = document.getElementById('hls-video');
const btnCloseModal = document.getElementById('btn-close-modal');
const qualitySelect = document.getElementById('quality-select');
const manifestUrlInput = document.getElementById('manifest-url-input');
const btnCopyManifest = document.getElementById('btn-copy-manifest');

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    fetchLibrary();
    setupUploader();
    setupLocalProcess();
    setupPlayerModal();
});

// Setup drag and drop custom file uploader
function setupUploader() {
    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleUpload(fileInput.files[0]);
        }
    });

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleUpload(e.dataTransfer.files[0]);
        }
    });
}

function handleUpload(file) {
    // Validate file type
    const ext = file.name.split('.').pop().toLowerCase();
    const validExts = ['mp4', 'mov', 'avi', 'mkv'];
    if (!validExts.includes(ext)) {
        alert('Unsupported video format. Please upload MP4, MOV, AVI, or MKV.');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/videos/upload', true);

    uploadProgressContainer.classList.remove('hidden');
    btnProcessLocal.disabled = true;
    dropZone.style.pointerEvents = 'none';

    // Update upload progress
    xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            uploadProgressBar.style.width = percent + '%';
            uploadPercentText.textContent = `Uploading: ${percent}%`;
            uploadSizeText.textContent = `${(e.loaded / (1024 * 1024)).toFixed(1)} / ${(e.total / (1024 * 1024)).toFixed(1)} MB`;
        }
    };

    xhr.onload = () => {
        // Reset upload UI
        uploadProgressContainer.classList.add('hidden');
        btnProcessLocal.disabled = false;
        dropZone.style.pointerEvents = 'auto';
        fileInput.value = '';

        if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            startPolling(response.video_id);
        } else {
            alert('Upload failed: ' + (JSON.parse(xhr.responseText).detail || 'Server error'));
        }
    };

    xhr.onerror = () => {
        uploadProgressContainer.classList.add('hidden');
        btnProcessLocal.disabled = false;
        dropZone.style.pointerEvents = 'auto';
        alert('Connection error during upload.');
    };

    xhr.send(formData);
}

// Setup processing pre-placed local test.mp4
function setupLocalProcess() {
    btnProcessLocal.addEventListener('click', async () => {
        btnProcessLocal.disabled = true;
        try {
            const response = await fetch('/api/videos/process-local', { method: 'POST' });
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || 'Failed to start transcode.');
            }
            const data = await response.json();
            startPolling(data.video_id);
        } catch (error) {
            alert(error.message);
            btnProcessLocal.disabled = false;
        }
    });
}

// Pipeline Polling System
function startPolling(videoId) {
    activeVideoId = videoId;
    
    // UI adjustments
    monitorEmpty.classList.add('hidden');
    monitorActive.classList.remove('hidden');
    monitorVideoId.textContent = videoId;
    monitorVideoId.title = videoId;
    monitorDuration.textContent = '--';
    monitorRenditionsCount.textContent = '--';
    monitorErrorBox.classList.add('hidden');

    resetPipelineNodes();

    if (pollTimer) clearInterval(pollTimer);
    
    pollTimer = setInterval(async () => {
        try {
            const res = await fetch(`/api/videos/${videoId}`);
            if (!res.ok) return;
            const data = await res.json();
            updateMonitor(data);
        } catch (e) {
            console.error('Polling failed:', e);
        }
    }, 1500);
}

function updateMonitor(video) {
    // Update Badge
    monitorBadge.className = `badge ${video.status}`;
    monitorBadge.textContent = video.status;

    // Update Node Progress Flow
    resetPipelineNodes();

    if (video.status === 'queued') {
        nodeQueued.classList.add('active');
    } 
    else if (video.status === 'processing') {
        nodeQueued.classList.add('completed');
        line1.classList.add('active');
        nodeProcessing.classList.add('active');
        nodeProcessing.querySelector('.node-circle i').classList.add('spinner');
    } 
    else if (video.status === 'uploading') {
        nodeQueued.classList.add('completed');
        line1.classList.add('completed');
        nodeProcessing.classList.add('completed');
        nodeProcessing.querySelector('.node-circle i').classList.remove('spinner');
        line2.classList.add('active');
        nodeUploading.classList.add('active');
    } 
    else if (video.status === 'ready') {
        nodeQueued.classList.add('completed');
        line1.classList.add('completed');
        nodeProcessing.classList.add('completed');
        line2.classList.add('completed');
        nodeUploading.classList.add('completed');
        line3.classList.add('completed');
        nodeReady.classList.add('completed');
        
        // Show metadata stats
        monitorDuration.textContent = video.duration ? `${video.duration.toFixed(1)}s` : '--';
        monitorRenditionsCount.textContent = video.renditions ? video.renditions.length : '0';

        // Clean up polling
        stopPolling();
        fetchLibrary();
    } 
    else if (video.status === 'failed') {
        // Mark failed state dynamically on nodes
        nodeQueued.classList.add('completed');
        line1.classList.add('completed');
        nodeProcessing.classList.add('failed');
        nodeProcessing.querySelector('.node-circle i').classList.remove('spinner');
        
        monitorErrorMsg.textContent = video.error || 'FFmpeg transcode pipeline failed.';
        monitorErrorBox.classList.remove('hidden');

        stopPolling();
        fetchLibrary();
    }
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
    btnProcessLocal.disabled = false;
}

function resetPipelineNodes() {
    const nodes = [nodeQueued, nodeProcessing, nodeUploading, nodeReady];
    const lines = [line1, line2, line3];

    nodes.forEach(n => {
        n.className = 'flow-node';
        n.querySelector('.node-circle i').className = n.querySelector('.node-circle i').className.replace('spinner', '').trim();
    });
    lines.forEach(l => l.className = 'flow-line');
}

// Fetch Video Library
async function fetchLibrary() {
    try {
        const res = await fetch('/api/videos');
        if (!res.ok) return;
        const videos = await res.json();
        renderLibrary(videos);
    } catch (e) {
        console.error('Failed to load library:', e);
    }
}

function renderLibrary(videos) {
    if (videos.length === 0) {
        libraryTbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6" class="text-center">No videos processed yet.</td>
            </tr>
        `;
        return;
    }

    libraryTbody.innerHTML = '';
    videos.forEach(v => {
        const row = document.createElement('tr');
        
        // Thumbnail Cell
        const tdThumb = document.createElement('td');
        if (v.status === 'ready' && v.thumbnail_url) {
            tdThumb.innerHTML = `<img src="${v.thumbnail_url}" class="thumbnail-preview" alt="Video preview">`;
        } else {
            tdThumb.innerHTML = `
                <div class="empty-thumbnail">
                    <i class="fa-solid fa-film"></i>
                </div>
            `;
        }
        row.appendChild(tdThumb);

        // ID Cell
        const tdId = document.createElement('td');
        tdId.className = 'truncate';
        tdId.style.maxWidth = '180px';
        tdId.textContent = v.video_id;
        tdId.title = v.video_id;
        row.appendChild(tdId);

        // Status Badge Cell
        const tdStatus = document.createElement('td');
        tdStatus.innerHTML = `<span class="badge ${v.status}">${v.status}</span>`;
        row.appendChild(tdStatus);

        // Duration Cell
        const tdDuration = document.createElement('td');
        tdDuration.textContent = v.duration ? `${v.duration.toFixed(1)}s` : '--';
        row.appendChild(tdDuration);

        // Created At Cell
        const tdCreated = document.createElement('td');
        tdCreated.textContent = v.created_at ? new Date(v.created_at + 'Z').toLocaleString() : '--';
        row.appendChild(tdCreated);

        // Actions Cell
        const tdActions = document.createElement('td');
        if (v.status === 'ready') {
            const playBtn = document.createElement('button');
            playBtn.className = 'btn-play';
            playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
            playBtn.title = 'Play Stream';
            playBtn.addEventListener('click', () => {
                const streamUrl = v.delivery_url || `/videos/${v.video_id}/master.m3u8`;
                openPlayer(streamUrl, v.video_id, v.renditions || []);
            });
            tdActions.appendChild(playBtn);
        } else {
            tdActions.textContent = '--';
            tdActions.style.color = 'var(--text-muted)';
        }
        row.appendChild(tdActions);

        libraryTbody.appendChild(row);
    });
}

// Embedded HLS Player Modal Logic
function setupPlayerModal() {
    btnCloseModal.addEventListener('click', closePlayer);
    
    btnCopyManifest.addEventListener('click', () => {
        manifestUrlInput.select();
        navigator.clipboard.writeText(manifestUrlInput.value);
        
        // Show temp checkmark icon on copy button
        const oldIcon = btnCopyManifest.innerHTML;
        btnCopyManifest.innerHTML = '<i class="fa-solid fa-check" style="color: var(--color-success)"></i>';
        setTimeout(() => {
            btnCopyManifest.innerHTML = oldIcon;
        }, 1500);
    });
}

function openPlayer(url, videoId, renditions) {
    playerModal.classList.remove('hidden');
    playerVideoId.textContent = `ID: ${videoId}`;
    manifestUrlInput.value = window.location.origin + url;

    // Reset Selector
    qualitySelect.innerHTML = '<option value="auto">Adaptive Bitrate (Auto)</option>';
    qualitySelect.disabled = false;

    if (Hls.isSupported()) {
        hlsPlayer = new Hls({
            maxMaxBufferLength: 10,
            enableWorker: true
        });
        hlsPlayer.loadSource(url);
        hlsPlayer.attachMedia(hlsVideo);
        
        hlsPlayer.on(Hls.Events.MANIFEST_PARSED, () => {
            hlsVideo.play();
            
            // Populate the quality selector dynamically from parsed HLS manifest levels!
            qualitySelect.innerHTML = '<option value="auto">Adaptive Bitrate (Auto)</option>';
            hlsPlayer.levels.forEach((level, index) => {
                const opt = document.createElement('option');
                opt.value = index; // Store level index directly
                
                const height = level.height || 'Source';
                const bitrate = level.bitrate ? `${Math.round(level.bitrate / 1000)}k` : 'unknown';
                const name = level.attrs.NAME || `${height}p`;
                
                opt.textContent = `${name} (${height}p @ ${bitrate})`;
                qualitySelect.appendChild(opt);
            });
        });

        // Sync Select Dropdown with active hls.js level index
        qualitySelect.addEventListener('change', () => {
            const val = qualitySelect.value;
            if (val === 'auto') {
                hlsPlayer.currentLevel = -1; // -1 triggers ABR auto select
            } else {
                hlsPlayer.currentLevel = parseInt(val);
            }
        });
        
        hlsPlayer.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
            console.log(`Switched to HLS level: ${data.level}`);
        });

        hlsPlayer.on(Hls.Events.ERROR, (event, data) => {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.error('Fatal network error, trying to recover...');
                        hlsPlayer.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.error('Fatal media error, trying to recover...');
                        hlsPlayer.recoverMediaError();
                        break;
                    default:
                        console.error('Unrecoverable HLS error');
                        closePlayer();
                        break;
                }
            }
        });
    } 
    // Fallback for native HLS (iOS Safari / macOS Safari)
    else if (hlsVideo.canPlayType('application/vnd.apple.mpegurl')) {
        hlsVideo.src = url;
        hlsVideo.addEventListener('loadedmetadata', () => {
            hlsVideo.play();
        });
        
        // Quality selector is disabled/hidden for native playback
        qualitySelect.disabled = true;
    }
}

function closePlayer() {
    hlsVideo.pause();
    hlsVideo.src = '';
    if (hlsPlayer) {
        hlsPlayer.destroy();
        hlsPlayer = null;
    }
    playerModal.classList.add('hidden');
}
