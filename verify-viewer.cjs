const fs = require('fs'), vm = require('vm'), assert = require('assert');
class Element {
  constructor() { this.children=[];this.dataset={};this.style={};this.parentElement={};this.classList={toggle(){}}; }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute() {}
  click() { this.clicked=true; }
  remove() {}
}
const nodes={}, node=id=>nodes[id]??=new Element();let copied='';const blobs=[];
const sandbox={window:{addEventListener(){}},location:{hash:'#style.css'},history:{replaceState(_a,_b,path){sandbox.location.hash=path}},navigator:{clipboard:{async writeText(text){copied=text}}},document:{getElementById:node,createElement:()=>new Element(),createTextNode:text=>({textContent:text}),querySelectorAll:()=>node('fileList').children,body:new Element()},Blob,URL:{createObjectURL(blob){blobs.push(blob);return 'blob:demo'},revokeObjectURL(){}},setTimeout(){}};
vm.createContext(sandbox);vm.runInContext(fs.readFileSync('code-files.js','utf8'),sandbox);vm.runInContext(fs.readFileSync('code-viewer.js','utf8'),sandbox);
(async()=>{
  assert.equal(vm.runInContext('selectedFile',sandbox),'style.css');
  assert.equal(node('languageLabel').textContent,'CSS');
  assert(node('codeContent').innerHTML.includes('token-property'));
  assert(node('codeContent').innerHTML.includes('code-line'));
  await vm.runInContext('get("copyCode").onclick()',sandbox);
  assert.equal(copied,fs.readFileSync('style.css','utf8'));
  vm.runInContext('openFile("app.js")',sandbox);assert.equal(node('languageLabel').textContent,'JavaScript');
  await vm.runInContext('get("copyCode").onclick()',sandbox);assert.equal(copied,fs.readFileSync('app.js','utf8'));
  vm.runInContext('get("downloadCode").onclick()',sandbox);assert.equal(await blobs[0].text(),copied);
  vm.runInContext('openFile("index.html")',sandbox);assert(!node('codeContent').innerHTML.includes('<script src='));assert(node('codeContent').innerHTML.includes('&lt;'));
  vm.runInContext('openFile("does-not-exist")',sandbox);assert.equal(vm.runInContext('selectedFile',sandbox),'index.html');
  for(const [name,source] of Object.entries(sandbox.window.BRAMMA_SOURCE_FILES))assert.equal(source,fs.readFileSync(name,'utf8'));
  console.log('PASS: source routing, syntax colors, safe HTML display, exact copy/download, and current source bundle.');
})().catch(error=>{console.error(error);process.exitCode=1});
