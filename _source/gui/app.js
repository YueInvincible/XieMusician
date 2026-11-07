/**
 * Xie's Musician Pro - High Taste Minimalist HUD & Studio Controller
 * Custom Playlists, Multi-Instrument Soundfonts, Audio-to-Sheet AI/DSP, Online Sheet Store
 */

// Note Frequencies (C4 to C6)
const NOTE_FREQUENCIES = {
  "A1": 261.63, "A2": 293.66, "A3": 329.63, "A4": 349.23, "A5": 392.00,
  "B1": 440.00, "B2": 493.88, "B3": 523.25, "B4": 587.33, "B5": 659.25,
  "C1": 698.46, "C2": 783.99, "C3": 880.00, "C4": 987.77, "C5": 1046.50
};

const NOTE_SOLFEGE = {
  "A1": "Do", "A2": "Re", "A3": "Mi", "A4": "Fa", "A5": "Sol",
  "B1": "La", "B2": "Si", "B3": "Do'", "B4": "Re'", "B5": "Mi'",
  "C1": "Fa'", "C2": "Sol'", "C3": "La'", "C4": "Si'", "C5": "Do''"
};

let KEY_LABELS = {
  "A1": "Y", "A2": "U", "A3": "I", "A4": "O", "A5": "P",
  "B1": "H", "B2": "J", "B3": "K", "B4": "L", "B5": ";",
  "C1": "N", "C2": "M", "C3": ",", "C4": ".", "C5": "/"
};

const KEY_ORDER = [
  "A1", "A2", "A3", "A4", "A5",
  "B1", "B2", "B3", "B4", "B5",
  "C1", "C2", "C3", "C4", "C5"
];

// App States
let audioCtx = null;
let isAudioPreviewActive = false;
let currentSpeed = 1.0;
let songsList = [];
let selectedSong = null;
let currentEngineState = 'idle';
let isFullView = false;
let playbackMode = null; // 'game' or 'preview'
let isMiniDropdownOpen = false;

// Playlists & Instruments State
let currentPlaylist = 'Tất cả';
let currentInstrument = 'piano';
let playlistsData = {};
let songTargetForPlaylist = null;

// DOM Elements - Shells
const miniView = document.getElementById('miniView');
const fullView = document.getElementById('fullView');

// Mini Elements
const miniSongTitle = document.getElementById('miniSongTitle');
const miniSongDropdown = document.getElementById('miniSongDropdown');
const miniSearchInput = document.getElementById('miniSearchInput');
const miniPlaylistFilter = document.getElementById('miniPlaylistFilter');
const miniDropdownList = document.getElementById('miniDropdownList');
const btnPrevSongMini = document.getElementById('btnPrevSongMini');
const btnNextSongMini = document.getElementById('btnNextSongMini');
const miniTimeElapsed = document.getElementById('miniTimeElapsed');
const miniTimeRemaining = document.getElementById('miniTimeRemaining');
const miniProgressBar = document.getElementById('miniProgressBar');
const miniProgressThumb = document.getElementById('miniProgressThumb');
const miniProgressClickArea = document.getElementById('miniProgressClickArea');
const miniStatusLabel = document.getElementById('miniStatusLabel');
const btnPlayInGame = document.getElementById('btnPlayInGame');
const gamePlayIcon = document.getElementById('gamePlayIcon');
const gamePlayText = document.getElementById('gamePlayText');
const btnPreviewSound = document.getElementById('btnPreviewSound');
const previewSoundIcon = document.getElementById('previewSoundIcon');
const previewSoundText = document.getElementById('previewSoundText');
const btnStopMini = document.getElementById('btnStopMini');
const btnExpandToFull = document.getElementById('btnExpandToFull');
const btnCloseApp = document.getElementById('btnCloseApp');

// Full Studio Elements
const fullSongTitle = document.getElementById('fullSongTitle');
const fullSongAuthor = document.getElementById('fullSongAuthor');
const fullSongFormat = document.getElementById('fullSongFormat');
const fullSongNotes = document.getElementById('fullSongNotes');
const fullTimeElapsed = document.getElementById('fullTimeElapsed');
const fullTimeRemaining = document.getElementById('fullTimeRemaining');
const fullSeekFill = document.getElementById('fullSeekFill');
const fullSeekThumb = document.getElementById('fullSeekThumb');
const fullSeekTrack = document.getElementById('fullSeekTrack');
const btnFullPlayGame = document.getElementById('btnFullPlayGame');
const fullGamePlayIcon = document.getElementById('fullGamePlayIcon');
const fullGamePlayText = document.getElementById('fullGamePlayText');
const btnFullPreview = document.getElementById('btnFullPreview');
const fullPreviewIcon = document.getElementById('fullPreviewIcon');
const fullPreviewText = document.getElementById('fullPreviewText');
const btnFullStop = document.getElementById('btnFullStop');
const btnCollapseToMini = document.getElementById('btnCollapseToMini');
const btnCloseAppFull = document.getElementById('btnCloseAppFull');
const selectInstrument = document.getElementById('selectInstrument');
const selectKeyPreset = document.getElementById('selectKeyPreset');
const speedSlider = document.getElementById('speedSlider');
const speedValueDisplay = document.getElementById('speedValueDisplay');
const fullInstrumentGrid = document.getElementById('fullInstrumentGrid');
const waterfallCanvas = document.getElementById('waterfallCanvas');

// Sidebar Tabs & Views
const tabBtnLocal = document.getElementById('tabBtnLocal');
const tabBtnOnline = document.getElementById('tabBtnOnline');
const viewLocalLib = document.getElementById('viewLocalLib');
const viewOnlineLib = document.getElementById('viewOnlineLib');

// Local Library Elements
const midiDropZone = document.getElementById('midiDropZone');
const dropZoneText = document.getElementById('dropZoneText');
const fileInputMidi = document.getElementById('fileInputMidi');
const btnBrowseFile = document.getElementById('btnBrowseFile');
const libSongList = document.getElementById('libSongList');
const libSongCount = document.getElementById('libSongCount');
const libSearchInput = document.getElementById('libSearchInput');
const btnOpenFolderSide = document.getElementById('btnOpenFolderSide');
const playlistPills = document.getElementById('playlistPills');
const btnNewPlaylist = document.getElementById('btnNewPlaylist');

// Online Sheet Store Elements
const onlineSearchInput = document.getElementById('onlineSearchInput');
const onlineSongList = document.getElementById('onlineSongList');
const onlineUrlInput = document.getElementById('onlineUrlInput');
const btnDownloadUrl = document.getElementById('btnDownloadUrl');

// Modals
const modalNewPlaylist = document.getElementById('modalNewPlaylist');
const inputPlaylistName = document.getElementById('inputPlaylistName');
const btnCancelPlaylist = document.getElementById('btnCancelPlaylist');
const btnConfirmPlaylist = document.getElementById('btnConfirmPlaylist');
const modalAddToPlaylist = document.getElementById('modalAddToPlaylist');
const playlistPickerSongTitle = document.getElementById('playlistPickerSongTitle');
const playlistCheckboxList = document.getElementById('playlistCheckboxList');
const btnCloseAddToPlaylist = document.getElementById('btnCloseAddToPlaylist');

// Header / Mini Wrench buttons
const btnSettingsMini = document.getElementById('btnSettingsMini');
const btnSettingsFull = document.getElementById('btnSettingsFull');

// Settings Keybind Modal
const modalSettingsKeybind = document.getElementById('modalSettingsKeybind');
const btnCloseSettingsModalX = document.getElementById('btnCloseSettingsModalX');
const btnCancelKeybinds = document.getElementById('btnCancelKeybinds');
const btnSaveKeybinds = document.getElementById('btnSaveKeybinds');
const btnResetKeybinds = document.getElementById('btnResetKeybinds');
const keybindBoxToggleHud = document.getElementById('keybindBoxToggleHud');
const keybindBoxPlayPause = document.getElementById('keybindBoxPlayPause');
const keybindBoxEmergencyStop = document.getElementById('keybindBoxEmergencyStop');
const keybindConflictAlert = document.getElementById('keybindConflictAlert');

// Rename Song Modal
const modalRenameSong = document.getElementById('modalRenameSong');
const inputRenameSong = document.getElementById('inputRenameSong');
const btnCancelRenameSong = document.getElementById('btnCancelRenameSong');
const btnConfirmRenameSong = document.getElementById('btnConfirmRenameSong');

// Delete Confirm Modal
const modalConfirmDelete = document.getElementById('modalConfirmDelete');
const deleteConfirmPromptText = document.getElementById('deleteConfirmPromptText');
const btnCancelDeleteSong = document.getElementById('btnCancelDeleteSong');
const btnConfirmDeleteSong = document.getElementById('btnConfirmDeleteSong');

// Queue Elements & Controls
const tabBtnQueue = document.getElementById('tabBtnQueue');
const viewQueueLib = document.getElementById('viewQueueLib');
const queueBadge = document.getElementById('queueBadge');
const queueSongList = document.getElementById('queueSongList');
const btnClearQueue = document.getElementById('btnClearQueue');
const btnStartQueuePlay = document.getElementById('btnStartQueuePlay');
const btnShuffleQueue = document.getElementById('btnShuffleQueue');
const btnLoopQueue = document.getElementById('btnLoopQueue');
const loopQueueText = document.getElementById('loopQueueText');
const btnPlayAllPlaylist = document.getElementById('btnPlayAllPlaylist');

// Online Subtab Elements
const subtabBtnOnlineStore = document.getElementById('subtabBtnOnlineStore');
const subtabBtnConverter = document.getElementById('subtabBtnConverter');
const paneOnlineStore = document.getElementById('paneOnlineStore');
const paneOnlineConverter = document.getElementById('paneOnlineConverter');

// Context Menu Items
const ctxMenuQueue = document.getElementById('ctxMenuQueue');
const ctxMenuRename = document.getElementById('ctxMenuRename');

// Playback Queue State
let playbackQueue = [];
let currentQueueIndex = -1;
let isQueueLoopEnabled = false;
let isQueueRunning = false;
let queuePlaybackMode = 'game';

// Keybind Management State
let currentKeybinds = {
  toggle_hud: 'right shift',
  play_pause: 'f6',
  emergency_stop: 'f8'
};
let tempKeybinds = { ...currentKeybinds };
let activeCapturingAction = null;

// Target Songs for Modals
let songTargetForRename = null;
let songTargetForDelete = null;


/* ==========================================================
   1. Audio Synthesizer (Multi-Instrument Sky Soundfonts)
   ========================================================== */
let masterGain = null;

async function initAudio() {
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.85, audioCtx.currentTime);
    masterGain.connect(audioCtx.destination);
  }
  if (audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (e) {
      console.warn("audioCtx.resume error:", e);
    }
  }
}

// Unlock audio on initial interaction
window.addEventListener('click', () => initAudio(), { once: true });
window.addEventListener('mousedown', () => initAudio(), { once: true });
window.addEventListener('keydown', () => initAudio(), { once: true });

function playNoteSound(noteName, force = false) {
  if (!isAudioPreviewActive && !force) return;
  if (!audioCtx) initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  const upperNote = (noteName || '').toUpperCase();
  const freq = NOTE_FREQUENCIES[upperNote];
  if (!freq) return;

  try {
    const now = audioCtx.currentTime;
    const dest = masterGain || audioCtx.destination;
    const inst = currentInstrument || 'piano';

    if (inst === 'harp') {
      // Đàn Hạc (Harp): Plucked string, fast attack, crisp decay
      const osc1 = audioCtx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.0, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.48, now + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.9);
      osc2.stop(now + 0.9);

    } else if (inst === 'flute') {
      // Sáo Trúc (Flute): Breathy tone, soft attack, gentle vibrato
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      const vibrato = audioCtx.createOscillator();
      vibrato.frequency.setValueAtTime(5.5, now);
      const vibratoGain = audioCtx.createGain();
      vibratoGain.gain.setValueAtTime(3.0, now);
      vibrato.connect(osc.frequency);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.38, now + 0.045);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

      osc.connect(gain);
      gain.connect(dest);

      vibrato.start(now);
      osc.start(now);
      vibrato.stop(now + 1.15);
      osc.stop(now + 1.15);

    } else if (inst === 'kalimba') {
      // Kalimba / Chuông: Crystalline metallic ring, rich high overtone
      const osc1 = audioCtx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 3.01, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.42, now + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(dest);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.4);
      osc2.stop(now + 1.4);

    } else if (inst === 'horn') {
      // Kèn Horn: Brass harmonics with low-pass filter
      const osc = audioCtx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);

      const filter = audioCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, now);

      const gain = audioCtx.createGain();
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.32, now + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.95);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 1.0);

    } else {
      // Default: Đàn Piano (Grand Piano): Warm, rich multi-harmonic sustain
      const osc1 = audioCtx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);

      const osc2 = audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.0, now);

      const osc3 = audioCtx.createOscillator();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(freq * 3.0, now);

      const gain1 = audioCtx.createGain();
      gain1.gain.setValueAtTime(0.0001, now);
      gain1.gain.linearRampToValueAtTime(0.45, now + 0.012);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);

      const gain2 = audioCtx.createGain();
      gain2.gain.setValueAtTime(0.0001, now);
      gain2.gain.linearRampToValueAtTime(0.18, now + 0.010);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

      osc1.connect(gain1);
      osc2.connect(gain2);
      osc3.connect(gain2);

      gain1.connect(dest);
      gain2.connect(dest);

      osc1.start(now);
      osc2.start(now);
      osc3.start(now);
      osc1.stop(now + 1.7);
      osc2.stop(now + 1.7);
      osc3.stop(now + 1.7);
    }
  } catch (err) {
    console.error('Audio play error:', err);
  }
}


/* ==========================================================
   2. Keyboard Generator (3x5 Layout)
   ========================================================== */
function buildKeyboard() {
  fullInstrumentGrid.innerHTML = '';

  KEY_ORDER.forEach((note) => {
    const keyEl = document.createElement('div');
    keyEl.className = 'sky-key';
    keyEl.dataset.note = note;

    const inner = document.createElement('div');
    inner.className = 'key-inner';

    const noteLabel = document.createElement('span');
    noteLabel.className = 'key-note-label';
    noteLabel.textContent = note;

    const solfegeLabel = document.createElement('span');
    solfegeLabel.className = 'key-solfege-label';
    solfegeLabel.textContent = NOTE_SOLFEGE[note] || '';

    const hotkeyChar = document.createElement('span');
    hotkeyChar.className = 'key-hotkey-char';
    hotkeyChar.textContent = KEY_LABELS[note] || '';

    inner.appendChild(noteLabel);
    inner.appendChild(solfegeLabel);
    inner.appendChild(hotkeyChar);
    keyEl.appendChild(inner);

    keyEl.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      triggerKeyVisual(note);
      initAudio();
      playNoteSound(note, true);
      if (isFullView) addWaterfallDrop(note);
    });

    fullInstrumentGrid.appendChild(keyEl);
  });
}

