"""
Xie's Musician - Single-Instance Floating HUD & Studio
Minimalist, Frameless, Transparent, No Taskbar Icon, Right-Shift Toggle
"""

import os
import sys
import json
import glob
import time
import base64
import tempfile
import threading
import ctypes
import re
import keyboard
import webview

# 1. Single Instance Check via Windows Named Mutex
MUTEX_NAME = "XiesMusician_SingleInstance_Mutex_2026"
kernel32 = ctypes.windll.kernel32
user32 = ctypes.windll.user32

mutex = kernel32.CreateMutexW(None, False, MUTEX_NAME)
if kernel32.GetLastError() == 183:  # ERROR_ALREADY_EXISTS
    print("[Xie's Musician] An instance is already running. Exiting.")
    sys.exit(0)

from engine import MusicPlayerEngine, parse_song_file, parse_txt_content, NOTE_TO_INDEX, decrypt_sky_studio_notes, read_file_safely
from midi_converter import convert_midi_to_sky_sheet

# Determine base paths (works both in development and PyInstaller bundle)
if getattr(sys, 'frozen', False):
    APP_DIR = os.path.dirname(sys.executable)
    BUNDLE_DIR = sys._MEIPASS
else:
    src_dir = os.path.dirname(os.path.abspath(__file__))
    parent_dir = os.path.dirname(src_dir)
    APP_DIR = parent_dir if os.path.exists(os.path.join(parent_dir, "Songs")) else src_dir
    BUNDLE_DIR = src_dir

SONGS_DIR = os.path.join(APP_DIR, "Songs")
GUI_DIR = os.path.join(BUNDLE_DIR, "gui")
PLAYLISTS_FILE = os.path.join(APP_DIR, "playlists.json")
METADATA_FILE = os.path.join(APP_DIR, "song_metadata.json")
SETTINGS_FILE = os.path.join(APP_DIR, "settings.json")

DEFAULT_SETTINGS = {
    "keybinds": {
        "toggle_hud": "right shift",
        "play_pause": "f6",
        "emergency_stop": "f8"
    }
}

os.makedirs(SONGS_DIR, exist_ok=True)

GLOBAL_WINDOW = None
IS_WINDOW_HIDDEN = False
HOTKEY_HOOKS = []


def load_settings_data():
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    kb = data.get("keybinds", {})
                    merged = dict(DEFAULT_SETTINGS["keybinds"])
                    merged.update(kb)
                    data["keybinds"] = merged
                    return data
        except Exception as e:
            print(f"Settings load error: {e}")
    return dict(DEFAULT_SETTINGS)


def save_settings_data(data):
    try:
        with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Settings save error: {e}")


