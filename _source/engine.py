"""
Xie's Musician Pro - Core Audio Engine & Input Controller
Precision timing, multi-format parser (TXT, JSON), global hotkeys, safe stop.
"""

import os
import re
import json
import time
import random
import threading
import pydirectinput

# Reduce default pydirectinput pause to ensure high-speed chord dispatch
pydirectinput.PAUSE = 0.001

KEY_PRESETS = {
    "sky_steam": {
        "A1": "y", "A2": "u", "A3": "i", "A4": "o", "A5": "p",
        "B1": "h", "B2": "j", "B3": "k", "B4": "l", "B5": ";",
        "C1": "n", "C2": "m", "C3": ",", "C4": ".", "C5": "/"
    },
    "qwert": {
        "A1": "q", "A2": "w", "A3": "e", "A4": "r", "A5": "t",
        "B1": "a", "B2": "s", "B3": "d", "B4": "f", "B5": "g",
        "C1": "z", "C2": "x", "C3": "c", "C4": "v", "C5": "b"
    },
    "numbers": {
        "A1": "1", "A2": "2", "A3": "3", "A4": "4", "A5": "5",
        "B1": "q", "B2": "w", "B3": "e", "B4": "r", "B5": "t",
        "C1": "a", "C2": "s", "C3": "d", "C4": "f", "C5": "g"
    }
}

SKY_NOTE_NAMES = [
    "A1", "A2", "A3", "A4", "A5",
    "B1", "B2", "B3", "B4", "B5",
    "C1", "C2", "C3", "C4", "C5"
]

INDEX_TO_NOTE = {
    0: "A1", 1: "A2", 2: "A3", 3: "A4", 4: "A5",
    5: "B1", 6: "B2", 7: "B3", 8: "B4", 9: "B5",
    10: "C1", 11: "C2", 12: "C3", 13: "C4", 14: "C5"
}

NOTE_TO_INDEX = {v: k for k, v in INDEX_TO_NOTE.items()}

class SongEvent:
    def __init__(self, time_sec, notes):
        self.time_sec = float(time_sec)
        self.notes = list(notes)

class ParsedSong:
    def __init__(self, title, format_type, events, total_duration, author="Unknown", bpm=120):
        self.title = title
        self.format_type = format_type
        self.events = sorted(events, key=lambda e: e.time_sec)
        self.total_duration = total_duration
        self.author = author
        self.bpm = bpm

def read_file_safely(filepath):
    """Reads a file with automatic charset detection (UTF-8, UTF-16 with/without BOM)."""
    with open(filepath, "rb") as f:
        raw = f.read()
    if raw.startswith(b'\xff\xfe') or raw.startswith(b'\xfe\xff'):
        return raw.decode('utf-16', errors='ignore')
    try:
        return raw.decode('utf-8')
    except Exception:
        try:
            return raw.decode('utf-16', errors='ignore')
        except Exception:
            return raw.decode('latin-1', errors='ignore')

def parse_song_file(filepath):
    """
    Parses either a .txt or .json Sky song file.
    """
    filename = os.path.basename(filepath)
    title, ext = os.path.splitext(filename)
    
    content = read_file_safely(filepath).strip()
    clean_content = content.strip('\ufeff').strip()
    
    if clean_content.startswith("{") or clean_content.startswith("["):
        return parse_json_content(clean_content, title)
    else:
        return parse_txt_content(clean_content, title)

def parse_txt_content(content, title="Untitled"):
    """
    Parses space-separated tokens with A1..C5 notes and '.' rests.
    """
    tokens = content.split()
    events = []
    current_time = 0.0
    base_step = 0.28  # default beat duration (~107 BPM sixteenths)
    
    for token in tokens:
        token = token.strip()
        if not token:
            continue
        
        if token == "." or token.startswith("."):
            # Rest beat
            dots_count = token.count(".")
            current_time += base_step * max(1, dots_count)
            continue
            
        notes = re.findall(r'[A-Ca-c][1-5]', token)
        # Normalize uppercase
        notes = [n.upper() for n in notes]
        
        if notes:
            events.append(SongEvent(current_time, notes))
            current_time += base_step
        else:
            # Unknown token or extra rest
            current_time += base_step

    # Clean display title
    lower_t = title.lower()
    if "kchip" in lower_t:
        display_title = "Nơi Này Có Anh (KChip) [Tab TXT]"
    elif "hard" in lower_t or "lilyen" in lower_t:
        display_title = "Nơi Này Có Anh (Hard) [Tab TXT]"
    elif "nntb" in lower_t:
        display_title = "Nơi Này Có Anh (nntb) [Tab TXT]"
    elif "mad" in lower_t or "lee" in lower_t:
        display_title = "Nơi Này Có Anh (Mad - Lee) [Tab TXT]"
    else:
        display_title = title.replace("_", " ")
    total_duration = current_time
    return ParsedSong(title=display_title, format_type="TXT", events=events, total_duration=total_duration, bpm=120)