function triggerKeyVisual(noteName) {
  const el = fullInstrumentGrid.querySelector(`.sky-key[data-note="${noteName}"]`);
  if (!el) return;
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 180);
}


/* ==========================================================
   3. Waterfall Light Canvas Animation
   ========================================================== */
let drops = [];

function initWaterfall() {
  resizeWaterfall();
  window.addEventListener('resize', resizeWaterfall);
  requestAnimationFrame(animateWaterfall);
}

function resizeWaterfall() {
  if (!waterfallCanvas) return;
  const rect = waterfallCanvas.parentElement.getBoundingClientRect();
  waterfallCanvas.width = rect.width;
  waterfallCanvas.height = rect.height;
}

function addWaterfallDrop(note) {
  const idx = KEY_ORDER.indexOf(note);
  if (idx < 0) return;
  const colWidth = waterfallCanvas.width / 15;
  const x = idx * colWidth + colWidth / 2;

  drops.push({
    x: x,
    y: 0,
    width: colWidth * 0.7,
    speed: waterfallCanvas.height / 14,
    height: 14
  });
}

function animateWaterfall() {
  const ctx = waterfallCanvas.getContext('2d');
  ctx.clearRect(0, 0, waterfallCanvas.width, waterfallCanvas.height);

  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.y += d.speed;

    ctx.fillStyle = '#ffd166';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ffd166';
    ctx.fillRect(d.x - d.width / 2, d.y, d.width, d.height);

    if (d.y > waterfallCanvas.height - 2) {
      drops.splice(i, 1);
    }
  }

  requestAnimationFrame(animateWaterfall);
}


/* ==========================================================
   4. View Switcher (Mini HUD vs Full Studio)
   ========================================================== */
function setViewMode(mode) {
  if (mode === 'full') {
    isFullView = true;
    if (isMiniDropdownOpen) toggleMiniDropdown(false);
    miniView.classList.add('hidden');
    fullView.classList.remove('hidden');
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_window_size(1240, 780);
    }
    setTimeout(resizeWaterfall, 100);
  } else {
    isFullView = false;
    fullView.classList.add('hidden');
    miniView.classList.remove('hidden');
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_window_size(380, 115);
    }
  }
}


/* ==========================================================
   5. Song Library, Custom Playlists & Instruments
   ========================================================== */
function fetchPlaylists() {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.get_playlists().then((data) => {
      playlistsData = data || {};
      renderPlaylists();
      renderLibrary();
      renderMiniDropdown();
    });
  }
}

function renderPlaylists() {
  const allNames = ['Tất cả', ...Object.keys(playlistsData)];

  // 1. Full Studio playlist pills
  playlistPills.innerHTML = '';
  allNames.forEach((name) => {
    const pill = document.createElement('div');
    pill.className = `playlist-pill ${currentPlaylist === name ? 'active' : ''}`;
    pill.textContent = name;

    pill.addEventListener('click', () => {
      currentPlaylist = name;
      renderPlaylists();
      renderLibrary();
      renderMiniDropdown();
    });

    playlistPills.appendChild(pill);
  });

  // 2. Mini HUD playlist pills
  if (miniPlaylistFilter) {
    miniPlaylistFilter.innerHTML = '';
    allNames.forEach((name) => {
      const pill = document.createElement('div');
      pill.className = `mini-playlist-pill ${currentPlaylist === name ? 'active' : ''}`;
      pill.textContent = name;

      pill.addEventListener('click', (e) => {
        e.stopPropagation();
        currentPlaylist = name;
        renderPlaylists();
        renderLibrary();
        renderMiniDropdown();
      });

      miniPlaylistFilter.appendChild(pill);
    });
  }
}

function renderLibrary() {
  const q = libSearchInput.value.toLowerCase().trim();
  libSongList.innerHTML = '';

  const filtered = songsList.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(q) || (s.author && s.author.toLowerCase().includes(q));
    if (!matchSearch) return false;

    if (currentPlaylist === 'Tất cả') return true;
    if (currentPlaylist === 'Yêu thích') return s.is_favorite;
    return s.playlists && s.playlists.includes(currentPlaylist);
  });

  libSongCount.textContent = `${filtered.length}`;

  if (filtered.length === 0) {
    if (songsList.length === 0) {
      libSongList.innerHTML = `
        <div class="empty-state-card">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-state-icon">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
          <div class="empty-state-title">Chưa có bài hát trong thư viện</div>
          <div class="empty-state-desc">Kéo thả file âm thanh (MP3, WAV), MIDI hoặc Sheet (.json/.txt) vào khung bên trên để tạo bài hát, hoặc tải trực tiếp từ Kho Sheet Trực Tuyến.</div>
          <button class="empty-state-btn" onclick="document.getElementById('tabBtnOnline').click()">
            Mở Kho Sheet Trực Tuyến
          </button>
        </div>
      `;
    } else {
      libSongList.innerHTML = '<div class="online-placeholder">Không có bài hát nào khớp với bộ lọc hiện tại.</div>';
    }
    return;
  }

  filtered.forEach((song) => {
    const card = document.createElement('div');
    card.className = 'song-card';
    if (selectedSong && selectedSong.filename === song.filename) {
      card.classList.add('selected');
    }

    const instMap = {
      'piano': 'Piano',
      'harp': 'Đàn Hạc',
      'flute': 'Sáo Trúc',
      'kalimba': 'Kalimba',
      'horn': 'Kèn Horn'
    };
    const instLabel = instMap[song.instrument] || 'Piano';

    card.innerHTML = `
      <div class="card-left">
        <div class="card-title">${escapeHtml(song.title)}</div>
        <div class="card-meta">${song.format} • ${formatTime(song.duration)} • ${song.notes_count} nốt • ${escapeHtml(song.author || 'Sky')}</div>
      </div>
      <div class="card-actions no-drag">
        <button class="fav-btn ${song.is_favorite ? 'active' : ''}" title="Yêu thích">
          <svg viewBox="0 0 24 24" fill="${song.is_favorite ? '#ffd166' : 'none'}" stroke="${song.is_favorite ? '#ffd166' : 'currentColor'}" stroke-width="2" width="13" height="13">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
        </button>
        <button class="card-icon-btn btn-queue-add" title="Thêm vào Hàng đợi (+ Queue)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
        </button>
        <button class="card-icon-btn btn-rename-song" title="Đổi tên bài hát">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>
        <button class="card-icon-btn btn-delete-song" title="Xóa bài hát">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
        <span class="instrument-badge" title="Đổi nhạc cụ">${instLabel}</span>
        <button class="playlist-add-btn" title="Thêm vào Playlist">+ Playlist</button>
      </div>
    `;

    card.addEventListener('click', (e) => {
      if (e.target.closest('.fav-btn')) {
        e.stopPropagation();
        toggleFavorite(song);
        return;
      }
      if (e.target.closest('.btn-queue-add')) {
        e.stopPropagation();
        addToQueue(song);
        return;
      }
      if (e.target.closest('.btn-rename-song')) {
        e.stopPropagation();
        openRenameModal(song);
        return;
      }
      if (e.target.closest('.btn-delete-song')) {
        e.stopPropagation();
        openDeleteModal(song);
        return;
      }
      if (e.target.closest('.instrument-badge')) {
        e.stopPropagation();
        cycleSongInstrument(song);
        return;
      }
      if (e.target.closest('.playlist-add-btn')) {
        e.stopPropagation();
        openAddToPlaylistModal(song);
        return;
      }
      selectSong(song);
    });

    card.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showSongContextMenu(e, song);
    });

    libSongList.appendChild(card);
  });
}

// Custom Context Menu for Local Songs (Right-click)
const songContextMenu = document.getElementById('songContextMenu');
const ctxMenuPlay = document.getElementById('ctxMenuPlay');
const ctxMenuPreview = document.getElementById('ctxMenuPreview');
const ctxMenuPlaylist = document.getElementById('ctxMenuPlaylist');
const ctxMenuDelete = document.getElementById('ctxMenuDelete');
let contextTargetSong = null;

function showSongContextMenu(e, song) {
  if (!songContextMenu) return;
  contextTargetSong = song;

  const menuWidth = 190;
  const menuHeight = 220;
  let x = e.clientX;
  let y = e.clientY;

  if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
  if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

  songContextMenu.style.left = `${Math.max(10, x)}px`;
  songContextMenu.style.top = `${Math.max(10, y)}px`;
  songContextMenu.classList.remove('hidden');
}

function hideSongContextMenu() {
  if (songContextMenu) {
    songContextMenu.classList.add('hidden');
    contextTargetSong = null;
  }
}

function selectSong(song) {
  selectedSong = song;

  // Mini HUD labels
  miniSongTitle.textContent = `${song.title} - ${song.author || 'Sky CotL'}`;
  miniTimeRemaining.textContent = `-${formatTime(song.duration)}`;
  miniTimeElapsed.textContent = '00:00';
  miniProgressBar.style.width = '0%';
  miniProgressThumb.style.left = '0%';

  // Full Studio labels
  fullSongTitle.textContent = song.title;
  fullSongAuthor.textContent = song.author || 'Sơn Tùng M-TP';
  fullSongFormat.textContent = song.format;
  fullSongNotes.textContent = `${song.notes_count} nốt`;
  fullTimeRemaining.textContent = `-${formatTime(song.duration)}`;
  fullTimeElapsed.textContent = '00:00';
  fullSeekFill.style.width = '0%';
  fullSeekThumb.style.left = '0%';

  // Update Instrument selector
  currentInstrument = song.instrument || 'piano';
  if (selectInstrument) selectInstrument.value = currentInstrument;

  renderLibrary();
  renderMiniDropdown();

  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.select_song(song.filename);
  }
}

function cycleSong(dir) {
  if (!songsList || songsList.length === 0) return;
  let idx = songsList.findIndex((s) => s.filename === (selectedSong ? selectedSong.filename : ''));
  if (idx === -1) idx = 0;
  idx = (idx + dir + songsList.length) % songsList.length;
  stopPlayback();
  selectSong(songsList[idx]);
}

function toggleFavorite(song) {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.toggle_favorite(song.filename).then((isFav) => {
      song.is_favorite = isFav;
      fetchPlaylists();
    });
  }
}

function cycleSongInstrument(song) {
  const instruments = ['piano', 'harp', 'flute', 'kalimba', 'horn'];
  let currentIdx = instruments.indexOf(song.instrument || 'piano');
  let nextInst = instruments[(currentIdx + 1) % instruments.length];
  song.instrument = nextInst;
  if (selectedSong && selectedSong.filename === song.filename) {
    currentInstrument = nextInst;
    if (selectInstrument) selectInstrument.value = nextInst;
  }
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.update_song_instrument(song.filename, nextInst).then(() => {
      renderLibrary();
    });
  }
}


/* ==========================================================
   5.1 Mini HUD Song Dropdown Selector
   ========================================================== */
function toggleMiniDropdown(force) {
  if (force !== undefined) {
    isMiniDropdownOpen = force;
  } else {
    isMiniDropdownOpen = !isMiniDropdownOpen;
  }

  if (isMiniDropdownOpen) {
    miniSongDropdown.classList.remove('hidden');
    miniSearchInput.value = '';
    renderMiniDropdown();
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.set_window_size(380, 360);
    }
    setTimeout(() => miniSearchInput.focus(), 60);
  } else {
    miniSongDropdown.classList.add('hidden');
    if (window.pywebview && window.pywebview.api && !isFullView) {
      window.pywebview.api.set_window_size(380, 115);
    }
  }
}

