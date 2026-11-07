"""
Xie's Musician - High Accuracy MIDI to Sky Sheet Converter
Transposes, quantizes, and maps any standard MIDI file (.mid) to 15-key Sky format JSON.
"""

import os
import json
import mido

NOTE_PITCH_MAP = {
    60: "A1", 62: "A2", 64: "A3", 65: "A4", 67: "A5",
    69: "B1", 71: "B2", 72: "B3", 74: "B4", 76: "B5",
    77: "C1", 79: "C2", 81: "C3", 83: "C4", 84: "C5"
}

SKY_KEYS = [
    (60, "1Key0"), (62, "1Key1"), (64, "1Key2"), (65, "1Key3"), (67, "1Key4"),
    (69, "1Key5"), (71, "1Key6"), (72, "1Key7"), (74, "1Key8"), (76, "1Key9"),
    (77, "1Key10"), (79, "1Key11"), (81, "1Key12"), (83, "1Key13"), (84, "1Key14")
]

DIATONIC_SCALE = [0, 2, 4, 5, 7, 9, 11]
DIATONIC_WEIGHTS = {0: 3.0, 2: 2.0, 4: 2.5, 5: 2.0, 7: 3.0, 9: 2.0, 11: 1.5}

def find_best_key_shift(midi_notes):
    """
    Finds the optimal transpose shift (-6 to +6 semitones)
    that aligns the maximum notes to C Major diatonic scale.
    """
    best_shift = 0
    max_score = -999999.0
    for shift in range(-6, 7):
        score = 0.0
        for pitch in midi_notes:
            pc = (pitch + shift) % 12
            if pc in DIATONIC_WEIGHTS:
                score += DIATONIC_WEIGHTS[pc]
            else:
                score -= 2.0
        if score > max_score:
            max_score = score
            best_shift = shift
    return best_shift

def map_pitch_to_sky_key(pitch, shift=0):
    """Maps a MIDI pitch to closest Sky CotL key (1Key0..1Key14)."""
    p = pitch + shift
    while p < 60:
        p += 12
    while p > 84:
        p -= 12

    best_key = "1Key0"
    best_dist = 999
    for target_midi, key_name in SKY_KEYS:
        dist = abs(target_midi - p)
        if dist < best_dist:
            best_dist = dist
            best_key = key_name
    return best_key

def convert_midi_to_sky_sheet(midi_path, output_dir=None, song_title=None):
    """
    Parses a MIDI file, properly computes absolute timing across all tracks,
    transposes cleanly to C Major, and saves as standard Sky CotL JSON sheet.
    """
    if not output_dir:
        output_dir = os.path.dirname(midi_path)
    if not song_title:
        base = os.path.basename(midi_path)
        song_title = os.path.splitext(base)[0]

    mid = mido.MidiFile(midi_path)

    # Use mido's merged track iteration for exact absolute timing
    tempo = 500000
    ticks_per_beat = mid.ticks_per_beat
    events = []

    # Merge tracks to handle parallel polyphonic tracks
    merged_track = mido.merge_tracks(mid.tracks)
    abs_time_sec = 0.0

    for msg in merged_track:
        if msg.time > 0:
            abs_time_sec += mido.tick2second(msg.time, ticks_per_beat, tempo)
        if msg.type == 'set_tempo':
            tempo = msg.tempo
        elif msg.type == 'note_on' and msg.velocity > 0:
            events.append((abs_time_sec, msg.note))

    if not events:
        raise ValueError("Không tìm thấy nốt nhạc nào trong file MIDI này.")

    events.sort(key=lambda x: x[0])

    # Extract all pitches and find optimal key shift
    all_pitches = [p for _, p in events]
    best_shift = find_best_key_shift(all_pitches)

    # Group notes with a 50ms chord window
    song_notes = []
    recent_keys = {}  # key -> last_time_ms to avoid spamming same key

    for t_sec, pitch in events:
        t_ms = int(round(t_sec * 1000))
        sky_key = map_pitch_to_sky_key(pitch, best_shift)

        last_t = recent_keys.get(sky_key, -999)
        if t_ms - last_t >= 60:
            song_notes.append({
                "time": t_ms,
                "key": sky_key
            })
            recent_keys[sky_key] = t_ms

    song_notes.sort(key=lambda x: x["time"])

    # Calculate BPM
    est_bpm = int(round(mido.tempo2bpm(tempo))) if tempo > 0 else 120
    est_bpm = max(60, min(240, est_bpm))

    # Save as standard Sky CotL JSON sheet
    json_data = [{
        "name": song_title,
        "author": "MIDI Export",
        "bpm": est_bpm,
        "bitsPerPage": 16,
        "pitchLevel": 0,
        "isComposed": True,
        "songNotes": song_notes
    }]

    out_json_path = os.path.join(output_dir, f"{song_title}.json")
    with open(out_json_path, "w", encoding="utf-8") as f:
        json.dump(json_data, f, ensure_ascii=False, indent=2)

    return out_json_path, len(song_notes)
