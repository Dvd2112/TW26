#!/usr/bin/env python3
"""Correct broken icons, em-dashes and image imports in React source files."""
import os, sys

base = '/home/david/workspace/TW26/frontend/src'
FFD = '\ufffd'  # replacement char that appears in broken emoji sequences

# ─────────────────────────────────────────────────────────────────────────────
# Inspect mode: show repr of lines in a file
# ─────────────────────────────────────────────────────────────────────────────
def inspect_hex(rel, keywords=None):
    path = os.path.join(base, rel)
    with open(path, 'rb') as f:
        raw = f.read()
    text = raw.decode('utf-8', errors='replace')
    for i, line in enumerate(text.splitlines(), 1):
        if keywords is None or any(k in line for k in keywords):
            chars = ' '.join(f'{ord(c):04x}' for c in line.strip())
            print(f'L{i}: {line.strip()}')
            # only show hex for short lines
            if len(line.strip()) < 60:
                print(f'     HEX: {chars}')

inspect_hex('views/Highlights/Highlights.jsx',
            keywords=['icon', '04', 'Inovação', 'Inova'])