function renderMiniDropdown() {
  const query = (miniSearchInput.value || '').trim().toLowerCase();
  miniDropdownList.innerHTML = '';

  const filtered = songsList.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(query) || (s.author && s.author.toLowerCase().includes(query));
    if (!matchSearch) return false;

    if (currentPlaylist === 'Tất cả') return true;
    if (currentPlaylist === 'Yêu thích') return s.is_favorite;
    return s.playlists && s.playlists.includes(currentPlaylist);
  });

  if (filtered.length === 0) {
    miniDropdownList.innerHTML = '<div style="padding: 12px; text-align: center; font-size: 0.75rem; color: var(--text-dim);">Không tìm thấy bài hát trong playlist này</div>';
    return;
  }

  filtered.forEach((song) => {
    const item = document.createElement('div');
    item.className = 'mini-dropdown-item no-drag';
    if (selectedSong && selectedSong.filename === song.filename) {
      item.classList.add('active');
    }

    item.innerHTML = `
      <span class="mini-dropdown-item-title no-drag">${escapeHtml(song.title)}</span>
      <span class="mini-dropdown-item-meta no-drag">${formatTime(song.duration)} • ${song.notes_count}n</span>
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      stopPlayback();
      selectSong(song);
      toggleMiniDropdown(false);
    });

    miniDropdownList.appendChild(item);
  });
}


/* ==========================================================
   5.2 Playlist Management Modals
   ========================================================== */
function openNewPlaylistModal() {
  modalNewPlaylist.classList.remove('hidden');
  inputPlaylistName.value = '';
  setTimeout(() => inputPlaylistName.focus(), 60);
}

function closeNewPlaylistModal() {
  modalNewPlaylist.classList.add('hidden');
}

function confirmNewPlaylist() {
  const name = inputPlaylistName.value.trim();
  if (!name) return;
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.create_playlist(name).then((res) => {
      if (res) {
        closeNewPlaylistModal();
        currentPlaylist = name;
        fetchPlaylists();
      }
    });
  }
}

function openAddToPlaylistModal(song) {
  songTargetForPlaylist = song;
  playlistPickerSongTitle.textContent = `Thêm "${song.title}" vào:`;
  playlistCheckboxList.innerHTML = '';

  const customNames = Object.keys(playlistsData);
  customNames.forEach((plName) => {
    const isIn = song.playlists && song.playlists.includes(plName);
    const row = document.createElement('label');
    row.className = 'playlist-check-item';
    row.innerHTML = `
      <input type="checkbox" ${isIn ? 'checked' : ''} value="${escapeHtml(plName)}">
      <span>${escapeHtml(plName)}</span>
    `;

    const chk = row.querySelector('input');
    chk.addEventListener('change', () => {
      if (chk.checked) {
        window.pywebview.api.add_song_to_playlist(plName, song.filename).then(() => fetchPlaylists());
      } else {
        window.pywebview.api.remove_song_from_playlist(plName, song.filename).then(() => fetchPlaylists());
      }
    });

    playlistCheckboxList.appendChild(row);
  });

  modalAddToPlaylist.classList.remove('hidden');
}

function closeAddToPlaylistModal() {
  modalAddToPlaylist.classList.add('hidden');
  songTargetForPlaylist = null;
}


/* ==========================================================
   6. Playback & In-Game Actions (Play / Pause / Resume)
   ========================================================== */
function handleGamePlayToggle() {
  if (!selectedSong) return;

  if (playbackQueue.length > 0) {
    isQueueRunning = true;
    queuePlaybackMode = 'game';
  }

  if (playbackMode === 'game') {
    if (currentEngineState === 'playing') {
      if (window.pywebview && window.pywebview.api) window.pywebview.api.pause();
    } else if (currentEngineState === 'paused') {
      if (window.pywebview && window.pywebview.api) window.pywebview.api.play_in_game(selectedSong.filename, currentSpeed);
    } else {
      playInGame();
    }
  } else {
    stopPlayback();
    playInGame();
  }
}

async function handlePreviewToggle() {
  if (!selectedSong) return;

  if (playbackMode === 'preview') {
    if (currentEngineState === 'playing') {
      if (window.pywebview && window.pywebview.api) window.pywebview.api.pause();
    } else if (currentEngineState === 'paused') {
      if (window.pywebview && window.pywebview.api) window.pywebview.api.resume();
    } else {
      await playPreview();
    }
  } else {
    // If was playing in game, stop game mode first
    if (playbackMode === 'game') {
      if (window.pywebview && window.pywebview.api) window.pywebview.api.stop();
    }
    await playPreview();
  }
}

function playInGame() {
  playbackMode = 'game';
  queuePlaybackMode = 'game';
  if (playbackQueue.length > 0) {
    isQueueRunning = true;
  }
  isAudioPreviewActive = false;
  if (window.pywebview && window.pywebview.api && selectedSong) {
    window.pywebview.api.play_in_game(selectedSong.filename, currentSpeed);
  }
}

async function playPreview() {
  if (!selectedSong) return;
  playbackMode = 'preview';
  queuePlaybackMode = 'preview';
  isAudioPreviewActive = true;
  await initAudio();
  if (audioCtx && audioCtx.state === 'suspended') {
    try {
      await audioCtx.resume();
    } catch (e) {
      console.warn("audioCtx.resume error:", e);
    }
  }
  updateControlsUI('playing');
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.play_preview_in_app(selectedSong.filename, currentSpeed);
  }
}

function stopPlayback() {
  isQueueRunning = false;
  queuePlaybackMode = null;
  playbackMode = null;
  isAudioPreviewActive = false;
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.stop();
  }
  updateControlsUI('idle');
}

function updateControlsUI(state) {
  const isPlaying = (state === 'playing');
  const isPaused = (state === 'paused');

  // Mini Game Button
  if (playbackMode === 'game' && isPlaying) {
    gamePlayIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
    gamePlayText.textContent = 'Tạm dừng';
  } else if (playbackMode === 'game' && isPaused) {
    gamePlayIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    gamePlayText.textContent = 'Tiếp tục';
  } else {
    gamePlayIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    gamePlayText.textContent = 'Vào Game';
  }

  // Mini Preview Button
  if (playbackMode === 'preview' && isPlaying) {
    previewSoundIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
    previewSoundText.textContent = 'Tạm dừng';
    btnPreviewSound.classList.add('active');
  } else if (playbackMode === 'preview' && isPaused) {
    previewSoundIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
    previewSoundText.textContent = 'Tiếp tục';
    btnPreviewSound.classList.add('active');
  } else {
    previewSoundIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`;
    previewSoundText.textContent = 'Nghe thử';
    btnPreviewSound.classList.remove('active');
  }

  // Full Studio Controls
  if (fullGamePlayIcon && fullGamePlayText) {
    if (playbackMode === 'game' && isPlaying) {
      fullGamePlayIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
      fullGamePlayText.textContent = 'Tạm dừng';
    } else if (playbackMode === 'game' && isPaused) {
      fullGamePlayIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      fullGamePlayText.textContent = 'Tiếp tục';
    } else {
      fullGamePlayIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      fullGamePlayText.textContent = 'Phát vào Game (Ẩn App)';
    }
  }

  if (fullPreviewIcon && fullPreviewText) {
    if (playbackMode === 'preview' && isPlaying) {
      fullPreviewIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`;
      fullPreviewText.textContent = 'Tạm dừng';
      btnFullPreview.classList.add('active');
    } else if (playbackMode === 'preview' && isPaused) {
      fullPreviewIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      fullPreviewText.textContent = 'Tiếp tục';
      btnFullPreview.classList.add('active');
    } else {
      fullPreviewIcon.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`;
      fullPreviewText.textContent = 'Nghe thử';
      btnFullPreview.classList.remove('active');
    }
  }

  // Status Label
  if (state === 'idle') {
    miniStatusLabel.textContent = 'SẴN SÀNG';
    miniStatusLabel.style.color = 'var(--text-muted)';
  } else if (state === 'countdown') {
    miniStatusLabel.textContent = 'ĐẾM NGƯỢC...';
    miniStatusLabel.style.color = 'var(--danger)';
  } else if (state === 'playing') {
    miniStatusLabel.textContent = (playbackMode === 'preview' ? 'ĐANG NGHE THỬ' : 'ĐANG VÀO GAME');
    miniStatusLabel.style.color = 'var(--success)';
  } else if (state === 'paused') {
    miniStatusLabel.textContent = 'TẠM DỪNG';
    miniStatusLabel.style.color = 'var(--gold-primary)';
  }
}


/* ==========================================================
   7. Python Engine Callbacks
   ========================================================== */
window.onNotePlayed = function(notes, timeSec) {
  notes.forEach((note) => {
    triggerKeyVisual(note);
    if (isAudioPreviewActive || playbackMode === 'preview') {
      playNoteSound(note, true);
    }
    if (isFullView) addWaterfallDrop(note);
  });
};

window.onProgressTick = function(currentSec, totalSec, pct) {
  const percent = Math.min(100, Math.max(0, pct * 100));
  const remaining = Math.max(0, totalSec - currentSec);

  // Mini HUD
  miniTimeElapsed.textContent = formatTime(currentSec);
  miniTimeRemaining.textContent = `-${formatTime(remaining)}`;
  miniProgressBar.style.width = `${percent}%`;
  miniProgressThumb.style.left = `${percent}%`;

  // Full Studio
  fullTimeElapsed.textContent = formatTime(currentSec);
  fullTimeRemaining.textContent = `-${formatTime(remaining)}`;
  fullSeekFill.style.width = `${percent}%`;
  fullSeekThumb.style.left = `${percent}%`;
};

window.onEngineState = function(state) {
  currentEngineState = state;
  if (state === 'idle') {
    if (!isQueueRunning) {
      playbackMode = null;
      queuePlaybackMode = null;
    }
    isAudioPreviewActive = false;
  } else if (state === 'playing') {
    if (playbackMode === 'preview') {
      isAudioPreviewActive = true;
    }
  }
  updateControlsUI(state);
};


/* ==========================================================
   7.1 Tab Navigation & Playback Queue Management
   ========================================================== */
function switchSidebarTab(tabName) {
  tabBtnLocal.classList.toggle('active', tabName === 'local');
  if (tabBtnQueue) tabBtnQueue.classList.toggle('active', tabName === 'queue');
  tabBtnOnline.classList.toggle('active', tabName === 'online');

  viewLocalLib.classList.toggle('hidden', tabName !== 'local');
  if (viewQueueLib) viewQueueLib.classList.toggle('hidden', tabName !== 'queue');
  viewOnlineLib.classList.toggle('hidden', tabName !== 'online');

  if (tabName === 'queue') {
    renderQueue();
  } else if (tabName === 'online') {
    if (paneOnlineStore && paneOnlineStore.classList.contains('hidden') && (!paneOnlineConverter || paneOnlineConverter.classList.contains('hidden'))) {
      switchOnlineSubtab('store');
    } else if (paneOnlineStore && !paneOnlineStore.classList.contains('hidden')) {
      triggerOnlineSearch(onlineSearchInput ? onlineSearchInput.value || '' : '', currentOnlineSource, true);
    }
  }
}

function updateQueueBadge() {
  if (queueBadge) {
    queueBadge.textContent = `${playbackQueue.length}`;
  }
}

function addToQueue(song, notify = true) {
  if (!song) return;
  playbackQueue.push({ ...song });
  updateQueueBadge();
  renderQueue();
  if (notify) {
    miniStatusLabel.textContent = `+ QUEUE: ${song.title.slice(0, 16)}`;
    setTimeout(() => {
      if (currentEngineState === 'idle') miniStatusLabel.textContent = 'SẴN SÀNG';
      else if (currentEngineState === 'playing') miniStatusLabel.textContent = 'ĐANG PHÁT';
      else if (currentEngineState === 'paused') miniStatusLabel.textContent = 'TẠM DỪNG';
    }, 1500);
  }
}

function removeFromQueue(idx) {
  if (idx < 0 || idx >= playbackQueue.length) return;
  playbackQueue.splice(idx, 1);
  if (currentQueueIndex === idx) {
    currentQueueIndex = -1;
  } else if (currentQueueIndex > idx) {
    currentQueueIndex--;
  }
  updateQueueBadge();
  renderQueue();
}

function clearQueue() {
  playbackQueue = [];
  currentQueueIndex = -1;
  isQueueRunning = false;
  queuePlaybackMode = null;
  updateQueueBadge();
  renderQueue();
}

function playQueueSong(idx, forcedMode = null) {
  if (idx < 0 || idx >= playbackQueue.length) return;
  currentQueueIndex = idx;
  const song = playbackQueue[idx];
  selectSong(song);
  renderQueue();

  isQueueRunning = true;
  const mode = forcedMode || queuePlaybackMode || playbackMode || 'game';
  queuePlaybackMode = mode;
  playbackMode = mode;

  if (mode === 'game') {
    playInGame();
  } else {
    playPreview();
  }
}

function startQueuePlayback(forcedMode = 'game') {
  if (playbackQueue.length === 0) {
    miniStatusLabel.textContent = 'HÀNG ĐỢI TRỐNG';
    setTimeout(() => {
      if (currentEngineState === 'idle') miniStatusLabel.textContent = 'SẴN SÀNG';
    }, 1500);
    return;
  }
  isQueueRunning = true;
  queuePlaybackMode = forcedMode;
  playbackMode = forcedMode;
  const targetIdx = (currentQueueIndex >= 0 && currentQueueIndex < playbackQueue.length) ? currentQueueIndex : 0;
  playQueueSong(targetIdx, forcedMode);
}

function shuffleQueue() {
  if (playbackQueue.length <= 1) return;
  const currentSong = currentQueueIndex >= 0 ? playbackQueue[currentQueueIndex] : null;

  for (let i = playbackQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playbackQueue[i], playbackQueue[j]] = [playbackQueue[j], playbackQueue[i]];
  }

  if (currentSong) {
    currentQueueIndex = playbackQueue.findIndex(s => s.filename === currentSong.filename);
  }

  renderQueue();
  miniStatusLabel.textContent = 'ĐÃ TRỘN BÀI';
  setTimeout(() => {
    if (currentEngineState === 'idle') miniStatusLabel.textContent = 'SẴN SÀNG';
    else if (currentEngineState === 'playing') miniStatusLabel.textContent = 'ĐANG PHÁT';
    else if (currentEngineState === 'paused') miniStatusLabel.textContent = 'TẠM DỪNG';
  }, 1200);
}

function toggleQueueLoop() {
  isQueueLoopEnabled = !isQueueLoopEnabled;
  if (btnLoopQueue) {
    btnLoopQueue.classList.toggle('active', isQueueLoopEnabled);
  }
  if (loopQueueText) {
    loopQueueText.textContent = isQueueLoopEnabled ? 'Lặp: Bật' : 'Lặp: Tắt';
  }
  miniStatusLabel.textContent = isQueueLoopEnabled ? 'LẶP HÀNG ĐỢI: BẬT' : 'LẶP HÀNG ĐỢI: TẮT';
  setTimeout(() => {
    if (currentEngineState === 'idle') miniStatusLabel.textContent = 'SẴN SÀNG';
    else if (currentEngineState === 'playing') miniStatusLabel.textContent = 'ĐANG PHÁT';
    else if (currentEngineState === 'paused') miniStatusLabel.textContent = 'TẠM DỪNG';
  }, 1200);
}

function reorderQueue(fromIdx, toIdx) {
  if (fromIdx < 0 || fromIdx >= playbackQueue.length || toIdx < 0 || toIdx >= playbackQueue.length) return;
  if (fromIdx === toIdx) return;

  const [moved] = playbackQueue.splice(fromIdx, 1);
  playbackQueue.splice(toIdx, 0, moved);

  if (currentQueueIndex === fromIdx) {
    currentQueueIndex = toIdx;
  } else if (fromIdx < currentQueueIndex && toIdx >= currentQueueIndex) {
    currentQueueIndex--;
  } else if (fromIdx > currentQueueIndex && toIdx <= currentQueueIndex) {
    currentQueueIndex++;
  }

  renderQueue();
}

let isQueueDragging = false;

function renderQueue() {
  if (!queueSongList) return;
  queueSongList.innerHTML = '';
  if (playbackQueue.length === 0) {
    queueSongList.innerHTML = `
      <div class="empty-state-card" style="padding: 24px 16px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-state-icon" style="width:36px; height:36px;">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
        <div class="empty-state-title" style="font-size:0.85rem;">Hàng đợi phát đang trống</div>
        <div class="empty-state-desc" style="font-size:0.72rem;">Nhấn icon <strong>+ Queue</strong> trên bài hát hoặc bấm <strong>Phát tất cả</strong> ở Playlist để tự động nạp danh sách phát liên tục.</div>
      </div>
    `;
    return;
  }

  playbackQueue.forEach((song, idx) => {
    const card = document.createElement('div');
    card.className = 'queue-card';
    card.setAttribute('draggable', 'true');
    card.dataset.index = idx;
    if (idx === currentQueueIndex) {
      card.classList.add('active');
    }
    card.innerHTML = `
      <span class="queue-drag-handle" title="Kéo giữ để xếp lại thứ tự">⋮⋮</span>
      <span class="queue-idx">${idx + 1}.</span>
      <span class="queue-title" title="${escapeHtml(song.title)}">${escapeHtml(song.title)}</span>
      <span class="queue-meta">${formatTime(song.duration)}</span>
      <button class="queue-remove-btn" title="Gỡ khỏi hàng đợi">&times;</button>
    `;

    // Drag and Drop Events
    card.addEventListener('dragstart', (e) => {
      isQueueDragging = true;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(idx));
      card.classList.add('dragging');
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      document.querySelectorAll('.queue-card').forEach(c => c.classList.remove('drag-over'));
      setTimeout(() => { isQueueDragging = false; }, 60);
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      card.classList.add('drag-over');
    });

    card.addEventListener('dragleave', () => {
      card.classList.remove('drag-over');
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      card.classList.remove('drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
      const toIdx = idx;
      if (!isNaN(fromIdx) && fromIdx !== toIdx) {
        reorderQueue(fromIdx, toIdx);
      }
    });

    card.addEventListener('click', (e) => {
      if (isQueueDragging) return;
      if (e.target.closest('.queue-remove-btn')) {
        e.stopPropagation();
        removeFromQueue(idx);
        return;
      }
      const mode = (playbackMode === 'preview') ? 'preview' : 'game';
      playQueueSong(idx, mode);
    });

    queueSongList.appendChild(card);
  });
}

