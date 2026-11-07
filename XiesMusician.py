"""
Xie's Musician - Python Launch Entry Point
For Sky: Children of the Light (PC)
"""

import os
import sys

# Ensure _source directory is on sys.path
root_dir = os.path.dirname(os.path.abspath(__file__))
src_dir = os.path.join(root_dir, "_source")
if src_dir not in sys.path:
    sys.path.insert(0, src_dir)

from main import main

if __name__ == "__main__":
    main()

