# Bramma voice enrollment animation

A static, interactive demo based on the Bramma voice identification screen.

## Preview

Open `index.html` for the simulated voice demo. For microphone input, serve the folder with `python -m http.server 8000` and open http://localhost:8000.

The thin, centered gradient expands with speech to a maximum of 75% of the visible curve. Movement is a subtle, smoothed drift. The paragraph highlights one word at a time. The Developer notes button provides motion timings and clickable source files.

## Deploy on Vercel

Import this repository. Choose **Other** as the framework preset, leave the root directory at the repository root, disable the build command, and use `.` as the output directory. No package installation is needed. Deploy the complete repository so the `assets` folder is included.

## Files

- `index.html`: app screen and developer notes.
- `style.css`: original fonts, layout, gradient mask and transitions.
- `app.js`: voice analysis, word highlighting, motion smoothing and states.
- `notes.js`: developer notes dialog.
- `assets/`: local fonts and original Figma SVGs.
- `MOTION.md`: full implementation handoff.
- `verify.cjs`: local runtime verification (`node verify.cjs`).
- `package-demo.py`: optional portable HTML/ZIP packaging (`python package-demo.py`).

Voice recognition/profile creation is simulated. Microphone mode uses browser speech recognition where available, which may use the browser provider's online service.