function switchOnlineSubtab(subtabName) {
  if (subtabBtnOnlineStore) subtabBtnOnlineStore.classList.toggle('active', subtabName === 'store');
  if (subtabBtnConverter) subtabBtnConverter.classList.toggle('active', subtabName === 'converter');
  if (paneOnlineStore) paneOnlineStore.classList.toggle('hidden', subtabName !== 'store');
  if (paneOnlineConverter) paneOnlineConverter.classList.toggle('hidden', subtabName !== 'converter');

  if (subtabName === 'store') {
    triggerOnlineSearch(onlineSearchInput ? onlineSearchInput.value || '' : '', currentOnlineSource, true);
  }
}

function playAllCurrentPlaylist() {
  const q = libSearchInput.value.toLowerCase().trim();
  const filtered = songsList.filter((s) => {
    const matchSearch = s.title.toLowerCase().includes(q) || (s.author && s.author.toLowerCase().includes(q));
    if (!matchSearch) return false;
    if (currentPlaylist === 'Tất cả') return true;
    if (currentPlaylist === 'Yêu thích') return s.is_favorite;
    return s.playlists && s.playlists.includes(currentPlaylist);
  });

  if (filtered.length === 0) return;
  playbackQueue = [...filtered];
  updateQueueBadge();
  currentQueueIndex = 0;
  renderQueue();
  isQueueRunning = true;
  queuePlaybackMode = 'game';
  playbackMode = 'game';
  playQueueSong(0, 'game');
}

/* ==========================================================
   7.2 Song Management: Rename & Delete Modals
   ========================================================== */
function openRenameModal(song) {
  if (!song) return;
  songTargetForRename = song;
  if (inputRenameSong) {
    inputRenameSong.value = song.title;
  }
  if (modalRenameSong) {
    modalRenameSong.classList.remove('hidden');
    setTimeout(() => {
      inputRenameSong.focus();
      inputRenameSong.select();
    }, 60);
  }
}

async function confirmRenameSong() {
  if (!songTargetForRename || !inputRenameSong) return;
  const newTitle = inputRenameSong.value.trim();
  if (!newTitle) {
    alert('Vui lòng nhập tên bài hát hợp lệ');
    return;
  }
  if (window.pywebview && window.pywebview.api && window.pywebview.api.rename_song) {
    const res = await window.pywebview.api.rename_song(songTargetForRename.filename, newTitle);
    if (res && res.success) {
      modalRenameSong.classList.add('hidden');
      const oldFn = res.old_filename;
      const newFn = res.new_filename;
      if (selectedSong && selectedSong.filename === oldFn) {
        selectedSong.filename = newFn;
        selectedSong.title = newTitle;
        fullSongTitle.textContent = newTitle;
        miniSongTitle.textContent = `${newTitle} - ${selectedSong.author || 'Sky CotL'}`;
      }
      playbackQueue.forEach((qs) => {
        if (qs.filename === oldFn) {
          qs.filename = newFn;
          qs.title = newTitle;
        }
      });
      renderQueue();
      await fetchSongs();
      await fetchPlaylists();
    } else {
      alert('Không thể đổi tên bài hát: ' + (res ? res.error : 'Lỗi không xác định'));
    }
  }
}

function openDeleteModal(song) {
  if (!song) return;
  songTargetForDelete = song;
  if (deleteConfirmPromptText) {
    deleteConfirmPromptText.textContent = `Bạn có chắc chắn muốn xóa vĩnh viễn bài "${song.title}" khỏi thư viện và các playlist?`;
  }
  if (modalConfirmDelete) {
    modalConfirmDelete.classList.remove('hidden');
  }
}

async function confirmDeleteSong() {
  if (!songTargetForDelete) return;
  const songToDelete = songTargetForDelete;
  if (modalConfirmDelete) modalConfirmDelete.classList.add('hidden');

  if (window.pywebview && window.pywebview.api && window.pywebview.api.delete_song) {
    const res = await window.pywebview.api.delete_song(songToDelete.filename);
    if (res && res.success) {
      if (selectedSong && selectedSong.filename === songToDelete.filename) {
        if (currentEngineState !== 'idle') {
          stopPlayback();
        }
        selectedSong = null;
        fullSongTitle.textContent = 'Chưa chọn bài hát';
        miniSongTitle.textContent = 'Chưa chọn bài';
      }
      playbackQueue = playbackQueue.filter(qs => qs.filename !== songToDelete.filename);
      updateQueueBadge();
      renderQueue();
      await fetchSongs();
      await fetchPlaylists();
    } else {
      alert('Không thể xóa bài hát: ' + (res ? res.error : 'Lỗi không xác định'));
    }
  }
}

/* ==========================================================
   7.3 Keybind Settings Modal & Interactive Key Capture
   ========================================================== */
function formatKeyDisplay(k) {
  if (!k) return 'Chưa gán';
  k = k.toLowerCase().trim();
  if (k === 'right shift' || k === 'shiftright') return 'Right Shift';
  if (k === 'left shift' || k === 'shiftleft') return 'Left Shift';
  if (k === 'right ctrl' || k === 'controlright') return 'Right Ctrl';
  if (k === 'left ctrl' || k === 'controlleft') return 'Left Ctrl';
  if (k === 'right alt' || k === 'altright') return 'Right Alt';
  if (k === 'left alt' || k === 'altleft') return 'Left Alt';
  if (k === 'space') return 'Space';
  if (/^f\d+$/i.test(k)) return k.toUpperCase();
  if (k.length === 1) return k.toUpperCase();
  return k.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function updateKeybindBoxesUI() {
  if (keybindBoxToggleHud) keybindBoxToggleHud.textContent = formatKeyDisplay(tempKeybinds.toggle_hud);
  if (keybindBoxPlayPause) keybindBoxPlayPause.textContent = formatKeyDisplay(tempKeybinds.play_pause);
  if (keybindBoxEmergencyStop) keybindBoxEmergencyStop.textContent = formatKeyDisplay(tempKeybinds.emergency_stop);
}

function openSettingsModal() {
  activeCapturingAction = null;
  if (keybindConflictAlert) keybindConflictAlert.classList.add('hidden');
  resetCapturingBoxes();
  if (window.pywebview && window.pywebview.api && window.pywebview.api.get_settings) {
    window.pywebview.api.get_settings().then((st) => {
      if (st && st.keybinds) {
        currentKeybinds = { ...st.keybinds };
        tempKeybinds = { ...st.keybinds };
      }
      updateKeybindBoxesUI();
      modalSettingsKeybind.classList.remove('hidden');
    }).catch(() => {
      updateKeybindBoxesUI();
      modalSettingsKeybind.classList.remove('hidden');
    });
  } else {
    updateKeybindBoxesUI();
    modalSettingsKeybind.classList.remove('hidden');
  }
}

function closeSettingsModal() {
  activeCapturingAction = null;
  resetCapturingBoxes();
  if (modalSettingsKeybind) modalSettingsKeybind.classList.add('hidden');
}

function resetCapturingBoxes() {
  [keybindBoxToggleHud, keybindBoxPlayPause, keybindBoxEmergencyStop].forEach((box) => {
    if (box) box.classList.remove('capturing');
  });
}

function startCapturingKey(action, boxElement) {
  resetCapturingBoxes();
  activeCapturingAction = action;
  boxElement.classList.add('capturing');
  boxElement.textContent = 'Nhấn phím bất kỳ...';
  if (keybindConflictAlert) keybindConflictAlert.classList.add('hidden');
}

function getKeyboardLibKey(e) {
  if (e.code === 'ShiftRight') return 'right shift';
  if (e.code === 'ShiftLeft') return 'left shift';
  if (e.code === 'ControlRight') return 'right ctrl';
  if (e.code === 'ControlLeft') return 'left ctrl';
  if (e.code === 'AltRight') return 'right alt';
  if (e.code === 'AltLeft') return 'left alt';
  if (e.code === 'Space') return 'space';
  if (/^F\d+$/i.test(e.key)) return e.key.toLowerCase();
  if (e.key && e.key.length === 1) return e.key.toLowerCase();
  return e.code.toLowerCase().replace('key', '').replace('digit', '');
}

async function saveKeybinds() {
  if (window.pywebview && window.pywebview.api && window.pywebview.api.update_keybinds) {
    const res = await window.pywebview.api.update_keybinds(tempKeybinds);
    if (res && res.success) {
      currentKeybinds = { ...tempKeybinds };
      closeSettingsModal();
    } else {
      alert('Không thể lưu phím tắt: ' + (res ? res.error : 'Lỗi không xác định'));
    }
  } else {
    currentKeybinds = { ...tempKeybinds };
    closeSettingsModal();
  }
}

function resetKeybindsToDefault() {
  tempKeybinds = {
    toggle_hud: 'right shift',
    play_pause: 'f6',
    emergency_stop: 'f8'
  };
  if (keybindConflictAlert) keybindConflictAlert.classList.add('hidden');
  resetCapturingBoxes();
  updateKeybindBoxesUI();
}

window.onSongNaturallyFinished = function () {
  console.log('[XieMusician] onSongNaturallyFinished triggered, isQueueRunning:', isQueueRunning, 'queueLen:', playbackQueue.length);
  if (playbackQueue.length > 0 && isQueueRunning) {
    let nextIdx = -1;
    if (currentQueueIndex >= 0 && currentQueueIndex < playbackQueue.length - 1) {
      nextIdx = currentQueueIndex + 1;
    } else if (isQueueLoopEnabled && playbackQueue.length > 0) {
      nextIdx = 0;
    }

    if (nextIdx >= 0) {
      currentQueueIndex = nextIdx;
      const nextSong = playbackQueue[currentQueueIndex];
      const targetMode = queuePlaybackMode || playbackMode || 'game';
      miniStatusLabel.textContent = 'CHUYỂN BÀI...';
      renderQueue();
      setTimeout(() => {
        if (currentEngineState !== 'playing') {
          selectSong(nextSong);
          if (targetMode === 'game') {
            playInGame();
          } else {
            playPreview();
          }
        }
      }, 1000);
      return;
    }
  }

  isQueueRunning = false;
  queuePlaybackMode = null;
  playbackMode = null;
  miniStatusLabel.textContent = 'HOÀN THÀNH';
  setTimeout(() => {
    if (currentEngineState === 'idle') {
      miniStatusLabel.textContent = 'SẴN SÀNG';
      updateControlsUI('idle');
    }
  }, 2500);
};


/* ==========================================================
   8. Online Sheet Store (vithai.xyz, skysheet, sky-music)
   ========================================================== */
let onlineSearchTimeout = null;
let currentOnlineSource = 'all';
let currentOnlineOffset = 0;
let isOnlineLoading = false;
let hasMoreOnline = true;
let currentOnlineQuery = '';

function setupOnlineSheetStore() {
  tabBtnLocal.addEventListener('click', () => switchSidebarTab('local'));
  if (tabBtnQueue) tabBtnQueue.addEventListener('click', () => switchSidebarTab('queue'));
  tabBtnOnline.addEventListener('click', () => switchSidebarTab('online'));

  // Wire up Online Subtabs
  if (subtabBtnOnlineStore) subtabBtnOnlineStore.addEventListener('click', () => switchOnlineSubtab('store'));
  if (subtabBtnConverter) subtabBtnConverter.addEventListener('click', () => switchOnlineSubtab('converter'));

  // Wire up Online Source Pills
  const sourcePills = document.querySelectorAll('#onlineSourcePills .source-pill');
  sourcePills.forEach((pill) => {
    pill.addEventListener('click', () => {
      sourcePills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentOnlineSource = pill.dataset.source || 'all';
      triggerOnlineSearch(onlineSearchInput.value || '', currentOnlineSource, true);
    });
  });

  onlineSearchInput.addEventListener('input', (e) => {
    clearTimeout(onlineSearchTimeout);
    const q = e.target.value.trim();
    onlineSearchTimeout = setTimeout(() => {
      triggerOnlineSearch(q, currentOnlineSource, true);
    }, 350);
  });

  // Infinite Scroll Listener for Community Sheets
  onlineSongList.addEventListener('scroll', () => {
    const threshold = 180;
    if (onlineSongList.scrollTop + onlineSongList.clientHeight >= onlineSongList.scrollHeight - threshold) {
      if (!isOnlineLoading && hasMoreOnline) {
        triggerOnlineSearch(currentOnlineQuery, currentOnlineSource, false);
      }
    }
  });

  btnDownloadUrl.addEventListener('click', () => {
    const url = onlineUrlInput.value.trim();
    if (!url) return;
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      tabBtnLocal.click();
      const ytInput = document.getElementById('inputYoutubeUrl');
      if (ytInput) ytInput.value = url;
      processYouTubeUrl(url);
      onlineUrlInput.value = '';
      return;
    }
    btnDownloadUrl.textContent = '...';
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.download_online_sheet(url, 'Web_Sheet', 'Online', 120).then((res) => {
        btnDownloadUrl.textContent = 'Tải';
        if (res && res.success) {
          onlineUrlInput.value = '';
          fetchSongs();
          tabBtnLocal.click();
        } else {
          alert('Không thể tải sheet: ' + (res.error || 'Lỗi link'));
        }
      });
    }
  });
}