def load_playlists_data():
    if os.path.exists(PLAYLISTS_FILE):
        try:
            with open(PLAYLISTS_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if isinstance(data, dict):
                    return data
        except Exception:
            pass
    return {}


def save_playlists_data(data):
    try:
        with open(PLAYLISTS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving playlists: {e}")


def load_metadata_data():
    if os.path.exists(METADATA_FILE):
        try:
            with open(METADATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}


def save_metadata_data(data):
    try:
        with open(METADATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"Error saving metadata: {e}")


def win32_delete_taskbar_tab(hwnd):
    try:
        from ctypes import wintypes, c_void_p, c_long, POINTER, cast, WINFUNCTYPE
        ole32 = ctypes.windll.ole32
        class GUID(ctypes.Structure):
            _fields_ = [
                ('Data1', wintypes.DWORD),
                ('Data2', wintypes.WORD),
                ('Data3', wintypes.WORD),
                ('Data4', wintypes.BYTE * 8)
            ]
        CLSID_TaskbarList = GUID(0x56FDF344, 0xFD6D, 0x11d0, (wintypes.BYTE * 8)(0x95, 0x8A, 0x00, 0x60, 0x97, 0xC9, 0xA0, 0x90))
        IID_ITaskbarList = GUID(0x56FDF342, 0xFD6D, 0x11d0, (wintypes.BYTE * 8)(0x95, 0x8A, 0x00, 0x60, 0x97, 0xC9, 0xA0, 0x90))
        ole32.CoInitialize(None)
        taskbar_ptr = c_void_p()
        hr = ole32.CoCreateInstance(ctypes.byref(CLSID_TaskbarList), None, 1, ctypes.byref(IID_ITaskbarList), ctypes.byref(taskbar_ptr))
        if hr == 0 and taskbar_ptr.value:
            vtable = cast(taskbar_ptr, POINTER(POINTER(c_void_p))).contents
            HrInit = WINFUNCTYPE(c_long, c_void_p)(vtable[3])
            HrInit(taskbar_ptr)
            DeleteTab = WINFUNCTYPE(c_long, c_void_p, wintypes.HWND)(vtable[5])
            DeleteTab(taskbar_ptr, hwnd)
    except Exception as e:
        print(f"DeleteTab error: {e}")


def apply_window_region(window, width, height, radius=36):
    """Natively clips the Win32 window to a rounded rectangle with GDI to permanently eliminate white corners."""
    try:
        if not window or not getattr(window, 'native', None):
            return
        hwnd = int(window.native.Handle.ToInt64())
        scale = getattr(window.native, '_scale', 1.0)
        phys_w = int(width * scale)
        phys_h = int(height * scale)
        phys_r = int(radius * scale)

        # 1. Update Form BackColor to dark navy (#0b0e18) on UI thread
        try:
            import clr
            clr.AddReference('System.Windows.Forms')
            clr.AddReference('System.Drawing')
            from System.Drawing import Color, Icon
            from System.Windows.Forms import MethodInvoker
            form = window.native
            def set_bg():
                try:
                    form.BackColor = Color.FromArgb(11, 14, 24)
                    icon_path = os.path.join(GUI_DIR, "icon.ico")
                    if not os.path.exists(icon_path):
                        icon_path = os.path.join(APP_DIR, "icon.ico")
                    if os.path.exists(icon_path):
                        form.Icon = Icon(icon_path)
                except Exception:
                    pass
            if form.InvokeRequired:
                form.Invoke(MethodInvoker(set_bg))
            else:
                set_bg()
        except Exception:
            pass

        # 2. Native GDI CreateRoundRectRgn & SetWindowRgn
        gdi32 = ctypes.windll.gdi32
        user32 = ctypes.windll.user32
        rgn = gdi32.CreateRoundRectRgn(0, 0, phys_w + 1, phys_h + 1, phys_r, phys_r)
        if rgn:
            user32.SetWindowRgn(hwnd, rgn, True)
    except Exception as e:
        print(f"apply_window_region error: {e}")


def remove_taskbar_icon(window):
    """Natively removes the window from the Windows taskbar and strips border styles without crashing WebView2."""
    if not window or not getattr(window, 'native', None):
        return
    try:
        hwnd = int(window.native.Handle.ToInt64())
        # 1. Shell COM DeleteTab
        win32_delete_taskbar_tab(hwnd)

        # 2. ToolWindow Style without AppWindow
        GWL_EXSTYLE = -20
        WS_EX_TOOLWINDOW = 0x00000080
        WS_EX_APPWINDOW = 0x00040000
        style = user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
        style = (style | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW
        user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)

        # 3. Strip OS borders
        GWL_STYLE = -16
        WS_BORDER = 0x00800000
        WS_THICKFRAME = 0x00040000
        WS_DLGFRAME = 0x00400000
        WS_CAPTION = 0x00C00000
        wstyle = user32.GetWindowLongW(hwnd, GWL_STYLE)
        wstyle = wstyle & ~WS_BORDER & ~WS_THICKFRAME & ~WS_DLGFRAME & ~WS_CAPTION
        user32.SetWindowLongW(hwnd, GWL_STYLE, wstyle)

        # 4. Suppress Windows 11 DWM border color
        try:
            dwmapi = ctypes.windll.dwmapi
            DWMWA_BORDER_COLOR = 34
            val = ctypes.c_int(0xFFFFFFFE)  # DWMWA_COLOR_NONE
            dwmapi.DwmSetWindowAttribute(hwnd, DWMWA_BORDER_COLOR, ctypes.byref(val), 4)

            # 5. Extend DWM Glass Frame into Client Area
            class MARGINS(ctypes.Structure):
                _fields_ = [
                    ('cxLeftWidth', ctypes.c_int),
                    ('cxRightWidth', ctypes.c_int),
                    ('cyTopHeight', ctypes.c_int),
                    ('cyBottomHeight', ctypes.c_int),
                ]
            margins = MARGINS(-1, -1, -1, -1)
            dwmapi.DwmExtendFrameIntoClientArea(hwnd, ctypes.byref(margins))
        except Exception:
            pass

        # 6. Apply hardware rounded window region (eliminates all outer rectangular corners)
        w = getattr(window, 'width', 380)
        h = getattr(window, 'height', 115)
        apply_window_region(window, w, h, 36 if h <= 150 else 40)

        user32.SetWindowPos(hwnd, 0, 0, 0, 0, 0, 0x0027)  # SWP_NOMOVE | SWP_NOSIZE | SWP_NOZORDER | SWP_FRAMECHANGED
        win32_delete_taskbar_tab(hwnd)
    except Exception as e:
        print(f"HWND styling note: {e}")


def extract_key_index(key_str):
    m = re.search(r'Key(\d+)', str(key_str), re.IGNORECASE)
    if m:
        return int(m.group(1)) % 15
    if str(key_str).isdigit():
        return int(key_str) % 15
    return None


def purify_sky_sheet_notes(song_notes, bpm=120, is_solo=False):
    """
    Purifies Sky sheet notes using Skyline Top-Voice + Downbeat Bass Gating:
    1. Cluster notes within <= 35ms.
    2. Rule 1: Skyline maxKey is 100% kept as lead melody.
    3. Rule 2: Middle harmony notes strictly between minKey and maxKey are removed.
    4. Rule 3: Downbeat Bass Gating keeps minKey only if:
       - maxKey - minKey >= 4
       - minKey <= 6
       - clusterTime - lastBassTime >= minBassIntervalMs
    """
    if not song_notes:
        return []

    sorted_notes = sorted(song_notes, key=lambda n: n.get("time", 0))
    clusters = []
    curr_cluster = []

    for n in sorted_notes:
        t = n.get("time", 0)
        if not curr_cluster:
            curr_cluster.append(n)
        else:
            if t - curr_cluster[0].get("time", 0) <= 35:
                curr_cluster.append(n)
            else:
                clusters.append(curr_cluster)
                curr_cluster = [n]
    if curr_cluster:
        clusters.append(curr_cluster)

    eff_bpm = bpm if bpm and bpm > 0 else 120
    if eff_bpm > 240:
        eff_bpm = eff_bpm / 4.0
    eff_bpm = max(40.0, min(240.0, float(eff_bpm)))
    min_bass_interval_ms = max(350, int(round((60000.0 / eff_bpm) * 0.95)))

    purified = []
    last_bass_time = -999999

    for cluster in clusters:
        cluster_time = cluster[0].get("time", 0)
        key_indices = []
        for n in cluster:
            k = extract_key_index(n.get("key", ""))
            if k is not None:
                key_indices.append(k)

        if not key_indices:
            continue

        unique_keys = sorted(list(set(key_indices)))
        max_key = unique_keys[-1]
        min_key = unique_keys[0]

        # Rule 1: Skyline lead melody (100% kept)
        purified.append({"time": cluster_time, "key": f"1Key{max_key}"})

        # Rule 3: Downbeat Bass Gating
        if not is_solo and len(unique_keys) >= 2 and min_key < max_key:
            cond1 = (max_key - min_key) >= 4
            cond2 = min_key <= 6
            cond3 = (cluster_time - last_bass_time) >= min_bass_interval_ms
            if cond1 and cond2 and cond3:
                purified.append({"time": cluster_time, "key": f"1Key{min_key}"})
                last_bass_time = cluster_time

    purified.sort(key=lambda n: (n["time"], int(re.search(r'\d+', n["key"]).group())))
    return purified


class AppApi:
    def __init__(self, engine):
        self._engine = engine
        self._cached_songs = []
        self._catalog_cache = None

    def get_songs(self):
        pattern_txt = os.path.join(SONGS_DIR, "*.txt")
        pattern_json = os.path.join(SONGS_DIR, "*.json")
        all_files = glob.glob(pattern_txt) + glob.glob(pattern_json)

        playlists = load_playlists_data()
        meta = load_metadata_data()
        fav_list = playlists.get("Yêu thích", [])

        songs = []
        for filepath in all_files:
            try:
                song = parse_song_file(filepath)
                fn = os.path.basename(filepath)
                song_meta = meta.get(fn, {})
                song_pls = [p for p, flist in playlists.items() if fn in flist]
                instrument = song_meta.get("instrument", "piano" if "piano" in song.title.lower() else "harp")

                songs.append({
                    "filename": fn,
                    "title": song.title,
                    "author": song.author,
                    "format": song.format_type,
                    "duration": round(song.total_duration, 1),
                    "notes_count": len(song.events),
                    "bpm": song.bpm,
                    "instrument": instrument,
                    "playlists": song_pls,
                    "is_favorite": (fn in fav_list)
                })
            except Exception as e:
                print(f"[Error parsing {filepath}]: {e}")

        # Put KChip and Hard authentic versions at top, preferring JSON
        def sort_key(s):
            is_kchip = 0 if "kchip" in s["filename"].lower() else 1
            is_hard = 0 if "hard" in s["filename"].lower() else 1
            is_json = 0 if s["format"] == "JSON" else 1
            return (is_kchip, is_hard, is_json, s["title"])
        songs.sort(key=sort_key)
        self._cached_songs = songs
        return songs

    def get_playlists(self):
        return load_playlists_data()

    def create_playlist(self, name):
        name = name.strip()
        if not name:
            return False
        data = load_playlists_data()
        if name not in data:
            data[name] = []
            save_playlists_data(data)
        return True

    def delete_playlist(self, name):
        data = load_playlists_data()
        if name in data:
            del data[name]
            save_playlists_data(data)
            return True
        return False

    def rename_playlist(self, old_name, new_name):
        new_name = new_name.strip()
        if not new_name:
            return False
        data = load_playlists_data()
        if old_name in data:
            songs = data.pop(old_name)
            data[new_name] = songs
            save_playlists_data(data)
            return True
        return False

    def add_song_to_playlist(self, playlist_name, filename):
        data = load_playlists_data()
        if playlist_name in data:
            if filename not in data[playlist_name]:
                data[playlist_name].append(filename)
                save_playlists_data(data)
                return True
        return False

    def remove_song_from_playlist(self, playlist_name, filename):
        data = load_playlists_data()
        if playlist_name in data and filename in data[playlist_name]:
            data[playlist_name].remove(filename)
            save_playlists_data(data)
            return True
        return False

    def toggle_favorite(self, filename):
        data = load_playlists_data()
        fav = data.get("Yêu thích", [])
        if filename in fav:
            fav.remove(filename)
            is_fav = False
        else:
            fav.append(filename)
            is_fav = True
        data["Yêu thích"] = fav
        save_playlists_data(data)
        return is_fav

    def update_song_instrument(self, filename, instrument):
        meta = load_metadata_data()
        if filename not in meta:
            meta[filename] = {}
        meta[filename]["instrument"] = instrument
        save_metadata_data(meta)
        return True

    def get_settings(self):
        return load_settings_data()

    def update_keybinds(self, new_binds):
        if not isinstance(new_binds, dict):
            return {"success": False, "error": "Định dạng không hợp lệ"}
        settings = load_settings_data()
        curr_binds = settings.get("keybinds", dict(DEFAULT_SETTINGS["keybinds"]))
        for k in ["toggle_hud", "play_pause", "emergency_stop"]:
            if k in new_binds and new_binds[k]:
                curr_binds[k] = str(new_binds[k]).strip().lower()
        settings["keybinds"] = curr_binds
        save_settings_data(settings)
        register_all_hotkeys(self._engine)
        return {"success": True, "keybinds": curr_binds}

    def rename_song(self, old_filename, new_title):
        """Renames a song, updates its internal JSON title, and preserves playlist and metadata associations."""
        try:
            old_fn = os.path.basename(old_filename)
            old_path = os.path.join(SONGS_DIR, old_fn)
            if not os.path.exists(old_path):
                return {"success": False, "error": "File bài hát không tồn tại"}

            new_title = (new_title or "").strip()
            if not new_title:
                return {"success": False, "error": "Tên bài hát không được để trống"}

            name_part, ext = os.path.splitext(old_fn)
            clean_slug = re.sub(r'[^\w\s-]', '', new_title).strip().replace(' ', '_')
            if not clean_slug:
                clean_slug = "Song"
            new_fn = f"{clean_slug}{ext}"
            new_path = os.path.join(SONGS_DIR, new_fn)

            # Avoid collision with different existing file
            if os.path.exists(new_path) and os.path.abspath(new_path).lower() != os.path.abspath(old_path).lower():
                counter = 1
                while os.path.exists(os.path.join(SONGS_DIR, f"{clean_slug}_{counter}{ext}")):
                    counter += 1
                new_fn = f"{clean_slug}_{counter}{ext}"
                new_path = os.path.join(SONGS_DIR, new_fn)

            # If it's a JSON file, update "name": new_title inside JSON content
            if ext.lower() == ".json":
                try:
                    content = read_file_safely(old_path)
                    data = json.loads(content)
                    if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
                        data[0]["name"] = new_title
                        with open(old_path, "w", encoding="utf-8") as f:
                            json.dump(data, f, ensure_ascii=False, indent=2)
                    elif isinstance(data, dict):
                        data["name"] = new_title
                        with open(old_path, "w", encoding="utf-8") as f:
                            json.dump(data, f, ensure_ascii=False, indent=2)
                except Exception as je:
                    print(f"Error updating JSON title internal field: {je}")

            # Rename file on disk if filename changes
            if os.path.abspath(old_path).lower() != os.path.abspath(new_path).lower():
                os.rename(old_path, new_path)
            elif old_fn != new_fn:
                # Case sensitivity rename on Windows
                temp_path = os.path.join(SONGS_DIR, f"_temp_{new_fn}")
                os.rename(old_path, temp_path)
                os.rename(temp_path, new_path)

            # Update playlists.json
            pls = load_playlists_data()
            changed_pls = False
            for k, flist in pls.items():
                if old_fn in flist:
                    idx = flist.index(old_fn)
                    flist[idx] = new_fn
                    changed_pls = True
            if changed_pls:
                save_playlists_data(pls)

            # Update song_metadata.json
            meta = load_metadata_data()
            if old_fn in meta:
                meta[new_fn] = meta.pop(old_fn)
                save_metadata_data(meta)

            return {"success": True, "old_filename": old_fn, "new_filename": new_fn, "new_title": new_title}
        except Exception as e:
            print(f"Rename song error: {e}")
            return {"success": False, "error": str(e)}

    def delete_song(self, filename):
        """Permanently deletes a song from Songs/, removes it from playlists and metadata."""
        try:
            fn = os.path.basename(filename)
            filepath = os.path.join(SONGS_DIR, fn)
            if os.path.exists(filepath):
                os.remove(filepath)

            # Clean from playlists
            pls = load_playlists_data()
            changed_pls = False
            for k in list(pls.keys()):
                if fn in pls[k]:
                    pls[k].remove(fn)
                    changed_pls = True
            if changed_pls:
                save_playlists_data(pls)

            # Clean from metadata
            meta = load_metadata_data()
            if fn in meta:
                del meta[fn]
                save_metadata_data(meta)

            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def toggle_humanize(self):
        """Toggles between humanized realistic timing (Anti-Ban) and exact sheet precision."""
        return self._engine.toggle_humanize()

    def get_humanize_status(self):
        return self._engine.humanize

    def search_online_sheets(self, query="", source="all", offset=0, limit=60):
        """Searches across community repos with pagination / infinite scroll support."""
        import urllib.request
        query = (query or "").lower().strip()
        source = (source or "all").lower().strip()
        offset = max(0, int(offset))
        limit = max(1, int(limit))

        # Cache catalog in memory for instant responses
        if self._catalog_cache is None:
            catalog_url = "https://raw.githubusercontent.com/caolevithai/TheVoid-MusicLibrary/main/library.json"
            try:
                req = urllib.request.Request(catalog_url, headers={'User-Agent': 'XiesMusicianPro/2026'})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    self._catalog_cache = json.loads(resp.read().decode('utf-8'))
            except Exception as e:
                print(f"Catalog download note: {e}")
                self._catalog_cache = []

        data = self._catalog_cache or []
        results = []

        for item in data:
            name = item.get("name", "")
            if not name.endswith(".txt") and not name.endswith(".json"):
                continue

            path = item.get("path", "")
            path_lower = path.lower()

            # Categorize by website
            if "sky-music" in path_lower or "websites" in path_lower:
                item_src = "sky-music"
                src_label = "sky-music.github.io"
            elif "skysheet" in path_lower or "/sheet" in path_lower:
                item_src = "skysheet"
                src_label = "skysheet.store"
            elif "youtube" in path_lower:
                item_src = "youtube"
                src_label = "YouTube"
            elif "discord" in path_lower or "music sheets" in path_lower:
                item_src = "community"
                src_label = "Cộng đồng Sky"
            else:
                item_src = "vithai"
                src_label = "vithai.xyz"

            # Check source filter: if user chose vithai, include all vithai / collection sheets
            if source != "all":
                if source == "vithai":
                    src_label = "vithai.xyz"
                elif source != item_src:
                    continue

            clean_title = os.path.splitext(name)[0].replace("_", " ").strip()
            if not clean_title or len(clean_title) < 2:
                continue

            if not query:
                # Return songs with reasonable length (>= 30 notes)
                if item.get("notes", 0) < 30:
                    continue
                results.append({
                    "name": clean_title,
                    "raw_name": name,
                    "url": item.get("url", ""),
                    "bpm": item.get("bpm", 120),
                    "notes_count": item.get("notes", 0),
                    "source": src_label
                })
            else:
                if query in clean_title.lower() or query in path_lower:
                    results.append({
                        "name": clean_title,
                        "raw_name": name,
                        "url": item.get("url", ""),
                        "bpm": item.get("bpm", 120),
                        "notes_count": item.get("notes", 0),
                        "source": src_label
                    })

        total = len(results)
        page_items = results[offset : offset + limit]
        return {
            "total": total,
            "offset": offset,
            "limit": limit,
            "has_more": (offset + len(page_items)) < total,
            "items": page_items
        }

    def download_online_sheet(self, url, song_name, author="Community", bpm=120):
        """Downloads a sheet from raw URL, normalizes into standard Sky JSON, and saves to Songs/."""
        import urllib.request
        import urllib.parse

        def decode_raw_sheet_bytes(b):
            if b.startswith(b'\xff\xfe') or b.startswith(b'\xfe\xff'):
                return b.decode('utf-16', errors='ignore')
            if b'\x00' in b[:100]:
                try:
                    return b.decode('utf-16-le', errors='ignore')
                except Exception:
                    pass
            try:
                return b.decode('utf-8')
            except Exception:
                try:
                    return b.decode('utf-16', errors='ignore')
                except Exception:
                    return b.decode('latin-1', errors='ignore')

        try:
            # Handle canonical URL escaping if needed
            raw_bytes = None
            urls_to_try = [url]
            if "TheVoid-MusicLibrary/main/" in url:
                prefix, rel_path = url.split("TheVoid-MusicLibrary/main/", 1)
                canonical = prefix + "TheVoid-MusicLibrary/main/" + '/'.join(urllib.parse.quote(urllib.parse.unquote(p), safe='') for p in rel_path.split('/'))
                if canonical != url:
                    urls_to_try.append(canonical)

            last_err = None
            for try_url in urls_to_try:
                try:
                    req = urllib.request.Request(try_url, headers={'User-Agent': 'XiesMusicianPro/2026'})
                    with urllib.request.urlopen(req, timeout=10) as resp:
                        raw_bytes = resp.read()
                        if raw_bytes:
                            break
                except Exception as e:
                    last_err = e

            if not raw_bytes:
                return {"success": False, "error": f"Không thể tải từ link: {last_err or '404'}"}

            content = decode_raw_sheet_bytes(raw_bytes).strip('\ufeff').strip()

            # 1. Try parse JSON format (Sky Studio or Sky Music Nightly)
            try:
                data = json.loads(content)
                if isinstance(data, list) and len(data) > 0:
                    data = data[0]

                # Case A: Standard songNotes
                if isinstance(data, dict) and "songNotes" in data and len(data.get("songNotes", [])) > 0:
                    # Automatically decrypt if Sky Studio encrypted
                    if data.get("isEncrypted", False) or isinstance(data["songNotes"][0], int):
                        data["songNotes"] = decrypt_sky_studio_notes(data["songNotes"])
                        data["isEncrypted"] = False
                    song_bpm = data.get("bpm", bpm or 120)
                    data["songNotes"] = purify_sky_sheet_notes(data["songNotes"], song_bpm)
                    data["name"] = song_name
                    if author and author != "Community":
                        data["author"] = author
                    clean_fn = re.sub(r'[^\w\s-]', '', song_name).strip().replace(' ', '_')
                    target_file = f"{clean_fn}.json"
                    target_path = os.path.join(SONGS_DIR, target_file)
                    with open(target_path, "w", encoding="utf-8") as fp:
                        json.dump([data], fp, ensure_ascii=False, indent=2)
                    return {"success": True, "filename": target_file}

                # Case B: Sky Music Nightly columns format
                if isinstance(data, dict) and "columns" in data and len(data.get("columns", [])) > 0:
                    song_notes = []
                    col_bpm = data.get("bpm", bpm or 120)
                    step_ms = int(round((60000.0 / max(1, col_bpm)) / 4.0)) # 16th note step
                    for col_idx, col in enumerate(data.get("columns", [])):
                        t_ms = col_idx * step_ms
                        if isinstance(col, list) and len(col) > 1:
                            entries = col[1]
                            if isinstance(entries, list):
                                for item in entries:
                                    if isinstance(item, list) and len(item) > 0:
                                        key_num = item[0]
                                        song_notes.append({"time": t_ms, "key": f"1Key{key_num}"})
                            elif isinstance(entries, str):
                                for bit_idx, ch in enumerate(entries):
                                    if ch == '1':
                                        song_notes.append({"time": t_ms, "key": f"1Key{bit_idx}"})
                    if song_notes:
                        song_notes = purify_sky_sheet_notes(song_notes, col_bpm)
                        clean_fn = re.sub(r'[^\w\s-]', '', song_name).strip().replace(' ', '_')
                        target_file = f"{clean_fn}.json"
                        target_path = os.path.join(SONGS_DIR, target_file)
                        json_data = [{
                            "name": song_name,
                            "author": data.get("author", author),
                            "bpm": col_bpm,
                            "bitsPerPage": 16,
                            "pitchLevel": 0,
                            "isComposed": True,
                            "songNotes": song_notes
                        }]
                        with open(target_path, "w", encoding="utf-8") as fp:
                            json.dump(json_data, fp, ensure_ascii=False, indent=2)
                        return {"success": True, "filename": target_file}
            except Exception:
                pass

            # 2. Try parse TXT notation (A1 A2 B1 . C1)
            parsed = parse_txt_content(content, song_name)
            if parsed and parsed.events:
                song_notes = []
                for ev in parsed.events:
                    t_ms = int(round(ev.time_sec * 1000))
                    for n in ev.notes:
                        if n in NOTE_TO_INDEX:
                            key_num = NOTE_TO_INDEX[n]
                            song_notes.append({"time": t_ms, "key": f"1Key{key_num}"})

                if song_notes:
                    song_notes = purify_sky_sheet_notes(song_notes, bpm)
                    clean_fn = re.sub(r'[^\w\s-]', '', song_name).strip().replace(' ', '_')
                    target_file = f"{clean_fn}.json"
                    target_path = os.path.join(SONGS_DIR, target_file)
                    json_data = [{
                        "name": song_name,
                        "author": author,
                        "bpm": bpm,
                        "bitsPerPage": 16,
                        "pitchLevel": 0,
                        "isComposed": True,
                        "songNotes": song_notes
                    }]
                    with open(target_path, "w", encoding="utf-8") as fp:
                        json.dump(json_data, fp, ensure_ascii=False, indent=2)
                    return {"success": True, "filename": target_file}

            return {"success": False, "error": "Định dạng file không hỗ trợ"}
        except Exception as e:
            print(f"Download error: {e}")
            return {"success": False, "error": str(e)}

    def find_community_sheet_match(self, query_title):
        """Searches the community catalog for an exact or high-confidence match for a YouTube video title."""
        if not query_title:
            return None

        if self._catalog_cache is None:
            import urllib.request
            catalog_url = "https://raw.githubusercontent.com/caolevithai/TheVoid-MusicLibrary/main/library.json"
            try:
                req = urllib.request.Request(catalog_url, headers={'User-Agent': 'XiesMusicianPro/2026'})
                with urllib.request.urlopen(req, timeout=5) as resp:
                    self._catalog_cache = json.loads(resp.read().decode('utf-8'))
            except Exception as e:
                print(f"Catalog download note: {e}")
                self._catalog_cache = []

        data = self._catalog_cache or []
        
        # Clean noise words from YouTube title
        clean = re.sub(r'(?i)\b(official\s*(music\s*)?video|mv|audio|lyric(s)?\s*video|full\s*hd|4k|1080p|piano|cover|tutorial|synthesia|instrumental|ost|op|ed|theme|version)\b', ' ', query_title)
        clean = re.sub(r'[^a-zA-Z0-9\u00C0-\u1EF9\s]', ' ', clean)
        words = [w.lower() for w in clean.split() if len(w) >= 3 and w.lower() not in ['kana', 'bakemonogatari']]
        
        if not words:
            words = [w.lower() for w in clean.split() if len(w) >= 3]

        if not words:
            return None

        candidates = []
        for item in data:
            name = item.get("name", "")
            if not name.endswith(".txt") and not name.endswith(".json"):
                continue
            name_lower = name.lower()
            matched_words = [w for w in words if w in name_lower]
            if len(matched_words) >= min(2, len(words)) and item.get("notes", 0) >= 50:
                score = len(matched_words) * 1000 + item.get("notes", 0)
                candidates.append((score, item))

        if candidates:
            candidates.sort(key=lambda x: x[0], reverse=True)
            best_item = candidates[0][1]
            return {
                "name": os.path.splitext(best_item.get("name", ""))[0],
                "url": best_item.get("url", ""),
                "bpm": best_item.get("bpm", 120),
                "notes_count": best_item.get("notes", 0),
                "author": "Cộng đồng Sky"
            }
        return None

    def download_youtube_audio(self, url):
        """Downloads audio stream from YouTube URL using yt-dlp with Smart Cover Hijack and returns base64 data URL."""
        import tempfile
        import base64
        try:
            url = (url or "").strip()
            if not url:
                return {"success": False, "error": "Vui lòng nhập link YouTube"}

            import yt_dlp
            temp_dir = tempfile.gettempdir()
            outtmpl = os.path.join(temp_dir, 'sky_yt_%(id)s.%(ext)s')
            ydl_opts = {
                'format': 'bestaudio[ext=m4a]/bestaudio/best',
                'outtmpl': outtmpl,
                'quiet': True,
                'no_warnings': True,
                'noplaylist': True,
            }

            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(url, download=False)
                orig_title = info.get('title', 'YouTube Song')
                duration = info.get('duration', 0)
                if duration > 600:
                    return {"success": False, "error": "Video dài hơn 10 phút. Vui lòng chọn bài ngắn hơn."}

                actual_download_info = info
                hijack_note = None

                # Smart Audio Hijack: If video is an official MV / Full Beat, check for a clean piano cover
                title_lower = orig_title.lower()
                is_mv_or_beat = any(tag in title_lower for tag in ['official mv', 'mv', 'music video', 'official video', 'audio', 'lyric', 'full audio'])
                has_piano_keyword = any(k in title_lower for k in ['piano', 'cover', 'tutorial', 'synthesia', 'instrumental', 'kalimba', 'music box'])

                if is_mv_or_beat and not has_piano_keyword:
                    try:
                        clean_query = re.sub(r'(?i)\b(official\s*(music\s*)?video|mv|audio|lyric(s)?\s*video|full\s*hd|4k|1080p)\b', '', orig_title)
                        clean_query = re.sub(r'[^\w\s-]', ' ', clean_query).strip()
                        search_opts = {'quiet': True, 'default_search': 'ytsearch5', 'noplaylist': True}
                        bad_words = ['short', 'shorts', 'lesson', 'how to', 'slow', 'reaction', 'karaoke', '1 hour', 'medley', 'teaser']
                        with yt_dlp.YoutubeDL(search_opts) as search_ydl:
                            s_res = search_ydl.extract_info(f"ytsearch5:{clean_query} piano cover", download=False)
                            if s_res and 'entries' in s_res:
                                for entry in s_res['entries']:
                                    if not entry:
                                        continue
                                    c_title = (entry.get('title') or '').lower()
                                    c_dur = entry.get('duration') or 0
                                    if any(bw in c_title for bw in bad_words):
                                        continue
                                    if duration > 0 and c_dur > 0 and abs(c_dur - duration) / duration <= 0.22:
                                        actual_download_info = entry
                                        hijack_note = entry.get('title', 'Piano Cover')
                                        break
                    except Exception as ex:
                        print(f"Smart hijack lookup skipped: {ex}")

                # Download selected audio stream
                download_url = actual_download_info.get('webpage_url') or actual_download_info.get('url') or url
                actual_info = ydl.extract_info(download_url, download=True)
                fn = ydl.prepare_filename(actual_info)
                base, _ = os.path.splitext(fn)
                actual_fn = fn
                for ext in ['.m4a', '.webm', '.opus', '.mp3', '.ogg']:
                    if os.path.exists(base + ext):
                        actual_fn = base + ext
                        break

                with open(actual_fn, 'rb') as f:
                    raw_audio = f.read()
                try:
                    os.remove(actual_fn)
                except Exception:
                    pass

                mime = "audio/mp4" if actual_fn.endswith('.m4a') else "audio/webm"
                b64_str = base64.b64encode(raw_audio).decode('ascii')
                clean_title = re.sub(r'[^\w\s-]', '', orig_title).strip().replace('_', ' ')

                # Check if a verified, authentic community sheet exists for this song
                matched_sheet_info = None
                try:
                    matched_community = self.find_community_sheet_match(orig_title)
                    if matched_community and matched_community.get("notes_count", 0) >= 50:
                        save_res = self.download_online_sheet(
                            matched_community["url"],
                            matched_community["name"],
                            matched_community.get("author", "Community"),
                            matched_community.get("bpm", 120)
                        )
                        if save_res and save_res.get("success"):
                            matched_sheet_info = {
                                "filename": save_res["filename"],
                                "title": matched_community["name"],
                                "notes_count": matched_community["notes_count"],
                                "bpm": matched_community.get("bpm", 120)
                            }
                except Exception as ex:
                    print(f"Community auto-match note: {ex}")

                return {
                    "success": True,
                    "title": clean_title or "YouTube Sheet",
                    "hijacked": bool(hijack_note),
                    "cover_title": hijack_note or "",
                    "matched_sheet": matched_sheet_info,
                    "data_url": f"data:{mime};base64,{b64_str}"
                }
        except Exception as e:
            print(f"YouTube download error: {e}")
            return {"success": False, "error": f"Lỗi tải YouTube: {str(e)}"}

    def save_converted_audio_sheet(self, title, bpm, song_notes):
        """Saves sheet generated from Audio (MP3/WAV) converter into Songs/."""
        try:
            clean_title = re.sub(r'[^\w\s-]', '', title).strip().replace(' ', '_')
            filename = f"{clean_title}_AudioConverted.json"
            filepath = os.path.join(SONGS_DIR, filename)

            purified = purify_sky_sheet_notes(song_notes, bpm)
            data = [{
                "name": title,
                "author": "Audio Export",
                "bpm": bpm,
                "bitsPerPage": 16,
                "pitchLevel": 0,
                "isComposed": True,
                "songNotes": purified
            }]
            with open(filepath, "w", encoding="utf-8") as fp:
                json.dump(data, fp, ensure_ascii=False, indent=2)

            return {"success": True, "filename": filename}
        except Exception as e:
            print(f"Save audio sheet error: {e}")
            return {"success": False, "error": str(e)}

    def select_song(self, filename):
        filepath = os.path.join(SONGS_DIR, filename)
        if os.path.exists(filepath):
            self._engine.load_song(filepath)
            self._engine._loaded_filepath = filepath
            return True
        return False

    def play_in_game(self, filename, speed=1.0):
        global GLOBAL_WINDOW, IS_WINDOW_HIDDEN
        filepath = os.path.join(SONGS_DIR, filename)
        if os.path.exists(filepath):
            self._engine.mute_keyboard_send = False
            # If already paused on this song, resume immediately
            if self._engine.state == "paused" and getattr(self._engine, '_loaded_filepath', None) == filepath:
                self._engine.resume()
                if GLOBAL_WINDOW:
                    GLOBAL_WINDOW.hide()
                    IS_WINDOW_HIDDEN = True
                return True

            # Only reload if not already loaded or file changed
            if not self._engine.active_song or getattr(self._engine, '_loaded_filepath', None) != filepath:
                self._engine.load_song(filepath)
                self._engine._loaded_filepath = filepath
            else:
                self._engine.current_time = 0.0
                self._engine.current_event_idx = 0
                
            self._engine.set_speed(speed)
            
            # Immediately hide window as requested
            if GLOBAL_WINDOW:
                GLOBAL_WINDOW.hide()
                IS_WINDOW_HIDDEN = True
                
            self._engine.start(countdown=True)
            return True
        return False

    def play_preview_in_app(self, filename, speed=1.0):
        filepath = os.path.join(SONGS_DIR, filename)
        if os.path.exists(filepath):
            # Mute keyboard send so it only plays via App Synthesizer
            self._engine.mute_keyboard_send = True
            # If already paused on this song, resume immediately
            if self._engine.state == "paused" and getattr(self._engine, '_loaded_filepath', None) == filepath:
                self._engine.resume()
                return True

            # Only reload if not already loaded or file changed
            if not self._engine.active_song or getattr(self._engine, '_loaded_filepath', None) != filepath:
                self._engine.load_song(filepath)
                self._engine._loaded_filepath = filepath
            else:
                self._engine.current_time = 0.0
                self._engine.current_event_idx = 0
                
            self._engine.set_speed(speed)
            self._engine.start(countdown=False)
            return True
        return False

    def stop(self):
        self._engine.stop()
        return True

    def pause(self):
        self._engine.pause()
        return True

    def resume(self):
        self._engine.resume()
        return True

    def seek(self, percent):
        self._engine.seek(percent)
        return True

    def set_speed(self, speed):
        self._engine.set_speed(speed)
        return True

    def save_preset(self, preset):
        self._engine.set_preset(preset)
        return True

    def open_songs_folder(self):
        try:
            os.startfile(SONGS_DIR)
            return True
        except Exception as e:
            print(f"Error opening folder: {e}")
            return False

    def import_text_file(self, filename, content):
        try:
            target = os.path.join(SONGS_DIR, filename)
            with open(target, "w", encoding="utf-8") as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Import error: {e}")
            return False

    def import_midi_base64(self, filename, b64_str):
        try:
            raw_bytes = base64.b64decode(b64_str)
            title = os.path.splitext(filename)[0]
            with tempfile.NamedTemporaryFile(suffix=".mid", delete=False) as tmp:
                tmp.write(raw_bytes)
                tmp_path = tmp.name

            out_path, note_count = convert_midi_to_sky_sheet(tmp_path, SONGS_DIR, title)
            os.remove(tmp_path)
            return True
        except Exception as e:
            print(f"MIDI conversion error: {e}")
            return False

    def set_window_size(self, width, height):
        global GLOBAL_WINDOW
        if GLOBAL_WINDOW:
            try:
                GLOBAL_WINDOW.resize(width, height)
                radius = 36 if height <= 150 else 40
                apply_window_region(GLOBAL_WINDOW, width, height, radius)
                return True
            except Exception as e:
                print(f"Resize error: {e}")
        return False

    def exit_app(self):
        global GLOBAL_WINDOW
        self._engine.stop()
        try:
            keyboard.unhook_all()
        except Exception:
            pass
        if GLOBAL_WINDOW:
            try:
                GLOBAL_WINDOW.destroy()
            except Exception:
                pass
        os._exit(0)


def toggle_window_visibility():
    global GLOBAL_WINDOW, IS_WINDOW_HIDDEN
    if not GLOBAL_WINDOW:
        return
    if IS_WINDOW_HIDDEN:
        GLOBAL_WINDOW.show()
        IS_WINDOW_HIDDEN = False
        threading.Thread(target=remove_taskbar_icon, args=(GLOBAL_WINDOW,), daemon=True).start()
    else:
        GLOBAL_WINDOW.hide()
        IS_WINDOW_HIDDEN = True


def register_all_hotkeys(engine):
    global HOTKEY_HOOKS
    for h in HOTKEY_HOOKS:
        try:
            keyboard.remove_hotkey(h)
        except Exception:
            pass
    HOTKEY_HOOKS.clear()

    settings = load_settings_data()
    keybinds = settings.get("keybinds", DEFAULT_SETTINGS["keybinds"])

    toggle_hud_key = str(keybinds.get("toggle_hud", "right shift")).strip().lower()
    play_pause_key = str(keybinds.get("play_pause", "f6")).strip().lower()
    emergency_stop_key = str(keybinds.get("emergency_stop", "f8")).strip().lower()

    def toggle_playback_hotkey():
        global GLOBAL_WINDOW, IS_WINDOW_HIDDEN
        if engine.state == 'playing':
            engine.pause()
        elif engine.state == 'paused':
            engine.resume()
        elif engine.state == 'idle' and engine.active_song:
            engine.mute_keyboard_send = False
            if GLOBAL_WINDOW:
                GLOBAL_WINDOW.hide()
                IS_WINDOW_HIDDEN = True
            engine.start(countdown=True)

    # 1. Toggle HUD
    try:
        if toggle_hud_key:
            h1 = keyboard.add_hotkey(toggle_hud_key, toggle_window_visibility)
            HOTKEY_HOOKS.append(h1)
    except Exception as e:
        print(f"[Warning] Failed to bind toggle_hud '{toggle_hud_key}': {e}")
        try:
            h1 = keyboard.add_hotkey('right shift', toggle_window_visibility)
            HOTKEY_HOOKS.append(h1)
        except Exception:
            pass

    # 2. Play / Pause
    try:
        if play_pause_key:
            h2 = keyboard.add_hotkey(play_pause_key, toggle_playback_hotkey)
            HOTKEY_HOOKS.append(h2)
    except Exception as e:
        print(f"[Warning] Failed to bind play_pause '{play_pause_key}': {e}")
        try:
            h2 = keyboard.add_hotkey('f6', toggle_playback_hotkey)
            HOTKEY_HOOKS.append(h2)
        except Exception:
            pass

    # 3. Emergency Safe Stop
    try:
        if emergency_stop_key:
            h3 = keyboard.add_hotkey(emergency_stop_key, lambda: engine.stop())
            HOTKEY_HOOKS.append(h3)
    except Exception as e:
        print(f"[Warning] Failed to bind emergency_stop '{emergency_stop_key}': {e}")
        try:
            h3 = keyboard.add_hotkey('f8', lambda: engine.stop())
            HOTKEY_HOOKS.append(h3)
        except Exception:
            pass

    print(f"[Xie's Musician] Hotkeys active: HUD='{toggle_hud_key}', Play/Pause='{play_pause_key}', Stop='{emergency_stop_key}'")


def main():
    global GLOBAL_WINDOW
    engine = MusicPlayerEngine()
    api = AppApi(engine)

    def on_note(notes, time_sec):
        global GLOBAL_WINDOW
        if GLOBAL_WINDOW:
            try:
                js = f"if (window.onNotePlayed) window.onNotePlayed({json.dumps(notes)}, {time_sec:.3f});"
                GLOBAL_WINDOW.evaluate_js(js)
            except Exception:
                pass

    def on_tick(curr, total, pct):
        global GLOBAL_WINDOW
        if GLOBAL_WINDOW:
            try:
                js = f"if (window.onProgressTick) window.onProgressTick({curr:.2f}, {total:.2f}, {pct:.4f});"
                GLOBAL_WINDOW.evaluate_js(js)
            except Exception:
                pass

    def on_state(state):
        global GLOBAL_WINDOW
        if GLOBAL_WINDOW:
            try:
                js = f"if (window.onEngineState) window.onEngineState('{state}');"
                GLOBAL_WINDOW.evaluate_js(js)
            except Exception:
                pass

    def on_natural_finish():
        global GLOBAL_WINDOW
        if GLOBAL_WINDOW:
            try:
                js = "if (window.onSongNaturallyFinished) window.onSongNaturallyFinished();"
                GLOBAL_WINDOW.evaluate_js(js)
            except Exception:
                pass

    engine.on_note_callback = on_note
    engine.on_tick_callback = on_tick
    engine.on_state_callback = on_state
    engine.on_natural_finish_callback = on_natural_finish

    # Register Dynamic Global Hotkeys from settings.json
    register_all_hotkeys(engine)

    # Launch PyWebView Window (Frameless, Transparent, Always-on-top, Initial Size 380x115)
    index_html = os.path.join(GUI_DIR, "index.html")
    GLOBAL_WINDOW = webview.create_window(
        title="Xie's Musician",
        url=index_html,
        js_api=api,
        width=380,
        height=115,
        frameless=True,
        easy_drag=False,
        on_top=True,
        transparent=True,
        text_select=False,
        background_color='#0b0e18'
    )

    def on_window_loaded():
        # Apply styling safely after WebView2 is fully initialized
        remove_taskbar_icon(GLOBAL_WINDOW)

    GLOBAL_WINDOW.events.loaded += on_window_loaded
    GLOBAL_WINDOW.events.shown += lambda: threading.Thread(target=lambda: (time.sleep(0.3), remove_taskbar_icon(GLOBAL_WINDOW)), daemon=True).start()

    webview.start(debug=False)


if __name__ == '__main__':
    main()
