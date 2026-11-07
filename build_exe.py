"""
Xie's Musician - Automated PyInstaller Build Script
"""
import os
import sys
import shutil
import subprocess

root_dir = os.path.dirname(os.path.abspath(__file__))
os.chdir(root_dir)

print("[1/4] Preparing icon and static assets...")
gui_dir = os.path.join(root_dir, "_source", "gui")
if os.path.exists("icon.ico"):
    shutil.copy2("icon.ico", os.path.join(gui_dir, "icon.ico"))
if os.path.exists("icon.png"):
    shutil.copy2("icon.png", os.path.join(gui_dir, "icon.png"))

print("[2/4] Constructing PyInstaller arguments...")
pyinstaller_args = [
    sys.executable, "-m", "PyInstaller",
    "--name=XiesMusician",
    "--onefile",
    "--noconsole",
    "--clean",
    "--icon=icon.ico",
    "--paths=_source",
    f"--add-data={os.path.join('_source', 'gui')};gui",
    "--collect-all=webview",
    "--hidden-import=clr",
    "--hidden-import=pydirectinput",
    "--hidden-import=keyboard",
    "--hidden-import=yt_dlp",
    "--hidden-import=mido",
    "--hidden-import=engine",
    "--hidden-import=midi_converter",
    "--hidden-import=main",
    "XiesMusician.py"
]

print("[3/4] Running PyInstaller build...")
print("Command:", " ".join(pyinstaller_args))
res = subprocess.run(pyinstaller_args)

if res.returncode != 0:
    print(f"\n[ERROR] PyInstaller failed with exit code {res.returncode}")
    sys.exit(res.returncode)

built_exe = os.path.join(root_dir, "dist", "XiesMusician.exe")
target_exe = os.path.join(root_dir, "XiesMusician.exe")

if os.path.exists(built_exe):
    print(f"[4/4] Copying built executable to {target_exe}...")
    try:
        if os.path.exists(target_exe):
            os.remove(target_exe)
        shutil.copy2(built_exe, target_exe)
        size_mb = os.path.getsize(target_exe) / (1024 * 1024)
        print(f"\n[SUCCESS] Xie's Musician EXE built successfully: {target_exe} ({size_mb:.2f} MB)")
    except Exception as e:
        print(f"\n[Warning] Could not overwrite directly (file may be in use): {e}")
        print(f"Built EXE is located at: {built_exe}")
else:
    print(f"\n[ERROR] Expected built file not found at {built_exe}")
    sys.exit(1)