async function triggerOnlineSearch(query = '', source = 'all', reset = true) {
  if (reset) {
    currentOnlineOffset = 0;
    hasMoreOnline = true;
    currentOnlineQuery = query;
    currentOnlineSource = source;
    onlineSongList.innerHTML = '<div class="online-placeholder">Đang tải kho sheet cộng đồng...</div>';
  }

  if (!hasMoreOnline || isOnlineLoading) return;
  isOnlineLoading = true;

  let loader = null;
  if (!reset) {
    loader = document.createElement('div');
    loader.className = 'online-scroll-loader';
    loader.textContent = 'Đang tải thêm sheet...';
    onlineSongList.appendChild(loader);
  }

  try {
    if (window.pywebview && window.pywebview.api) {
      const res = await window.pywebview.api.search_online_sheets(
        currentOnlineQuery,
        currentOnlineSource,
        currentOnlineOffset,
        60
      );
      if (loader) loader.remove();

      const items = (res && res.items) ? res.items : [];
      hasMoreOnline = res ? res.has_more : false;
      currentOnlineOffset += items.length;

      if (reset) {
        onlineSongList.innerHTML = '';
        if (items.length === 0) {
          onlineSongList.innerHTML = '<div class="online-placeholder">Không tìm thấy bài hát phù hợp. Thử tìm từ khóa khác hoặc chọn nguồn khác.</div>';
          return;
        }
      }

      appendOnlineResults(items);
    }
  } catch (err) {
    if (loader) loader.remove();
    console.error('Online search error:', err);
    if (reset) {
      onlineSongList.innerHTML = `<div class="online-placeholder">Lỗi kết nối kho online: ${err}</div>`;
    }
  } finally {
    isOnlineLoading = false;
  }
}

function appendOnlineResults(items) {
  items.forEach((item) => {
    const row = document.createElement('div');
    row.className = 'online-song-item';
    row.innerHTML = `
      <div class="card-left">
        <div class="card-title">${escapeHtml(item.name)}</div>
        <div class="card-meta"><span class="source-tag">${escapeHtml(item.source)}</span> • ${item.notes_count} nốt • BPM ${item.bpm}</div>
      </div>
      <button class="btn-download-sheet" title="Tải về máy">Tải về</button>
    `;

    const btn = row.querySelector('.btn-download-sheet');
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      btn.textContent = 'Đang tải...';
      if (window.pywebview && window.pywebview.api) {
        const res = await window.pywebview.api.download_online_sheet(item.url, item.name, item.source, item.bpm);
        if (res && res.success) {
          btn.textContent = 'Đã tải';
          btn.classList.add('downloaded');
          fetchSongs();
        } else {
          btn.textContent = 'Lỗi';
          alert(res.error || 'Tải thất bại');
        }
      }
    });

    onlineSongList.appendChild(row);
  });
}


/* ==========================================================
   9. Advanced Audio to Sky Sheet AI/DSP Transcription
   (YouTube / MP3 / WAV / OGG / M4A)
   - YIN Fundamental Pitch Detection
   - FFT Cooley-Tukey Harmonic & Polyphonic Analysis
   - Dynamic Energy & Legato Pitch Onset Detection
   - Krumhansl-Schmuckler Diatonic Key Estimation to C Major
   - Sky 15-Key Diatonic Mapping
   ========================================================== */

function radix2FFT(real, imag) {
  const n = real.length;
  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tr = real[i]; real[i] = real[j]; real[j] = tr;
      const ti = imag[i]; imag[i] = imag[j]; imag[j] = ti;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }
  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let wR = 1, wI = 0;
      for (let k = 0; k < half; k++) {
        const uR = real[i + k];
        const uI = imag[i + k];
        const vR = real[i + k + half] * wR - imag[i + k + half] * wI;
        const vI = real[i + k + half] * wI + imag[i + k + half] * wR;
        real[i + k] = uR + vR;
        imag[i + k] = uI + vI;
        real[i + k + half] = uR - vR;
        imag[i + k + half] = uI - vI;
        const nextWR = wR * wStepR - wI * wStepI;
        const nextWI = wR * wStepI + wI * wStepR;
        wR = nextWR;
        wI = nextWI;
      }
    }
  }
}

// Patch 3: Scale-Fit Key Finder (Replaces K-S classical bias with 7-White-Key fit ratio)
function findOptimalSkyTranspose(melodyNotes, finalBassPitchClass) {
  const WHITE_KEYS = new Set([0, 2, 4, 5, 7, 9, 11]);
  const diatonicWeights = { 0: 3.2, 2: 2.2, 4: 2.6, 5: 2.2, 7: 3.2, 9: 2.8, 11: 1.8 };
  let bestShift = 0;
  let bestTotalScore = -Infinity;

  for (let shift = -6; shift <= 5; shift++) {
    let inScaleEnergy = 0;
    let totalEnergy = 0;
    let ksScore = 0;

    for (const note of melodyNotes) {
      const shiftedPc = ((note.midi + shift) % 12 + 12) % 12;
      const weight = note.salience || 1.0;
      totalEnergy += weight;

      if (WHITE_KEYS.has(shiftedPc)) {
        inScaleEnergy += weight;
        ksScore += (diatonicWeights[shiftedPc] || 1.0) * weight;
      } else {
        ksScore -= 3.0 * weight;
      }
    }

    const scaleFitRatio = totalEnergy > 0 ? (inScaleEnergy / totalEnergy) : 0;
    const ksNorm = totalEnergy > 0 ? (ksScore / (totalEnergy * 3.2)) : 0;

    let cadenceBonus = 0;
    if (finalBassPitchClass !== null && finalBassPitchClass !== undefined) {
      const shiftedFinalBass = ((finalBassPitchClass + shift) % 12 + 12) % 12;
      if (shiftedFinalBass === 0 || shiftedFinalBass === 9) {
        cadenceBonus = 0.08;
      }
    }

    const distancePenalty = Math.abs(shift) * 0.005;
    const totalScore = (scaleFitRatio * 0.75) + (ksNorm * 0.17) + cadenceBonus - distancePenalty;

    if (totalScore > bestTotalScore) {
      bestTotalScore = totalScore;
      bestShift = shift;
    }
  }

  return bestShift;
}

function findBestKeyShift(detectedEvents) {
  return findOptimalSkyTranspose(detectedEvents, null);
}

// Patch 2: Rolled-Chord High-Note Override (Replaces lower thumb/index notes with top pinky melody)
function resolveRolledChords(extractedNotes) {
  const resolved = [];
  const ROLL_WINDOW_SEC = 0.11; // 110ms

  for (let i = 0; i < extractedNotes.length; i++) {
    const curr = extractedNotes[i];

    if (resolved.length > 0) {
      const prev = resolved[resolved.length - 1];
      const dt = (curr.time - prev.time) / 1000.0;

      // If two onsets occur within 110ms (rolled chord arpeggio)
      if (dt > 0 && dt <= ROLL_WINDOW_SEC) {
        if (curr.midi > prev.midi) {
          // Latter note is higher -> Pinky melody note! Override earlier inner-voice note but keep on-beat timestamp
          resolved[resolved.length - 1] = {
            ...curr,
            time: prev.time
          };
          continue;
        } else {
          // Latter note is lower -> trailing accompaniment note, discard
          continue;
        }
      }
    }
    resolved.push(curr);
  }
  return resolved;
}

function computeHNR(mags, f0, binHz, halfFFT) {
  let harmEnergy = 0;
  let noiseEnergy = 0;
  for (let h = 1; h <= 4; h++) {
    const hBin = Math.round((f0 * h) / binHz);
    if (hBin < halfFFT) {
      let maxM = 0;
      for (let b = Math.max(1, hBin - 1); b <= Math.min(halfFFT - 1, hBin + 1); b++) {
        if (mags[b] > maxM) maxM = mags[b];
      }
      harmEnergy += maxM;
    }
    const nBin = Math.round((f0 * (h + 0.5)) / binHz);
    if (nBin < halfFFT) {
      noiseEnergy += mags[nBin];
    }
  }
  return harmEnergy / (noiseEnergy + 0.002);
}

// Direction-preserving and context-aware Diatonic Accidental Resolution
function resolveAccidentalToDiatonic(midiWithShift, prevMidiOrChord, chordName) {
  const pc = ((midiWithShift % 12) + 12) % 12;
  const octave = Math.floor(midiWithShift / 12) * 12;

  // If already a natural white key in C Major, return as-is
  if (pc === 0 || pc === 2 || pc === 4 || pc === 5 || pc === 7 || pc === 9 || pc === 11) {
    return midiWithShift;
  }

  let prevMidi = undefined;
  let chord = '';
  if (typeof prevMidiOrChord === 'string') {
    chord = prevMidiOrChord;
  } else {
    prevMidi = prevMidiOrChord;
    chord = chordName || '';
  }

  const isAscending = prevMidi !== undefined && midiWithShift > prevMidi;
  const isDescending = prevMidi !== undefined && midiWithShift < prevMidi;

  switch (pc) {
    case 1:  // C# -> D (if ascending) or C (if descending)
      if (isAscending) return octave + 2;
      if (isDescending) return octave + 0;
      return (chord === 'C' || chord === 'F') ? octave + 0 : octave + 2;

    case 3:  // D# -> E (if ascending) or D (if descending)
      if (isAscending) return octave + 4;
      if (isDescending) return octave + 2;
      return (chord === 'C' || chord === 'Am' || chord === 'Em') ? octave + 4 : octave + 2;

    case 6:  // F# -> G (if ascending) or F (if descending)
      if (isAscending) return octave + 7;
      if (isDescending) return octave + 5;
      return (chord === 'F' || chord === 'Dm') ? octave + 5 : octave + 7;

    case 8:  // G# -> A (if ascending) or G (if descending)
      if (isAscending) return octave + 9;
      if (isDescending) return octave + 7;
      return (chord === 'G' || chord === 'Em') ? octave + 7 : octave + 9;

    case 10: // A# -> B (if ascending) or A (if descending)
      if (isAscending) return octave + 11;
      if (isDescending) return octave + 9;
      return (chord === 'G' || chord === 'Em') ? octave + 11 : octave + 9;

    default:
      return midiWithShift;
  }
}

const SKY_MIDI = [60, 62, 64, 65, 67, 69, 71, 72, 74, 76, 77, 79, 81, 83, 84];

const DIATONIC_CHORDS = [
  { name: 'C',  root: 0, third: 4, fifth: 7,  rootKey: 0, thirdKey: 2, fifthKey: 4, octaveKey: 7 },
  { name: 'Dm', root: 2, third: 5, fifth: 9,  rootKey: 1, thirdKey: 3, fifthKey: 5, octaveKey: 8 },
  { name: 'Em', root: 4, third: 7, fifth: 11, rootKey: 2, thirdKey: 4, fifthKey: 6, octaveKey: 9 },
  { name: 'F',  root: 5, third: 9, fifth: 0,  rootKey: 3, thirdKey: 5, fifthKey: 7, octaveKey: 10 },
  { name: 'G',  root: 7, third: 11, fifth: 2, rootKey: 4, thirdKey: 6, fifthKey: 8, octaveKey: 11 },
  { name: 'Am', root: 9, third: 0, fifth: 4,  rootKey: 5, thirdKey: 7, fifthKey: 9, octaveKey: 12 }
];

function midiToSkyKeyIdx(midi) {
  let shifted = midi;
  while (shifted < 60) shifted += 12;
  while (shifted > 84) shifted -= 12;
  let bestDist = 999;
  let bestIdx = 0;
  SKY_MIDI.forEach((target, idx) => {
    const dist = Math.abs(target - shifted);
    if (dist < bestDist) {
      bestDist = dist;
      bestIdx = idx;
    }
  });
  return bestIdx;
}

// Estimate actual song BPM from Onset Detection Function with Multi-Harmonic Lag Summation (80 - 180 BPM)
function estimateTempoBpm(odf, hopSize, sampleRate) {
  const frameSec = hopSize / sampleRate;
  let bestBpm = 120;
  let maxScore = -1;

  for (let bpm = 80; bpm <= 175; bpm += 1) {
    const lagFrames = Math.round((60 / bpm) / frameSec);
    const halfLag = Math.round(lagFrames / 2);
    const doubleLag = lagFrames * 2;

    let corr1 = 0;
    let corrHalf = 0;
    let corrDouble = 0;

    for (let f = 0; f < odf.length - lagFrames; f++) {
      corr1 += odf[f] * odf[f + lagFrames];
    }
    if (halfLag > 0 && odf.length > halfLag) {
      for (let f = 0; f < odf.length - halfLag; f += 2) {
        corrHalf += odf[f] * odf[f + halfLag];
      }
    }
    if (odf.length > doubleLag) {
      for (let f = 0; f < odf.length - doubleLag; f += 2) {
        corrDouble += odf[f] * odf[f + doubleLag];
      }
    }

    const combined = corr1 + 0.55 * corrHalf + 0.35 * corrDouble;
    // Standard Anime/Pop/Piano cover tempo preference (110 - 150 BPM)
    const prior = (bpm >= 112 && bpm <= 145) ? 1.25 : ((bpm >= 95 && bpm <= 160) ? 1.10 : 1.0);
    const score = combined * prior;

    if (score > maxScore) {
      maxScore = score;
      bestBpm = bpm;
    }
  }
  return bestBpm;
}

function extractKeyIndex(keyStr) {
  const m = String(keyStr).match(/Key(\d+)/i);
  if (m) return parseInt(m[1], 10) % 15;
  if (/^\d+$/.test(String(keyStr))) return parseInt(keyStr, 10) % 15;
  return null;
}

function purifySkySheetNotes(songNotes, bpm = 120, isSolo = false) {
  if (!songNotes || songNotes.length === 0) return [];

  const sortedNotes = [...songNotes].sort((a, b) => (a.time || 0) - (b.time || 0));
  const clusters = [];
  let currCluster = [];

  for (const n of sortedNotes) {
    const t = n.time || 0;
    if (currCluster.length === 0) {
      currCluster.push(n);
    } else {
      if (t - (currCluster[0].time || 0) <= 35) {
        currCluster.push(n);
      } else {
        clusters.push(currCluster);
        currCluster = [n];
      }
    }
  }
  if (currCluster.length > 0) clusters.push(currCluster);

  let effBpm = bpm && bpm > 0 ? bpm : 120;
  if (effBpm > 240) effBpm = effBpm / 4.0;
  effBpm = Math.max(40.0, Math.min(240.0, effBpm));
  const minBassIntervalMs = Math.max(350, Math.round((60000.0 / effBpm) * 0.95));

  const purified = [];
  let lastBassTime = -999999;

  for (const cluster of clusters) {
    const clusterTime = cluster[0].time || 0;
    const keyIndices = [];
    for (const n of cluster) {
      const k = extractKeyIndex(n.key);
      if (k !== null) keyIndices.push(k);
    }
    if (keyIndices.length === 0) continue;

    const uniqueKeys = Array.from(new Set(keyIndices)).sort((a, b) => a - b);
    const maxKey = uniqueKeys[uniqueKeys.length - 1];
    const minKey = uniqueKeys[0];

    // Rule 1: Skyline lead melody (100% kept)
    purified.push({ time: clusterTime, key: `1Key${maxKey}` });

    // Rule 3: Downbeat Bass Gating
    if (!isSolo && uniqueKeys.length >= 2 && minKey < maxKey) {
      const cond1 = (maxKey - minKey) >= 4;
      const cond2 = minKey <= 6;
      const cond3 = (clusterTime - lastBassTime) >= minBassIntervalMs;
      if (cond1 && cond2 && cond3) {
        purified.push({ time: clusterTime, key: `1Key${minKey}` });
        lastBassTime = clusterTime;
      }
    }
  }

  purified.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    const aKey = extractKeyIndex(a.key) || 0;
    const bKey = extractKeyIndex(b.key) || 0;
    return aKey - bKey;
  });

  return purified;
}