# Sky Studio Decryption Keys
ENC_RAGUS = [
    0x0E, 0x18, 0x76, 0x08, 0x7C, 0x0B, 0x27, 0x77,
    0x0F, 0x16, 0x1C, 0x02, 0x1C, 0x6D, 0x67, 0x21,
    0x34, 0x0F, 0x6D, 0x2C, 0x65, 0x3C, 0x23, 0x79,
    0x11, 0x32, 0x28, 0x63, 0x17, 0x32, 0x2F, 0x2F
]
ENC_TLAS = [
    0x20, 0x2E, 0x18, 0x05, 0x31, 0x3B, 0x1C, 0x3F,
    0x0B, 0x3F, 0x75, 0x2D, 0x3B, 0x62, 0x11, 0x2B,
    0x21, 0x28, 0x05, 0x30, 0x20, 0x7B, 0x28, 0x67,
    0x0A, 0x07, 0x73, 0x32, 0x0B, 0x16, 0x72, 0x3C
]
XOR_KEY = 0x5A
RAGUS_STR = ''.join(chr(b ^ XOR_KEY) for b in ENC_RAGUS)
TLAS_STR = ''.join(chr(b ^ XOR_KEY) for b in ENC_TLAS)

def decrypt_sky_studio_notes(short_list):
    """Decrypts encrypted Sky Studio songNotes array into a list of note dicts."""
    chars = []
    ragus_len = len(RAGUS_STR)
    for i, val in enumerate(short_list):
        if not isinstance(val, int):
            continue
        key_char = RAGUS_STR[i % ragus_len]
        dec = val - ord(key_char) + 100
        if 0 <= dec < 0x110000:
            chars.append(chr(dec))
        else:
            chars.append('?')
    dec_str = ''.join(chars)
    if TLAS_STR in dec_str:
        dec_str = dec_str[:dec_str.index(TLAS_STR)]
    try:
        return json.loads(dec_str)
    except Exception:
        return []

def parse_json_content(content, default_title="Untitled"):
    """
    Parses Sky Music / Sky Studio JSON format with songNotes, columns, and bpm.
    """
    try:
        data = json.loads(content)
    except Exception:
        return ParsedSong(title=default_title, format_type="JSON", events=[], total_duration=0, author="Unknown")

    if isinstance(data, list) and len(data) > 0:
        data = data[0]
        
    title = data.get("name", default_title).replace("_", " ")
    author = data.get("author", "Unknown")
    bpm = data.get("bpm", 120)
    
    raw_notes = data.get("songNotes", [])
    # Decrypt if encrypted Sky Studio format
    if (data.get("isEncrypted", False) or (isinstance(raw_notes, list) and len(raw_notes) > 0 and isinstance(raw_notes[0], int))):
        raw_notes = decrypt_sky_studio_notes(raw_notes)
        data["isEncrypted"] = False

    grouped = {}
    max_ms = 0
    
    if raw_notes:
        for item in raw_notes:
            t_ms = item.get("time", 0)
            key_raw = str(item.get("key", ""))
            max_ms = max(max_ms, t_ms)
            
            note_name = None
            grid_match = re.match(r'^([A-Ca-c])([1-5])$', key_raw.strip())
            if grid_match:
                row_idx = ord(grid_match.group(1).upper()) - ord('A')
                col_idx = int(grid_match.group(2)) - 1
                key_idx = row_idx * 5 + col_idx
                note_name = INDEX_TO_NOTE.get(key_idx)
            else:
                m = re.search(r'Key(\d+)', key_raw, re.IGNORECASE)
                if m:
                    key_idx = int(m.group(1)) % 15
                    note_name = INDEX_TO_NOTE.get(key_idx)
                elif key_raw.isdigit():
                    key_idx = int(key_raw) % 15
                    note_name = INDEX_TO_NOTE.get(key_idx)
                    
            if note_name:
                if t_ms not in grouped:
                    grouped[t_ms] = []
                if note_name not in grouped[t_ms]:
                    grouped[t_ms].append(note_name)
    elif "columns" in data and data["columns"]:
        step_ms = 60000.0 / (bpm * 4) if bpm > 0 else 125.0
        for col_idx, col in enumerate(data["columns"]):
            t_ms = int(col_idx * step_ms)
            notes_list = col if isinstance(col, list) else col.get("notes", [])
            for k in notes_list:
                key_idx = int(k) % 15
                note_name = INDEX_TO_NOTE.get(key_idx)
                if note_name:
                    if t_ms not in grouped:
                        grouped[t_ms] = []
                    if note_name not in grouped[t_ms]:
                        grouped[t_ms].append(note_name)
                    max_ms = max(max_ms, t_ms)
                    
    events = []
    for t_ms, notes in sorted(grouped.items()):
        events.append(SongEvent(t_ms / 1000.0, notes))
        
    total_duration = max_ms / 1000.0 if max_ms > 0 else (len(events) * 0.3)
    return ParsedSong(title=title, format_type="JSON", events=events, total_duration=total_duration, author=author, bpm=bpm)


