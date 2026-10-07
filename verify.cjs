const fs = require('fs'), vm = require('vm'), assert = require('assert');
class El {
  constructor() {
    this.textContent = ''; this.children = []; this.style = {setProperty(name,value){this[name]=value}}; this.dataset = {};
    this.offsetTop = 0; this.scrollTop = 0; this.clientHeight = 399;
    this.classes = new Set();
    this.classList = { add: c => this.classes.add(c), remove: c => this.classes.delete(c), toggle: (c,v) => v ? this.classes.add(c) : this.classes.delete(c) };
  }
  append(...elements) { this.children.push(...elements); }
  scrollTo({top}) { this.scrollTop = top; }
  setAttribute(name,value) { this[name]=value; }
}
const ids = {}, el = id => ids[id] ??= new El();
const phone = new El(), curves = [new El(), new El(), new El(), new El()], paras = [new El(), new El()];
paras.forEach(p => p.textContent = 'Hi I am setting up my voice. Last week we moved the launch.');
const sandbox = {
  document: { getElementById: el, querySelector: s => s === '.phone' ? phone : el(s), querySelectorAll: s => s === '.curve' ? curves : s === '#script p' ? paras : [], createElement: () => new El(), createTextNode: text => ({ textContent: text }), addEventListener() {} },
  matchMedia: () => ({ matches: false }), navigator: {}, window: { addEventListener() {} }, requestAnimationFrame() {}, console
};
vm.createContext(sandbox); vm.runInContext(fs.readFileSync('app.js','utf8'),sandbox);
const run = s => vm.runInContext(s,sandbox);
assert.equal(run('state'),'listening'); assert.equal(run('wordIndex'),0);
assert.equal(run("words.filter(w=>w.classes.has('reading')).length"),1);
run('tick(1000); elapsed=5;tick(1050)'); assert.equal(el('timer').textContent,'01:15');
assert(run('wordIndex')>0); assert.equal(run("words.filter(w=>w.classes.has('reading')).length"),1);
run("$('pause').onclick()"); const frozen=run('wordIndex'); run('tick(1100)'); assert.equal(run('wordIndex'),frozen);
run("$('pause').onclick();chooseDemo()"); assert.equal(run('wordIndex'),0);
run('words[12].offsetTop=500;highlight(12)'); assert(el('script').scrollTop>0);
run("reset(false);followTranscript('Hi I am setting up my voice',0)"); assert.equal(run('wordIndex'),6);
run("followTranscript('Hi I am setting up my voice',0)"); assert.equal(run('wordIndex'),6);
run('chooseDemo();elapsed=readingTime;tick(1150)'); assert.equal(run('state'),'processing');
run('elapsed=2.5;tick(1200)'); assert.equal(run('state'),'complete');
run("$('again').onclick();reduced.matches=true;tick(1250)"); assert(curves.every(c=>c.style.transform==='translateY(0px)'));
assert.equal(el('.recording-surface').style['--voice-energy'],'0.000');
run('reduced.matches=false;elapsed=.6;mode="mic";data=new Uint8Array(1024);analyser={getByteTimeDomainData(buffer){buffer.fill(136)}};for(let t=1300;t<4300;t+=50)tick(t)');
const surface=el('.recording-surface'); const loud=Number(surface.style['--voice-energy']);
assert(loud>.4); assert(parseFloat(surface.style['--voice-width'])>33);
assert(parseFloat(surface.style['--voice-width'])<=33.17);
assert(parseFloat(surface.style['--voice-core'])>27);
assert(parseFloat(surface.style['--voice-width'])*2/100*441 <=390*.75+.1);
assert(curves.every(c=>c.style.transform===curves[0].style.transform));
const loudWidth=parseFloat(surface.style['--voice-width']);
assert.equal(surface.style['--voice-center'],'50%');
assert(curves.every(c=>!c.style.transform.includes('scale')));
assert(Math.abs(run('curveLift'))<=2.15);
const beforeStop=run('curveLift');run('finish();tick(4300)');assert(Math.abs(run('curveLift')-beforeStop)<.2);
run('state="listening";mode="mic";analyser={getByteTimeDomainData(buffer){buffer.fill(136)}}');
run("$('pause').onclick()"); const held=surface.style['--voice-energy'];const heldLift=run('curveLift');run('tick(4350)');assert.equal(surface.style['--voice-energy'],held);assert.equal(run('curveLift'),heldLift);
run("$('pause').onclick();analyser={getByteTimeDomainData(buffer){buffer.fill(128)}};for(let t=4400;t<8400;t+=50)tick(t)");assert(Number(surface.style['--voice-energy'])<loud*.2);
assert(parseFloat(surface.style['--voice-width'])<loudWidth*.5);
assert(parseFloat(surface.style['--voice-width'])<8.1);
const html=fs.readFileSync('index.html','utf8'), css=fs.readFileSync('style.css','utf8');
assert(!html.includes('feMorphology')); assert(!css.includes('drop-shadow')); assert(!html.includes('gradient-pulse'));
assert(html.includes('href="code.html#app.js"'));assert(html.includes('href="code.html#style.css"'));
const original=fs.readFileSync('assets/edge.svg','utf8'),extended=fs.readFileSync('assets/edge-long.svg','utf8');
assert.equal(original.replace(/<linearGradient[\s\S]*?<\/linearGradient>/,''),extended.replace(/<linearGradient[\s\S]*?<\/linearGradient>/,''));
for(const [,path] of html.matchAll(/(?:src|href)="((?:assets\/|style\.css|app\.js)[^"]*)"/g)) assert(fs.statSync(path).size>0,path);
for(const [,path] of css.matchAll(/url\('([^']+)'\)/g)) if(!path.startsWith('#')) assert(fs.statSync(path).size>0,path);
console.log('PASS: one-word highlight, reading progress, pause/replay, scroll, transcript matching, completion, reduced motion, local fonts and assets.');