async function convertAudioBufferToSkySheet(arrayBuffer, title, progressCb) {
  initAudio();
  if (progressCb) progressCb("Đang giải mã tín hiệu âm thanh...");
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

  const styleSelect = document.getElementById('selectTranscribeStyle');
  const style = styleSelect ? styleSelect.value : 'chords';

  const quantizeCheck = document.getElementById('chkQuantizeBeat');
  const shouldQuantize = quantizeCheck ? quantizeCheck.checked : true;

  if (progressCb) progressCb(`Đang phân tích phổ âm & tách đường giai điệu (${style === 'solo' ? 'Giai điệu đơn' : (style === 'duet' ? 'Bè đôi hòa tấu' : 'Hợp âm đầy đủ')})...`);
  const pcm = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  const fftSize = 4096;
  const hopSize = Math.floor(sampleRate * 0.020); // 20ms hop
  const numFrames = Math.floor((pcm.length - fftSize) / hopSize);
  const halfFFT = fftSize >> 1;
  const binHz = sampleRate / fftSize;

  const hann = new Float32Array(fftSize);
  for (let i = 0; i < fftSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (fftSize - 1)));
  }

  // Pass 1: Spectral Flux & Melodic Band Onset Detection
  const fluxOnset = new Float32Array(numFrames);
  const lowFluxOnset = new Float32Array(numFrames);
  const hfcOnset = new Float32Array(numFrames);
  const rmsArr = new Float32Array(numFrames);

  let prevMags = new Float32Array(halfFFT);
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const frameMagnitudes = new Array(numFrames);

  for (let f = 0; f < numFrames; f++) {
    const offset = f * hopSize;
    let sumSq = 0;
    for (let i = 0; i < fftSize; i++) {
      const s = pcm[offset + i];
      sumSq += s * s;
      real[i] = s * hann[i];
      imag[i] = 0;
    }
    rmsArr[f] = Math.sqrt(sumSq / fftSize);
    radix2FFT(real, imag);

    let melodyFlux = 0;
    let lowFlux = 0;
    let hfc = 0;
    const currMags = new Float32Array(halfFFT);
    for (let k = 1; k < halfFFT; k++) {
      const mag = Math.sqrt(real[k] * real[k] + imag[k] * imag[k]);
      currMags[k] = mag;
      const hz = k * binHz;
      const diff = mag - prevMags[k];
      if (diff > 0) {
        // Melodic Band: 220Hz (A3) - 3600Hz (captures full C4-C6 primary Sky range!)
        if (hz >= 220 && hz <= 3600) {
          melodyFlux += diff;
        } else if (hz < 200) {
          lowFlux += diff;
        }
      }
      if (hz >= 1200 && hz <= 6000) {
        hfc += mag * hz * 0.0005;
      }
    }
    fluxOnset[f] = melodyFlux;
    lowFluxOnset[f] = lowFlux;
    hfcOnset[f] = hfc;
    prevMags = currMags;

    if (rmsArr[f] > 0.002) {
      frameMagnitudes[f] = currMags;
    }
  }

  const odf = new Float32Array(numFrames);
  for (let f = 1; f < numFrames; f++) {
    const dHfc = hfcOnset[f] - hfcOnset[f - 1];
    odf[f] = fluxOnset[f] * 0.72 + (dHfc > 0 ? dHfc * 0.28 : 0);
  }

  // Estimate actual song BPM & dynamic rhythmic grid
  const detectedBpm = estimateTempoBpm(odf, hopSize, sampleRate);
  const beatMs = Math.round(60000 / detectedBpm);        // 1 quarter note
  const halfBeatMs = Math.round(beatMs / 2);             // 1 eighth note
  const gridStep = shouldQuantize ? Math.round(beatMs / 4) : 1; // 1 sixteenth note

  // Pass 2: True Attack Peak Picking
  const minAttackFrames = 4; // 80ms minimum inter-onset interval (captures 16th-note syncopations)
  const onsetFrames = [];
  const bassOnsetTimes = [];
  let lastAttackFrame = -999;
  const winSize = 15; // +/- 300ms local threshold window

  for (let f = 2; f < numFrames - 4; f++) {
    if (rmsArr[f] < 0.004) continue;

    let sum = 0, count = 0;
    for (let w = Math.max(0, f - winSize); w <= Math.min(numFrames - 1, f + winSize); w++) {
      sum += odf[w];
      count++;
    }
    const mean = sum / count;
    const thresh = mean * 1.35 + 0.10;

    const isPeak = (odf[f] > thresh) && (odf[f] > odf[f - 1]) && (odf[f] >= odf[f + 1]);
    if (isPeak && (f - lastAttackFrame >= minAttackFrames)) {
      // Check if this onset is predominantly low-frequency accompaniment (< 200Hz)
      const isAccompanimentOnset = (lowFluxOnset[f] > fluxOnset[f] * 2.8) && (fluxOnset[f] < 0.06);
      const timeMs = Math.round((f * hopSize / sampleRate) * 1000);
      if (isAccompanimentOnset) {
        bassOnsetTimes.push(timeMs);
      } else {
        onsetFrames.push(f);
        lastAttackFrame = f;
      }
    }
  }

  if (onsetFrames.length < 5) {
    throw new Error("Không tìm thấy đủ giai điệu rõ ràng trong đoạn âm thanh này để tạo sheet.");
  }

  // Pass 3: Multi-Candidate Pitch Extraction with Transient Attack Difference & Harmonic Sieve
  const onsetCandidates = [];

  for (let idx = 0; idx < onsetFrames.length; idx++) {
    const f = onsetFrames[idx];
    const timeMs = Math.round((f * hopSize / sampleRate) * 1000);

    const fCurr = frameMagnitudes[f];
    const fPrev = frameMagnitudes[Math.max(0, f - 1)];
    const fNext = frameMagnitudes[Math.min(numFrames - 1, f + 1)];
    const cleanAttackSpectrum = new Float32Array(halfFFT);

    for (let bin = 1; bin < halfFFT; bin++) {
      const curVal = fCurr ? fCurr[bin] : 0;
      const prevVal = fPrev ? fPrev[bin] : 0;
      const nextVal = fNext ? fNext[bin] : 0;
      // Differential energy surge without destroying sustained harmonics
      const diff = Math.max(0, curVal - prevVal);
      cleanAttackSpectrum[bin] = diff * 0.65 + Math.max(curVal, nextVal) * 0.35;
    }
    const mags = cleanAttackSpectrum;

    // 1. Khử bội âm tay trái (Harmonic Subtraction / Sieve)
    // Quét các đỉnh tần số ở vùng trầm/trung (110Hz đến 420Hz).
    // Với mỗi đỉnh f, trừ bớt năng lượng tại 2f (trừ 65%), 3f (trừ 45%), 4f (trừ 25%)
    const minHarmBin = Math.max(1, Math.round(110 / binHz));
    const maxHarmBin = Math.min(halfFFT - 2, Math.round(420 / binHz));
    for (let b = minHarmBin; b <= maxHarmBin; b++) {
      if (mags[b] > mags[b - 1] && mags[b] > mags[b + 1] && mags[b] > 0.012) {
        const fPeak = b * binHz;
        const ePeak = mags[b];

        // 2f (trừ 65%)
        const b2 = Math.round((2 * fPeak) / binHz);
        if (b2 < halfFFT - 1) {
          for (let k = Math.max(1, b2 - 1); k <= Math.min(halfFFT - 1, b2 + 1); k++) {
            mags[k] = Math.max(0, mags[k] - 0.65 * ePeak);
          }
        }
        // 3f (trừ 45%)
        const b3 = Math.round((3 * fPeak) / binHz);
        if (b3 < halfFFT - 1) {
          for (let k = Math.max(1, b3 - 1); k <= Math.min(halfFFT - 1, b3 + 1); k++) {
            mags[k] = Math.max(0, mags[k] - 0.45 * ePeak);
          }
        }
        // 4f (trừ 25%)
        const b4 = Math.round((4 * fPeak) / binHz);
        if (b4 < halfFFT - 1) {
          for (let k = Math.max(1, b4 - 1); k <= Math.min(halfFFT - 1, b4 + 1); k++) {
            mags[k] = Math.max(0, mags[k] - 0.25 * ePeak);
          }
        }
      }
    }

    // Harmonic salience from C3 (48) to C6 (84) with Parabolic Peak Interpolation
    const rawSal = new Float32Array(85);
    const f0Energy = new Float32Array(85);
    const weights = [1.0, 0.65, 0.40, 0.25];

    for (let midi = 48; midi <= 84; midi++) {
      const f0 = 440 * Math.pow(2, (midi - 69) / 12);
      let sal = 0;
      for (let h = 1; h <= 4; h++) {
        const targetBin = Math.round((f0 * h) / binHz);
        if (targetBin < halfFFT - 1) {
          let maxM = 0;
          for (let b = Math.max(1, targetBin - 1); b <= Math.min(halfFFT - 2, targetBin + 1); b++) {
            let mVal = mags[b];
            if (b > 1 && b < halfFFT - 2 && mags[b] > mags[b - 1] && mags[b] > mags[b + 1]) {
              const alpha = mags[b - 1];
              const beta = mags[b];
              const gamma = mags[b + 1];
              const denom = 2 * (2 * beta - alpha - gamma);
              if (denom > 0) {
                mVal = beta + (alpha - gamma) * (alpha - gamma) / (8 * denom);
              }
            }
            if (mVal > maxM) maxM = mVal;
          }
          if (h === 1) f0Energy[midi] = maxM;
          sal += maxM * weights[h - 1];
        }
      }
      if (f0Energy[midi] < sal * 0.18) {
        sal *= 0.30;
      }
      // 2. Bù năng lượng tần số cao (Treble Pre-Emphasis / Equal-Loudness Weighting)
      // Math.pow(f0 / 261.63, 0.85) giúp nốt giai điệu tay phải thắng tiếng đệm tay trái
      const preEmphasis = Math.pow(f0 / 261.63, 0.85);
      rawSal[midi] = sal * preEmphasis;
    }

    // Suppress overtone leakage from lower octaves without state trapping
    const cleanSal = new Float32Array(85);
    for (let midi = 52; midi <= 84; midi++) {
      let s = rawSal[midi];
      if (midi - 12 >= 48 && f0Energy[midi - 12] > 0.04) {
        s = Math.max(s * 0.50, s - 0.40 * f0Energy[midi - 12]);
      }
      if (midi - 19 >= 48 && f0Energy[midi - 19] > 0.04) {
        s = Math.max(s * 0.50, s - 0.35 * f0Energy[midi - 19]);
      }
      cleanSal[midi] = Math.max(0, s);
    }

    // Collect local pitch candidates
    const allCands = [];
    for (let midi = 55; midi <= 84; midi++) {
      if (cleanSal[midi] > 0.025) {
        const f0 = 440 * Math.pow(2, (midi - 69) / 12);
        const hnr = computeHNR(cleanAttackSpectrum, f0, binHz, halfFFT);
        if (hnr >= 1.05) {
          allCands.push({ midi, salience: cleanSal[midi], hnr });
        }
      }
    }

    // 3. Ưu tiên Đỉnh Cao Nhất Đủ Ngưỡng (Upper Spectral Envelope / Skyline Selection)
    if (allCands.length > 0) {
      const maxRawScore = Math.max(...allCands.map(c => c.salience));
      // Lập danh sách ứng viên có điểm >= 0.38 * maxRawScore (các nốt thực sự đang vang lên rõ ràng)
      const viable = allCands.filter(c => c.salience >= 0.38 * maxRawScore);
      if (viable.length > 0) {
        // Trong nhóm ứng viên vượt ngưỡng, ưu tiên mạnh nốt có tần số cao hơn (Skyline tay phải)
        const highestViableMidi = Math.max(...viable.map(c => c.midi));
        for (const c of viable) {
          if (c.midi === highestViableMidi) {
            c.salience *= 1.65;
          } else {
            c.salience *= (1.0 + 0.18 * ((c.midi - 60) / 24.0));
          }
        }
        viable.sort((a, b) => b.salience - a.salience);
        onsetCandidates.push({ time: timeMs, candidates: viable.slice(0, 4) });
      } else {
        allCands.sort((a, b) => b.salience - a.salience);
        onsetCandidates.push({ time: timeMs, candidates: allCands.slice(0, 4) });
      }
    }
  }

  if (onsetCandidates.length < 5) {
    throw new Error("Không trích xuất được nốt giai điệu phù hợp.");
  }

  // Pass 3B: Smooth Viterbi Dynamic Programming without State Trapping
  const N = onsetCandidates.length;

  function getTransitionScore(prevMidi, currMidi, dt) {
    const diff = Math.abs(currMidi - prevMidi);
    if (diff === 0) return 0.20; // Slight continuity for repeated sung syllables
    if (diff === 12) return -0.25; // Natural octave jump
    if (diff <= 4) return -0.06 * diff; // Smooth stepwise motion
    if (diff <= 7) return -0.10 * diff; // 4th or 5th leaps
    return -0.15 * diff; // Larger leaps
  }

  const dp = onsetCandidates.map(oc => oc.candidates.map(() => -999999));
  const backptr = onsetCandidates.map(oc => oc.candidates.map(() => 0));

  for (let c = 0; c < onsetCandidates[0].candidates.length; c++) {
    const cand = onsetCandidates[0].candidates[c];
    dp[0][c] = Math.log(cand.salience + 0.001);
  }

  for (let i = 1; i < N; i++) {
    const dt = (onsetCandidates[i].time - onsetCandidates[i - 1].time) / 1000.0;
    const currCands = onsetCandidates[i].candidates;
    const prevCands = onsetCandidates[i - 1].candidates;
    const maxSal = currCands[0].salience;

    for (let c = 0; c < currCands.length; c++) {
      const cand = currCands[c];
      const normSal = cand.salience / (maxSal + 0.0001);
      const emitScore = normSal * 2.5;

      for (let p = 0; p < prevCands.length; p++) {
        const prev = prevCands[p];
        const transScore = getTransitionScore(prev.midi, cand.midi, dt);
        const total = dp[i - 1][p] + emitScore + transScore;
        if (total > dp[i][c]) {
          dp[i][c] = total;
          backptr[i][c] = p;
        }
      }
    }
  }

  // Backtrack optimal Viterbi melody sequence
  const rawMelodyEvents = new Array(N);
  let bestLastIdx = 0;
  for (let c = 1; c < onsetCandidates[N - 1].candidates.length; c++) {
    if (dp[N - 1][c] > dp[N - 1][bestLastIdx]) bestLastIdx = c;
  }
  let currIdx = bestLastIdx;
  for (let i = N - 1; i >= 0; i--) {
    const chosen = onsetCandidates[i].candidates[currIdx];
    rawMelodyEvents[i] = {
      time: onsetCandidates[i].time,
      midi: chosen.midi,
      salience: chosen.salience
    };
    currIdx = backptr[i][currIdx];
  }

  // Rolled-Chord High-Note Override before Key Transposition
  const resolvedMelodyEvents = resolveRolledChords(rawMelodyEvents);

  // Optimal Scale-Fit Transposition to C Major
  let finalBassPitchClass = null;
  let maxFinalBassEnergy = 0;
  for (let f = Math.max(0, numFrames - 150); f < numFrames; f++) {
    const fm = frameMagnitudes[f];
    if (fm) {
      for (let midi = 36; midi <= 55; midi++) {
        const f0 = 440 * Math.pow(2, (midi - 69) / 12);
        const bin = Math.round(f0 / binHz);
        if (bin < halfFFT && fm[bin] > maxFinalBassEnergy) {
          maxFinalBassEnergy = fm[bin];
          finalBassPitchClass = midi % 12;
        }
      }
    }
  }

  const bestShift = findOptimalSkyTranspose(resolvedMelodyEvents, finalBassPitchClass);

  // Pass 5: Full-Window Integrated 12-Bin Chromagram
  const windowMs = beatMs * 2;
  const totalWindows = Math.ceil((pcm.length / sampleRate) * 1000 / windowMs);
  const chordPerWindow = new Array(totalWindows);
  let prevChordIdx = 0;

  for (let w = 0; w < totalWindows; w++) {
    const startFrame = Math.max(0, Math.floor(((w * windowMs) / 1000 * sampleRate) / hopSize));
    const endFrame = Math.min(numFrames - 1, Math.floor((((w + 1) * windowMs) / 1000 * sampleRate) / hopSize));
    const chroma = new Float32Array(12);

    for (let f = startFrame; f <= endFrame; f += 2) {
      const mags = frameMagnitudes[f];
      if (!mags) continue;
      for (let midi = 40; midi <= 71; midi++) {
        const f0 = 440 * Math.pow(2, (midi - 69) / 12);
        const bin = Math.round(f0 / binHz);
        if (bin < halfFFT) {
          const pc = ((midi + bestShift) % 12 + 12) % 12;
          const bassWeight = midi < 55 ? 1.45 : 1.0;
          chroma[pc] += mags[bin] * bassWeight;
        }
      }
    }

    let bestChord = DIATONIC_CHORDS[prevChordIdx];
    let bestScore = -999;
    DIATONIC_CHORDS.forEach((c, cIdx) => {
      let score = 1.80 * chroma[c.root] + 1.15 * chroma[c.third] + 0.95 * chroma[c.fifth];
      if (cIdx === prevChordIdx) score *= 1.08;
      if (score > bestScore && score > 0.01) {
        bestScore = score;
        bestChord = c;
        prevChordIdx = cIdx;
      }
    });
    chordPerWindow[w] = bestChord;
  }

  // Pass 6: Placement & Diatonic Note Mapping
  const generatedNotes = [];
  const melodyByTime = new Map();
  let lastMelodyKey = -1;
  let lastMelodyTime = -9999;
  let prevShiftedMidi = 72;

  const melodyEvents = (typeof resolvedMelodyEvents !== 'undefined') ? resolvedMelodyEvents : rawMelodyEvents;

  // 6A. Lead Melody Placement
  for (let i = 0; i < melodyEvents.length; i++) {
    const e = melodyEvents[i];
    const wIdx = Math.min(totalWindows - 1, Math.floor(e.time / windowMs));
    const chord = chordPerWindow[wIdx] || DIATONIC_CHORDS[0];

    let shiftedMidi = e.midi + bestShift;
    while (shiftedMidi < 60) shiftedMidi += 12;
    while (shiftedMidi > 84) shiftedMidi -= 12;

    if (i > 0 && (e.time - lastMelodyTime) < 1200) {
      if (shiftedMidi - prevShiftedMidi >= 10 && shiftedMidi - 12 >= 60) {
        shiftedMidi -= 12;
      } else if (prevShiftedMidi - shiftedMidi >= 10 && shiftedMidi + 12 <= 84) {
        shiftedMidi += 12;
      }
    }
    prevShiftedMidi = shiftedMidi;

    const resolvedMidi = resolveAccidentalToDiatonic(shiftedMidi, chord.name);
    const finalTime = shouldQuantize ? Math.round(e.time / gridStep) * gridStep : e.time;
    const keyIdx = midiToSkyKeyIdx(resolvedMidi);

    if (keyIdx === lastMelodyKey && (finalTime - lastMelodyTime) < Math.min(100, gridStep)) {
      continue;
    }

    if (!melodyByTime.has(finalTime)) {
      melodyByTime.set(finalTime, { keyIdx, origMidi: resolvedMidi, time: finalTime });
      generatedNotes.push({
        time: finalTime,
        key: `1Key${keyIdx}`,
        type: 'melody'
      });
      lastMelodyKey = keyIdx;
      lastMelodyTime = finalTime;
    }
  }

  // 6B. Harmonious Accompaniment (Clean & Non-Intrusive)
  if (style !== 'solo') {
    const sortedTimes = Array.from(melodyByTime.keys()).sort((a, b) => a - b);
    let lastBassTime = -9999;

    for (let i = 0; i < sortedTimes.length; i++) {
      const curTime = sortedTimes[i];
      const curMelody = melodyByTime.get(curTime);

      const wIdx = Math.min(totalWindows - 1, Math.floor(curTime / windowMs));
      const chord = chordPerWindow[wIdx] || DIATONIC_CHORDS[0];

      // Insert clean bass root only on new measure boundaries (spaced at least 1.8 beats)
      const isNewBar = (curTime - lastBassTime >= beatMs * 1.8);
      if (isNewBar) {
        let bassKey = chord.rootKey; // C4(0) to A4(5)
        if (bassKey < curMelody.keyIdx - 1) {
          generatedNotes.push({
            time: curTime,
            key: `1Key${bassKey}`,
            type: 'bass_root'
          });
          lastBassTime = curTime;
        }
      }
    }
  }

  generatedNotes.sort((a, b) => a.time - b.time);

  // 4. Hậu kiểm bằng purifySkySheetNotes (Skyline Top-Voice + Downbeat Bass Gating)
  const isSolo = (style === 'solo');
  const purifiedNotes = purifySkySheetNotes(generatedNotes, detectedBpm, isSolo);

  // 6C. Deduplicate & Auto-Trim Leading Silence
  const uniqueNotes = [];
  const seen = new Set();
  const firstRawTime = purifiedNotes.length > 0 ? purifiedNotes[0].time : 0;
  const timeOffset = firstRawTime > 500 ? (firstRawTime - 500) : 0;

  for (const n of purifiedNotes) {
    const trimmedTime = Math.max(0, n.time - timeOffset);
    const sig = `${trimmedTime}_${n.key}`;
    if (!seen.has(sig)) {
      seen.add(sig);
      uniqueNotes.push({ time: trimmedTime, key: n.key });
    }
  }

  const tMap = {};
  uniqueNotes.forEach((n) => { tMap[n.time] = (tMap[n.time] || 0) + 1; });
  const chordsCount = Object.values(tMap).filter((v) => v > 1).length;

  if (progressCb) progressCb(`Đang lưu ${uniqueNotes.length} nốt (${chordsCount} hợp âm, ${detectedBpm} BPM) vào thư viện...`);

  if (window.pywebview && window.pywebview.api) {
    const res = await window.pywebview.api.save_converted_audio_sheet(title, detectedBpm, uniqueNotes);
    if (res && res.success) {
      await fetchSongs();
      const found = songsList.find((s) => s.filename === res.filename);
      if (found) selectSong(found);
      if (progressCb) progressCb(`Thành công! Đã tạo ${uniqueNotes.length} nốt chuyển soạn (${detectedBpm} BPM).`);
    } else {
      throw new Error(res ? res.error : "Không thể lưu sheet");
    }
  }
}

