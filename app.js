const $ = id => document.getElementById(id);
const phone = document.querySelector('.phone'), curves = [...document.querySelectorAll('.curve')];
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let state = 'idle', mode = 'demo', paused = false, elapsed = 0, last = 0, energy = 0;
let stream = null, context = null, analyser = null, data = null, session = 0;
let recognition = null, wordIndex = -1, readingTime = 0;
let speechActivity = 0, gradientSpread = 0;
let motionTime = 0, curveLift = 0;
const recordingSurface = document.querySelector('.recording-surface');
const words = [], wordTimes = [];
const normalize = text => text.toLowerCase().replace(/[^a-z0-9]/g, '');
document.querySelectorAll('#script p').forEach(p => {
  const text = p.textContent; p.textContent = '';
  text.trim().split(/\s+/).forEach(word => {
    const span = document.createElement('span'); span.textContent = word;
    p.append(span, document.createTextNode(' ')); words.push(span); wordTimes.push(readingTime);
    readingTime += .25 + Math.min(word.length, 12) * .022 + (/[.!?]$/.test(word) ? .5 : /[,;:]$/.test(word) ? .2 : 0);
  });
});
function highlight(index, scroll = true) {
  if (index === wordIndex) return;
  if (wordIndex >= 0) words[wordIndex]?.classList.remove('reading');
  wordIndex = Math.max(-1, Math.min(index, words.length - 1));
  const word = words[wordIndex]; if (!word) return;
  word.classList.add('reading');
  if (scroll) {
    const panel = $('script'), y = word.offsetTop;
    if (y > panel.scrollTop + panel.clientHeight - 64 || y < panel.scrollTop + 8)
      panel.scrollTo({ top: Math.max(0, y - panel.clientHeight * .45), behavior: reduced.matches ? 'instant' : 'smooth' });
  }
}
function setState(next) {
  state = next; phone.classList.toggle('complete', next === 'complete');
  document.querySelectorAll('[data-state]').forEach(e => e.classList.toggle('active', e.dataset.state === next));
  $('recordText').textContent = next === 'idle' ? 'Start Recording' : next === 'processing' ? 'Processing...' : 'Stop Recording';
  $('record').disabled = next === 'processing'; $('caption').textContent = next.toUpperCase();
}
function releaseMic() {
  session++;
  if (recognition) { recognition.onend = null; recognition.abort(); recognition = null; }
  if (stream) stream.getTracks().forEach(t => t.stop()); stream = analyser = null;
  if (context) context.close().catch(() => {}); context = null;
}
function reset(start = true) {
  releaseMic(); elapsed = 0; paused = false; energy = 0; last = 0;
  speechActivity = 0; gradientSpread = 0;
  motionTime = 0; curveLift = 0;
  $('pause').textContent = 'Pause'; $('timer').textContent = '01:20';
  highlight(-1); $('script').scrollTop = 0; setState(start ? 'listening' : 'idle'); if (start) highlight(0);
}
function chooseDemo() {
  mode = 'demo'; $('demo').classList.add('selected'); $('mic').classList.remove('selected');
  $('inputNote').textContent = 'Demo reading: the yellow highlight follows one word at a time.'; reset();
}
function followTranscript(text, cursor) {
  for (const token of text.trim().split(/\s+/).map(normalize).filter(Boolean)) {
    const limit = Math.min(words.length, cursor + 12);
    for (let i = cursor; i < limit; i++) {
      if (normalize(words[i].textContent) === token) { highlight(i); cursor = i + 1; break; }
    }
  }
}
function startRecognition(request) {
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) { $('inputNote').textContent = 'Live curve enabled. Word tracking needs a browser with speech recognition (such as Chrome).'; return; }
  recognition = new Speech(); recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = true;
  let segmentStart = 0, seenResult = -1;
  recognition.onresult = event => {
    if (paused || state !== 'listening') return;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (i !== seenResult) { segmentStart = Math.max(0, wordIndex + 1); seenResult = i; }
      followTranscript(event.results[i][0].transcript, segmentStart);
    }
  };
  recognition.onstart = () => { seenResult = -1; };
  recognition.onerror = event => {
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      recognition.onend = null;
      $('inputNote').textContent = 'Live curve enabled; speech tracking is unavailable. Replay uses demo word tracking.';
    }
  };
  recognition.onend = () => {
    if (request === session && state === 'listening' && !paused) { seenResult = -1; try { recognition.start(); } catch {} }
  };
  try { recognition.start(); } catch {}
}
async function startMic() {
  reset(false); mode = 'mic'; $('mic').classList.add('selected'); $('demo').classList.remove('selected');
  $('inputNote').textContent = 'Waiting for microphone permission...'; const request = ++session;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw Error('Microphone needs localhost or HTTPS');
    const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (request !== session) { acquired.getTracks().forEach(t => t.stop()); return; }
    stream = acquired; context = new AudioContext(); await context.resume(); if (request !== session) return;
    analyser = context.createAnalyser(); analyser.fftSize = 1024;
    context.createMediaStreamSource(stream).connect(analyser); data = new Uint8Array(analyser.fftSize);
    setState('listening'); $('inputNote').textContent = 'Read aloud. Browser speech recognition may use its online service.'; startRecognition(request);
  } catch {
    if (request !== session) return; releaseMic(); mode = 'demo'; $('demo').classList.add('selected'); $('mic').classList.remove('selected');
    $('inputNote').textContent = 'Microphone unavailable. Press Replay to preview the word highlight.'; setState('idle');
  }
}
function finish() { releaseMic(); setState('processing'); elapsed = 0; }
$('demo').onclick = chooseDemo; $('mic').onclick = startMic;
$('replay').onclick = () => mode === 'mic' ? startMic() : chooseDemo();
$('again').onclick = chooseDemo; document.querySelector('.back').onclick = chooseDemo;
$('record').onclick = () => state === 'idle' ? (mode === 'mic' ? startMic() : chooseDemo()) : state === 'listening' ? finish() : null;
$('pause').onclick = () => {
  paused = !paused; $('pause').textContent = paused ? 'Resume' : 'Pause';
  if (context) { if (paused) context.suspend(); else context.resume(); }
  if (recognition) { if (paused) recognition.abort(); else { try { recognition.start(); } catch {} } }
};
function speech(t) {
  const segment = t % 5.8; if (segment > 3.65) return 0;
  return Math.sin(Math.min(1, segment / .28) * Math.PI / 2) * Math.min(1, (3.65 - segment) / .4) *
    (.16 + .45 * Math.sin(t * 8.1) ** 2 + .2 * Math.sin(t * 13.7 + .4) ** 2);
}
function tick(now) {
  const dt = Math.min(.05, last ? (now - last) / 1000 : 0); last = now;
  if (!paused) {
    elapsed += dt; let target = 0;
    if (state === 'listening') {
      if (mode === 'mic' && analyser) {
        analyser.getByteTimeDomainData(data); let sum = 0; for (const v of data) sum += ((v - 128) / 128) ** 2;
        target = Math.min(1, Math.max(0, Math.sqrt(sum / data.length) - .008) * 9);
      } else target = speech(elapsed);
      const remaining = Math.max(0, 80 - Math.floor(elapsed));
      $('timer').textContent = String(Math.floor(remaining / 60)).padStart(2, '0') + ':' + String(remaining % 60).padStart(2, '0');
      if (mode === 'demo') { let index = 0; while (index + 1 < wordTimes.length && wordTimes[index + 1] <= elapsed) index++; highlight(index); }
      if (elapsed >= (mode === 'demo' ? Math.min(80, readingTime) : 80)) finish();
    } else if (state === 'processing' && elapsed > 2.4) { setState('complete'); releaseMic(); }
    energy += (target - energy) * (1 - Math.exp(-dt / (target > energy ? .12 : .38)));
    // Frequent/sustained voice activity fills the curve even at moderate volume.
    // This is a speech-density cue, not a measured words-per-minute value.
    const speaking = state === 'listening' && target > .06 ? 1 : 0;
    speechActivity += (speaking - speechActivity) * (1 - Math.exp(-dt / (speaking ? .55 : .32)));
    const wantedSpread = state === 'listening' && !reduced.matches ? Math.min(1, energy * 1.6 + speechActivity * .65) : 0;
    gradientSpread += (wantedSpread - gradientSpread) * (1 - Math.exp(-dt / (wantedSpread > gradientSpread ? .24 : .42)));
    // Keep the contour, its line, and its halo aligned as the accent expands.
    const reaction = state === 'listening' && !reduced.matches ? energy : 0;
    // Independent, continuous phase prevents a jump when recording stops.
    // A slow, non-overshooting drift responds to phrases instead of syllables.
    motionTime += dt;
    const desiredLift = state === 'complete' ? 0 : .35 * Math.sin(motionTime * 2 * Math.PI / 7.2) +
      (state === 'listening' ? speechActivity * 1.8 : 0);
    curveLift += (desiredLift - curveLift) * (1 - Math.exp(-dt / .55));
    const lift = reduced.matches ? 0 : curveLift;
    // Translate rather than stretch, so the thin gradient keeps its thickness.
    curves.forEach(curve => { curve.style.transform = `translateY(${-lift}px)`; });
    recordingSurface.style.setProperty('--voice-energy', reaction.toFixed(3));
    // Quiet: a small, hairline accent at the center. Speaking: the same
    // accent extends sideways with exactly the same stroke thickness.
    recordingSurface.style.setProperty('--voice-center', '50%');
    const spread = reduced.matches ? 0 : gradientSpread;
    // Assets are 441 px wide and overflow the screen. Cap the colored span
    // against the visible screen width, so 75% stays accurate on mobile too.
    const maxHalfWidth = (phone.clientWidth || 390) * .75 / (2 * 441) * 100;
    const halfWidth = 8 + spread * (maxHalfWidth - 8);
    recordingSurface.style.setProperty('--voice-width', `${halfWidth.toFixed(2)}%`);
    recordingSurface.style.setProperty('--voice-core', `${Math.max(2, halfWidth - 6).toFixed(2)}%`);
  }
  requestAnimationFrame(tick);
}
document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden && stream) { finish(); $('inputNote').textContent = 'Microphone stopped when the preview was hidden.'; } });
window.addEventListener('pagehide', releaseMic);
chooseDemo(); requestAnimationFrame(tick);
