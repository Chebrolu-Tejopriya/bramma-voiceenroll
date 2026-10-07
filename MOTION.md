# Bramma voice identification — motion handoff

Open index.html to preview. Share the ZIP with your developer; unzip it before opening. Demo voice works offline. For live microphone input, serve the folder on localhost or HTTPS (for example `python -m http.server 8000`) and open http://localhost:8000.

For deployment, use the refreshed Bramma-voice-demo.zip or the netlify-public folder. Its index.html embeds the original fonts, SVGs, styles and scripts so missing asset folders cannot break the visual layout. The source app.js, style.css and assets are also included for the clickable Developer notes links. Run `python package-demo.py` after editing the source files to refresh this portable deployment.

The UI is based on Figma node 173:65459, with the same white 390 × 846 layout, paragraph box, yellow highlight, curved footer, timer and recording button. Original exported SVGs and local Outfit / Google Sans Flex fonts are in assets/. The static reference is reference.png. Preview controls are outside the app screen.

## Motion behavior

- Ready: almost still, with a 0.35 px breath over 7.2 seconds.
- Listening: normalize microphone RMS to 0–1, subtract a small noise floor, clamp peaks. Smooth with a 120 ms attack and 380 ms release using `1 - exp(-dt/tau)` for frame-rate independence. Gradient length has a further 240 ms expansion and 420 ms contraction filter to soften rapid changes.
- Move the original curved layers together with at most 1.8 px of speech drift plus the 0.35 px breath. Movement follows sustained speech activity rather than each syllable, with a 550 ms non-overshooting smoothing filter. Use translation instead of scaling to preserve the original thin line thickness. The contour and gradient edge stay aligned; the timer and recording control remain stationary. The breath uses an independent continuous phase so stopping the recording does not restart the movement.
- Quiet: a short, thin yellow gradient stays at the center. Speaking: it extends across at most the middle 75% of the visible curve, keeping exactly the same thickness. This leaves 12.5% clear at each side even during strong or sustained speech. Voice energy and frequent/sustained speech activity determine its length. Speech activity is an audio-density cue, not measured words per minute; pauses smoothly contract the gradient.
- The mask has a visible central region and 6% fading tails. Its half-width grows from 8% to a responsive cap: visible screen width × 0.75 / (2 × 441) × 100%. At 390 px this is 33.16%, giving a total span of 292.5 px. assets/edge-long.svg preserves the original edge geometry and stroke width, replacing its vertical color fade with a uniform gold source; the CSS mask supplies the animated horizontal gradient. There is no stroke dilation, extra blur, dynamic glow, or duplicate stroke. The original faint glow stays at 8% opacity in both states.
- Silence: decay to the idle breath instead of stopping suddenly. No random jitter or constant high-energy pulsing.
- Stop: softly settle to the same slow breath during 2.4 seconds of processing, then reveal completion over 500–650 ms.
- Reduced motion: keep the surface stationary; preserve state labels and timer.

## Demo boundaries

The demo starts automatically and reads through the supplied text at a natural word pace, capped at 80 seconds, followed by 2.4 seconds of simulated processing. The initial 01:20 timer mirrors the supplied screen and counts down during listening. Exactly one word is highlighted using #f8ef8d at 40% opacity. Highlight movement has no fade so neighboring words do not appear active together. The paragraph scrolls internally to keep the active word visible. Pause freezes both motion and reading position; Replay starts at the first word.

Demo highlighting is scripted. My microphone uses local amplitude for the curve and browser SpeechRecognition (when supported) for live word tracking. Recognition matches normalized words within the next 12 script words and consumes interim transcript revisions from the start of each phrase. Browser recognition may send audio to the browser provider's online speech service; the demo indicates this on the microphone control and in its status text. This app saves no audio. If speech recognition is unavailable or denied, the curve can still react to the microphone; word tracking is not faked. Live input stops after 80 seconds, when manually stopped, or when the tab is hidden. Voice profile creation and completion are simulated. In production, completion must follow the actual backend result, with separate retry and error states.

## Files

index.html: UI. style.css: layout and transitions. app.js: state machine, demo envelope, RMS analysis and smoothing. assets/: original Figma exports.