async function transcribeAudioToSkySheet(file) {
  initAudio();
  dropZoneText.innerHTML = `Đang đọc file âm thanh <strong>${escapeHtml(file.name)}</strong>...`;

  try {
    const arrayBuffer = await file.arrayBuffer();
    const cleanTitle = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
    await convertAudioBufferToSkySheet(arrayBuffer, cleanTitle, (status) => {
      dropZoneText.innerHTML = status;
    });
    setTimeout(() => {
      dropZoneText.innerHTML = `Hoặc kéo thả file <strong>.mp3 / .wav / .mid / .json / .txt</strong> vào đây`;
    }, 2500);
  } catch (err) {
    console.error("Audio transcription error:", err);
    alert(`Lỗi khi phân tích âm thanh: ${err.message}`);
    dropZoneText.innerHTML = `Hoặc kéo thả file <strong>.mp3 / .wav / .mid / .json / .txt</strong> vào đây`;
  }
}

async function processYouTubeUrl(url) {
  initAudio();
  const btnYt = document.getElementById("btnConvertYoutube");
  const origBtnText = btnYt ? btnYt.innerHTML : "Tạo Sheet";
  if (btnYt) {
    btnYt.disabled = true;
    btnYt.innerHTML = "Đang tải...";
  }
  dropZoneText.innerHTML = "Đang kết nối và tải âm thanh YouTube...";

  try {
    if (!window.pywebview || !window.pywebview.api) {
      throw new Error("Chưa kết nối Backend PyWebView");
    }

    const ytRes = await window.pywebview.api.download_youtube_audio(url);
    if (!ytRes || !ytRes.success) {
      throw new Error(ytRes ? ytRes.error : "Không thể tải âm thanh từ link YouTube này");
    }

    if (ytRes.matched_sheet && ytRes.matched_sheet.filename) {
      dropZoneText.innerHTML = `🌟 Phát hiện bản Sheet Sky chuẩn cộng đồng khớp 100%: <strong>${escapeHtml(ytRes.matched_sheet.title)}</strong> (${ytRes.matched_sheet.notes_count} nốt). Đang mở...`;
      await fetchSongs();
      const found = songsList.find((s) => s.filename === ytRes.matched_sheet.filename);
      if (found) selectSong(found);
      if (btnYt) btnYt.innerHTML = "Đã tìm thấy Sheet!";
      const ytInput = document.getElementById("inputYoutubeUrl");
      if (ytInput) ytInput.value = "";
      setTimeout(() => {
        dropZoneText.innerHTML = `Hoặc kéo thả file <strong>.mp3 / .wav / .mid / .json / .txt</strong> vào đây`;
      }, 3500);
      return;
    }

    if (btnYt) btnYt.innerHTML = "Đang phân tích...";
    if (ytRes.hijacked && ytRes.cover_title) {
      dropZoneText.innerHTML = `Phát hiện MV gốc, tự động kết nối bản Piano Solo: <strong>${escapeHtml(ytRes.cover_title)}</strong>...`;
    } else {
      dropZoneText.innerHTML = `Đang phân tích giai điệu <strong>${escapeHtml(ytRes.title)}</strong>...`;
    }

    // Fetch base64 data_url into arrayBuffer
    const audioResp = await fetch(ytRes.data_url);
    const arrayBuffer = await audioResp.arrayBuffer();

    await convertAudioBufferToSkySheet(arrayBuffer, ytRes.title, (status) => {
      if (btnYt) btnYt.innerHTML = status;
      dropZoneText.innerHTML = status;
    });

    const ytInput = document.getElementById("inputYoutubeUrl");
    if (ytInput) ytInput.value = "";
    setTimeout(() => {
      dropZoneText.innerHTML = `Hoặc kéo thả file <strong>.mp3 / .wav / .mid / .json / .txt</strong> vào đây`;
    }, 2500);
  } catch (err) {
    console.error("YouTube conversion error:", err);
    alert(`Lỗi chuyển đổi YouTube: ${err.message}`);
    dropZoneText.innerHTML = `Hoặc kéo thả file <strong>.mp3 / .wav / .mid / .json / .txt</strong> vào đây`;
  } finally {
    if (btnYt) {
      btnYt.disabled = false;
      btnYt.innerHTML = origBtnText;
    }
  }
}


/* ==========================================================
   10. Wire Up Event Listeners
   ========================================================== */