class MusicPlayerEngine:
    def __init__(self):
        self.key_preset = "sky_steam"
        self.key_map = KEY_PRESETS[self.key_preset].copy()
        self.active_song = None
        self.speed = 1.0
        self.loop = False
        self.countdown_seconds = 1
        self.mute_keyboard_send = False  # If true, won't send actual keypresses to OS
        
        # Playback states: 'idle', 'countdown', 'playing', 'paused'
        self.state = "idle"
        self.current_time = 0.0
        self.current_event_idx = 0
        
        # Thread control
        self._thread = None
        self._stop_event = threading.Event()
        self._pause_event = threading.Event()
        self._pause_event.set()  # Not paused initially
        self._seek_event = threading.Event()
        self._lock = threading.Lock()
        
        # Callbacks
        self.on_note_callback = None
        self.on_tick_callback = None
        self.on_state_callback = None
        self.on_countdown_callback = None
        self.on_natural_finish_callback = None
        self.humanize = True  # Anti-ban realistic human timing, key hold variation & chord staggering
        self.key_hold_time = 0.045 # 45ms base hold

    def set_preset(self, preset_name):
        if preset_name in KEY_PRESETS:
            self.key_preset = preset_name
            self.key_map = KEY_PRESETS[preset_name].copy()

    def set_custom_key(self, note, key_char):
        if note in SKY_NOTE_NAMES:
            self.key_map[note] = key_char

    def load_song(self, filepath):
        self.stop()
        self.active_song = parse_song_file(filepath)
        self.current_time = 0.0
        self.current_event_idx = 0
        return self.active_song

    def set_speed(self, speed):
        with self._lock:
            self.speed = max(0.1, min(5.0, float(speed)))

    def set_loop(self, loop):
        with self._lock:
            self.loop = bool(loop)

    def set_humanize(self, enabled):
        with self._lock:
            self.humanize = bool(enabled)

    def toggle_humanize(self):
        with self._lock:
            self.humanize = not self.humanize
            return self.humanize

    def set_countdown(self, seconds):
        self.countdown_seconds = max(0, int(seconds))

    def _set_state(self, new_state):
        self.state = new_state
        if self.on_state_callback:
            try:
                self.on_state_callback(new_state)
            except Exception:
                pass

    def start(self, countdown=True):
        if not self.active_song or not self.active_song.events:
            return False

        if self.state == "paused":
            self.resume()
            return True

        # Stop previous playback thread cleanly without broadcasting 'idle'
        self._stop_event.set()
        self._pause_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
            
        self._release_all_keys()
        self.current_time = 0.0
        self.current_event_idx = 0

        self._stop_event.clear()
        self._pause_event.set()
        
        self._thread = threading.Thread(target=self._run_playback, args=(countdown,), daemon=True)
        self._thread.start()
        return True

    def pause(self):
        if self.state == "playing":
            self._pause_event.clear()
            self._release_all_keys()
            self._set_state("paused")

    def resume(self):
        if self.state == "paused":
            self._pause_event.set()
            self._set_state("playing")

    def stop(self):
        self._stop_event.set()
        self._pause_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
            
        self._release_all_keys()
        self._set_state("idle")
        self.current_time = 0.0
        self.current_event_idx = 0

    def seek(self, percent):
        """
        Seek to percent (0.0 to 1.0)
        """
        if not self.active_song or self.active_song.total_duration <= 0:
            return
            
        with self._lock:
            target_time = max(0.0, min(self.active_song.total_duration, float(percent) * self.active_song.total_duration))
            self.current_time = target_time
            # Find closest event index
            idx = len(self.active_song.events)
            for i, ev in enumerate(self.active_song.events):
                if ev.time_sec >= target_time:
                    idx = i
                    break
            self.current_event_idx = idx
            self._seek_event.set()
            
        self._release_all_keys()
        
        # Dispatch instant tick so UI immediately reflects seeked position
        if self.on_tick_callback and self.active_song.total_duration > 0:
            try:
                self.on_tick_callback(target_time, self.active_song.total_duration, float(percent))
            except Exception:
                pass

    def _release_all_keys(self):
        """Emergency safe release of all possible keyboard keys."""
        if self.mute_keyboard_send:
            return
        for note, key in self.key_map.items():
            try:
                pydirectinput.keyUp(key)
            except Exception:
                pass

    def _press_notes(self, notes):
        """
        Simulate pressing a chord in Sky: CotL with realistic human physics (Anti-Ban).
        """
        if self.on_note_callback:
            try:
                self.on_note_callback(notes, self.current_time)
            except Exception:
                pass
                
        if self.mute_keyboard_send:
            return

        def _worker():
            keys = [self.key_map[n] for n in notes if n in self.key_map]
            if not keys:
                return

            if self.humanize:
                # 1. Humanized chord press: subtle finger strike stagger (3ms to 7ms)
                pressed = []
                for k in keys:
                    try:
                        pydirectinput.keyDown(k)
                        pressed.append(k)
                    except Exception:
                        pass
                    if len(keys) > 1:
                        time.sleep(random.uniform(0.003, 0.007))

                # 2. Variable human key hold (38ms to 54ms)
                hold = random.uniform(0.038, 0.054)
                time.sleep(hold)

                # 3. Humanized chord release: slight finger release stagger
                for k in pressed:
                    try:
                        pydirectinput.keyUp(k)
                    except Exception:
                        pass
                    if len(pressed) > 1:
                        time.sleep(random.uniform(0.002, 0.005))
            else:
                for k in keys:
                    try:
                        pydirectinput.keyDown(k)
                    except Exception:
                        pass
                time.sleep(self.key_hold_time)
                for k in keys:
                    try:
                        pydirectinput.keyUp(k)
                    except Exception:
                        pass

        threading.Thread(target=_worker, daemon=True).start()

    def _run_playback(self, countdown):
        # 1. Countdown phase
        if countdown and self.countdown_seconds > 0:
            self._set_state("countdown")
            for sec in range(self.countdown_seconds, 0, -1):
                if self._stop_event.is_set():
                    self._set_state("idle")
                    return
                if self.on_countdown_callback:
                    try:
                        self.on_countdown_callback(sec)
                    except Exception:
                        pass
                time.sleep(1.0)

        if self._stop_event.is_set():
            self._set_state("idle")
            return

        self._set_state("playing")

        events = self.active_song.events
        num_events = len(events)
        
        while not self._stop_event.is_set():
            idx = self.current_event_idx
            if idx >= num_events:
                if self.loop and num_events > 0:
                    with self._lock:
                        self.current_event_idx = 0
                        self.current_time = 0.0
                    continue
                else:
                    break

            # Handle pause
            self._pause_event.wait()
            if self._stop_event.is_set():
                break

            target_ev = events[idx]
            
            # Precise time advance
            delta = target_ev.time_sec - self.current_time
            if delta > 0:
                # Scaled by speed + subtle human micro-jitter (if humanize enabled and sending to game)
                sleep_dur = delta / self.speed
                if self.humanize and not self.mute_keyboard_send:
                    jitter = random.uniform(-0.003, 0.003)
                    sleep_dur = max(0.001, sleep_dur + jitter)

                # High-precision sleep
                start_p = time.perf_counter()
                while (time.perf_counter() - start_p) < sleep_dur:
                    if self._stop_event.is_set():
                        break
                    if self._seek_event.is_set():
                        self._seek_event.clear()
                        break
                    if not self._pause_event.is_set():
                        self._pause_event.wait()
                        start_p = time.perf_counter() # reset after pause
                    time.sleep(0.002)

            if self._stop_event.is_set():
                break

            self.current_time = target_ev.time_sec
            self._press_notes(target_ev.notes)

            with self._lock:
                self.current_event_idx += 1

            # Dispatch tick
            if self.on_tick_callback and self.active_song.total_duration > 0:
                pct = min(1.0, self.current_time / self.active_song.total_duration)
                try:
                    self.on_tick_callback(self.current_time, self.active_song.total_duration, pct)
                except Exception:
                    pass

        natural_finish = (not self._stop_event.is_set()) and (self.current_event_idx >= num_events)
        self._release_all_keys()
        self._set_state("idle")
        if self.on_tick_callback and self.active_song:
            self.on_tick_callback(self.active_song.total_duration, self.active_song.total_duration, 1.0)
        if natural_finish and self.on_natural_finish_callback:
            try:
                self.on_natural_finish_callback()
            except Exception as ex:
                print(f"[Engine] natural finish callback error: {ex}")