function setupEvents() {
  btnExpandToFull.addEventListener('click', () => setViewMode('full'));
  btnCollapseToMini.addEventListener('click', () => setViewMode('mini'));

  if (btnSettingsMini) {
    btnSettingsMini.addEventListener('click', (e) => {
      e.stopPropagation();
      setViewMode('full');
      setTimeout(openSettingsModal, 150);
    });
  }
  if (btnSettingsFull) {
    btnSettingsFull.addEventListener('click', (e) => {
      e.stopPropagation();
      openSettingsModal();
    });
  }

  if (btnPrevSongMini) {
    btnPrevSongMini.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleSong(-1);
    });
  }
  if (btnNextSongMini) {
    btnNextSongMini.addEventListener('click', (e) => {
      e.stopPropagation();
      cycleSong(1);
    });
  }

  btnCloseApp.addEventListener('click', () => {
    if (window.pywebview && window.pywebview.api) window.pywebview.api.exit_app();
  });
  btnCloseAppFull.addEventListener('click', () => {
    if (window.pywebview && window.pywebview.api) window.pywebview.api.exit_app();
  });

  // Toggle Humanized Input (Anti-Ban / Exact Timing)
  const btnToggleHumanize = document.getElementById('btnToggleHumanize');
  if (btnToggleHumanize) {
    btnToggleHumanize.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (window.pywebview && window.pywebview.api && window.pywebview.api.toggle_humanize) {
        const isEnabled = await window.pywebview.api.toggle_humanize();
        updateHumanizeUI(isEnabled);
      }
    });
  }

  // Mini HUD song selector dropdown
  miniSongTitle.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMiniDropdown();
  });
  miniSearchInput.addEventListener('input', renderMiniDropdown);
  miniSearchInput.addEventListener('click', (e) => e.stopPropagation());

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (isMiniDropdownOpen && !miniSongDropdown.contains(e.target) && e.target !== miniSongTitle) {
      toggleMiniDropdown(false);
    }
  });

  // Close dropdown on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (isMiniDropdownOpen) toggleMiniDropdown(false);
      closeNewPlaylistModal();
      closeAddToPlaylistModal();
    }
  });

  // Play / Pause / Resume into Game
  btnPlayInGame.addEventListener('click', (e) => {
    e.stopPropagation();
    handleGamePlayToggle();
  });
  btnFullPlayGame.addEventListener('click', (e) => {
    e.stopPropagation();
    handleGamePlayToggle();
  });

  // Preview / Pause / Resume in App
  btnPreviewSound.addEventListener('click', (e) => {
    e.stopPropagation();
    handlePreviewToggle();
  });
  btnFullPreview.addEventListener('click', (e) => {
    e.stopPropagation();
    handlePreviewToggle();
  });

  // Stop
  btnStopMini.addEventListener('click', (e) => {
    e.stopPropagation();
    stopPlayback();
  });
  btnFullStop.addEventListener('click', (e) => {
    e.stopPropagation();
    stopPlayback();
  });

  // Instrument selector
  if (selectInstrument) {
    selectInstrument.addEventListener('change', (e) => {
      currentInstrument = e.target.value;
      if (selectedSong && window.pywebview && window.pywebview.api) {
        selectedSong.instrument = currentInstrument;
        window.pywebview.api.update_song_instrument(selectedSong.filename, currentInstrument);
        renderLibrary();
      }
    });
  }

  // Smooth Scrubbing on Mini HUD progress bar
  let isMiniScrubbing = false;
  function handleMiniScrub(e) {
    const rect = miniProgressClickArea.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    miniProgressBar.style.width = `${pct * 100}%`;
    miniProgressThumb.style.left = `${pct * 100}%`;
    if (selectedSong && selectedSong.duration > 0) {
      const curr = pct * selectedSong.duration;
      miniTimeElapsed.textContent = formatTime(curr);
      miniTimeRemaining.textContent = `-${formatTime(selectedSong.duration - curr)}`;
    }
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.seek(pct);
    }
  }

  miniProgressClickArea.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    isMiniScrubbing = true;
    handleMiniScrub(e);
  });

  // Smooth Scrubbing on Full Studio seek track
  let isFullScrubbing = false;
  function handleFullScrub(e) {
    const rect = fullSeekTrack.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    fullSeekFill.style.width = `${pct * 100}%`;
    fullSeekThumb.style.left = `${pct * 100}%`;
    if (selectedSong && selectedSong.duration > 0) {
      const curr = pct * selectedSong.duration;
      fullTimeElapsed.textContent = formatTime(curr);
      fullTimeRemaining.textContent = `-${formatTime(selectedSong.duration - curr)}`;
    }
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.seek(pct);
    }
  }

  fullSeekTrack.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    isFullScrubbing = true;
    handleFullScrub(e);
  });

  window.addEventListener('mousemove', (e) => {
    if (isMiniScrubbing) {
      e.preventDefault();
      handleMiniScrub(e);
    } else if (isFullScrubbing) {
      e.preventDefault();
      handleFullScrub(e);
    }
  });

  window.addEventListener('mouseup', () => {
    isMiniScrubbing = false;
    isFullScrubbing = false;
  });

  // Speed slider
  speedSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    currentSpeed = val;
    speedValueDisplay.textContent = `${val.toFixed(2)}x`;
    if (window.pywebview && window.pywebview.api) window.pywebview.api.set_speed(val);
  });

  // Key preset
  selectKeyPreset.addEventListener('change', (e) => {
    const preset = e.target.value;
    if (window.pywebview && window.pywebview.api) window.pywebview.api.save_preset(preset);
  });

  // Local Search
  libSearchInput.addEventListener('input', renderLibrary);

  // Open folder
  btnOpenFolderSide.addEventListener('click', () => {
    if (window.pywebview && window.pywebview.api) window.pywebview.api.open_songs_folder();
  });

  // YouTube Direct Conversion
  const btnConvertYoutube = document.getElementById('btnConvertYoutube');
  const inputYoutubeUrl = document.getElementById('inputYoutubeUrl');
  if (btnConvertYoutube && inputYoutubeUrl) {
    btnConvertYoutube.addEventListener('click', (e) => {
      e.stopPropagation();
      const url = inputYoutubeUrl.value.trim();
      if (!url) {
        alert('Vui lòng dán link video YouTube!');
        return;
      }
      processYouTubeUrl(url);
    });

    inputYoutubeUrl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.stopPropagation();
        const url = inputYoutubeUrl.value.trim();
        if (url) processYouTubeUrl(url);
      }
    });
  }

  // Browse File (Audio, MIDI, Sheet)
  btnBrowseFile.addEventListener('click', () => fileInputMidi.click());
  fileInputMidi.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImportFile(e.target.files[0]);
    }
  });

  // Dropzone (MP3, WAV, MIDI, JSON, TXT)
  midiDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    midiDropZone.style.borderColor = 'var(--gold-primary)';
  });

  midiDropZone.addEventListener('dragleave', () => {
    midiDropZone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
  });

  midiDropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    midiDropZone.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleImportFile(e.dataTransfer.files[0]);
    }
  });

  // Playlist Modals
  btnNewPlaylist.addEventListener('click', openNewPlaylistModal);
  btnCancelPlaylist.addEventListener('click', closeNewPlaylistModal);
  btnConfirmPlaylist.addEventListener('click', confirmNewPlaylist);
  inputPlaylistName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmNewPlaylist();
  });
  btnCloseAddToPlaylist.addEventListener('click', closeAddToPlaylistModal);

  // Queue Controls
  if (btnStartQueuePlay) btnStartQueuePlay.addEventListener('click', startQueuePlayback);
  if (btnShuffleQueue) btnShuffleQueue.addEventListener('click', shuffleQueue);
  if (btnLoopQueue) btnLoopQueue.addEventListener('click', toggleQueueLoop);
  if (btnClearQueue) btnClearQueue.addEventListener('click', clearQueue);
  if (btnPlayAllPlaylist) btnPlayAllPlaylist.addEventListener('click', playAllCurrentPlaylist);

  // Keybind Modal Buttons
  if (btnCloseSettingsModalX) btnCloseSettingsModalX.addEventListener('click', closeSettingsModal);
  if (btnCancelKeybinds) btnCancelKeybinds.addEventListener('click', closeSettingsModal);
  if (btnSaveKeybinds) btnSaveKeybinds.addEventListener('click', saveKeybinds);
  if (btnResetKeybinds) btnResetKeybinds.addEventListener('click', resetKeybindsToDefault);

  if (keybindBoxToggleHud) {
    keybindBoxToggleHud.addEventListener('click', () => startCapturingKey('toggle_hud', keybindBoxToggleHud));
  }
  if (keybindBoxPlayPause) {
    keybindBoxPlayPause.addEventListener('click', () => startCapturingKey('play_pause', keybindBoxPlayPause));
  }
  if (keybindBoxEmergencyStop) {
    keybindBoxEmergencyStop.addEventListener('click', () => startCapturingKey('emergency_stop', keybindBoxEmergencyStop));
  }

  // Song Rename Modal
  if (btnCancelRenameSong) {
    btnCancelRenameSong.addEventListener('click', () => modalRenameSong.classList.add('hidden'));
  }
  if (btnConfirmRenameSong) {
    btnConfirmRenameSong.addEventListener('click', confirmRenameSong);
  }
  if (inputRenameSong) {
    inputRenameSong.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') confirmRenameSong();
    });
  }

  // Song Delete Modal
  if (btnCancelDeleteSong) {
    btnCancelDeleteSong.addEventListener('click', () => modalConfirmDelete.classList.add('hidden'));
  }
  if (btnConfirmDeleteSong) {
    btnConfirmDeleteSong.addEventListener('click', confirmDeleteSong);
  }

  // Global Keydown Handler (Interactive Keybind Capture & Escape Modal Dismiss)
  window.addEventListener('keydown', (e) => {
    if (activeCapturingAction) {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        activeCapturingAction = null;
        resetCapturingBoxes();
        updateKeybindBoxesUI();
        if (keybindConflictAlert) keybindConflictAlert.classList.add('hidden');
        return;
      }
      const pressedKey = getKeyboardLibKey(e);
      const otherActions = ['toggle_hud', 'play_pause', 'emergency_stop'].filter(a => a !== activeCapturingAction);
      const hasConflict = otherActions.some(a => tempKeybinds[a] === pressedKey);
      if (hasConflict) {
        if (keybindConflictAlert) {
          keybindConflictAlert.textContent = `Phím "${formatKeyDisplay(pressedKey)}" đã được gán cho chức năng khác!`;
          keybindConflictAlert.classList.remove('hidden');
        }
        return;
      }
      if (keybindConflictAlert) keybindConflictAlert.classList.add('hidden');
      tempKeybinds[activeCapturingAction] = pressedKey;
      activeCapturingAction = null;
      resetCapturingBoxes();
      updateKeybindBoxesUI();
      return;
    }

    if (e.key === 'Escape') {
      if (modalSettingsKeybind && !modalSettingsKeybind.classList.contains('hidden')) {
        closeSettingsModal();
      }
      if (modalRenameSong && !modalRenameSong.classList.contains('hidden')) {
        modalRenameSong.classList.add('hidden');
      }
      if (modalConfirmDelete && !modalConfirmDelete.classList.contains('hidden')) {
        modalConfirmDelete.classList.add('hidden');
      }
      if (modalNewPlaylist && !modalNewPlaylist.classList.contains('hidden')) {
        closeNewPlaylistModal();
      }
      if (modalAddToPlaylist && !modalAddToPlaylist.classList.contains('hidden')) {
        closeAddToPlaylistModal();
      }
      if (isMiniDropdownOpen) toggleMiniDropdown(false);
      hideSongContextMenu();
    }
  }, true);

  // Context Menu Events for Local Songs
  if (ctxMenuPlay) {
    ctxMenuPlay.addEventListener('click', () => {
      if (contextTargetSong) selectSong(contextTargetSong);
      hideSongContextMenu();
    });
  }
  if (ctxMenuPreview) {
    ctxMenuPreview.addEventListener('click', () => {
      if (contextTargetSong) {
        selectSong(contextTargetSong);
        playPreview();
      }
      hideSongContextMenu();
    });
  }
  if (ctxMenuQueue) {
    ctxMenuQueue.addEventListener('click', () => {
      if (contextTargetSong) {
        addToQueue(contextTargetSong);
        hideSongContextMenu();
      }
    });
  }
  if (ctxMenuRename) {
    ctxMenuRename.addEventListener('click', () => {
      if (contextTargetSong) {
        const s = contextTargetSong;
        hideSongContextMenu();
        openRenameModal(s);
      }
    });
  }
  if (ctxMenuPlaylist) {
    ctxMenuPlaylist.addEventListener('click', () => {
      if (contextTargetSong) {
        const s = contextTargetSong;
        hideSongContextMenu();
        openAddToPlaylistModal(s);
      }
    });
  }
  if (ctxMenuDelete) {
    ctxMenuDelete.addEventListener('click', () => {
      if (contextTargetSong) {
        const s = contextTargetSong;
        hideSongContextMenu();
        openDeleteModal(s);
      }
    });
  }

  // Dismiss context menu on click outside or escape
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#songContextMenu')) {
      hideSongContextMenu();
    }
  });
  document.addEventListener('contextmenu', (e) => {
    if (!e.target.closest('.song-card')) {
      hideSongContextMenu();
    }
  });

  // Online Sheet Store
  setupOnlineSheetStore();
}

function handleImportFile(file) {
  const nameLower = file.name.toLowerCase();
  const isAudio = nameLower.endsWith('.mp3') || nameLower.endsWith('.wav') || nameLower.endsWith('.ogg') || nameLower.endsWith('.m4a');
  const isMidi = nameLower.endsWith('.mid') || nameLower.endsWith('.midi');

  if (isAudio) {
    transcribeAudioToSkySheet(file);
    return;
  }

  if (isMidi) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const base64 = btoa(
        new Uint8Array(event.target.result)
          .reduce((data, byte) => data + String.fromCharCode(byte), '')
      );
      if (window.pywebview && window.pywebview.api) {
        window.pywebview.api.import_midi_base64(file.name, base64).then(() => {
          fetchSongs();
        });
      }
    };
    reader.readAsArrayBuffer(file);
    return;
  }

  // JSON or TXT sheet
  const reader = new FileReader();
  reader.onload = function(event) {
    if (window.pywebview && window.pywebview.api) {
      window.pywebview.api.import_text_file(file.name, event.target.result).then(() => {
        fetchSongs();
      });
    }
  };
  reader.readAsText(file);
}

function fetchSongs() {
  if (window.pywebview && window.pywebview.api) {
    window.pywebview.api.get_songs().then((songs) => {
      songsList = songs || [];
      fetchPlaylists();
      if (songsList.length > 0) {
        if (!selectedSong || !songsList.some(s => s.filename === selectedSong.filename)) {
          selectSong(songsList[0]);
        }
      } else {
        selectedSong = null;
        miniSongTitle.textContent = "Chưa chọn bài hát";
        miniTimeElapsed.textContent = "00:00";
        miniTimeRemaining.textContent = "-00:00";
        fullSongTitle.textContent = "Chưa có bài hát";
        fullSongAuthor.textContent = "Vui lòng import hoặc tải sheet";
        fullSongFormat.textContent = "--";
        fullSongNotes.textContent = "0 nốt";
      }
    });
  }
}

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return '00:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
  if (!text) return '';
  const d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function updateHumanizeUI(enabled) {
  const btn = document.getElementById('btnToggleHumanize');
  const txt = document.getElementById('humanizeStatusText');
  if (!btn || !txt) return;
  if (enabled) {
    btn.classList.add('active');
    btn.classList.remove('disabled');
    txt.textContent = 'Mô phỏng người: Bật';
    btn.setAttribute('title', 'Đang BẬT mô phỏng ngón tay người. Bấm để TẮT (Đánh chính xác 100% theo nhịp sheet).');
  } else {
    btn.classList.remove('active');
    btn.classList.add('disabled');
    txt.textContent = 'Mô phỏng người: Tắt';
    btn.setAttribute('title', 'Đang TẮT mô phỏng ngón tay người (Đánh chính xác 100%). Bấm để BẬT mô phỏng người.');
  }
}

function initHumanizeStatus() {
  if (window.pywebview && window.pywebview.api && window.pywebview.api.get_humanize_status) {
    window.pywebview.api.get_humanize_status().then((status) => {
      updateHumanizeUI(status);
    });
  }
}

window.addEventListener('pywebviewready', () => {
  fetchSongs();
  initHumanizeStatus();
});

window.addEventListener('DOMContentLoaded', () => {
  buildKeyboard();
  initWaterfall();
  setupEvents();
  setViewMode('mini');
  if (window.pywebview && window.pywebview.api) {
    fetchSongs();
    initHumanizeStatus();
  }
});
