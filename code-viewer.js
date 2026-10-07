const sourceFiles = window.BRAMMA_SOURCE_FILES || {};
const fileNames = Object.keys(sourceFiles);
const get = id => document.getElementById(id);
let selectedFile = '';
const escapeHtml = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function highlightCode(source, language) {
  // Tokenize the source before escaping. Never evaluate or insert raw file HTML.
  const pattern = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|<!--(?:[\s\S]*?)-->)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b(?:const|let|var|function|return|if|else|for|while|new|async|await|try|catch|throw|true|false|null|undefined|class|import|from|export)\b)|(#[\da-fA-F]{3,8}\b|\b\d+(?:\.\d+)?(?:px|ms|s|%)?)|([\w-]+(?=\s*:))|(<\/?[\w-]+)/g;
  let result = '', cursor = 0;
  for (const match of source.matchAll(pattern)) {
    result += escapeHtml(source.slice(cursor, match.index));
    const kind = match[1] ? 'comment' : match[2] ? 'string' : match[3] ? 'keyword' : match[4] ? 'number' : match[5] ? 'property' : 'tag';
    // Split multiline tokens so every visual line has its own line number.
    result += match[0].split('\n').map(line => `<span class="token-${kind}">${escapeHtml(line)}</span>`).join('\n');
    cursor = match.index + match[0].length;
  }
  return result + escapeHtml(source.slice(cursor));
}
function openFile(name, updateUrl = true) {
  if (!Object.hasOwn(sourceFiles, name)) return;
  selectedFile = name;
  const extension = name.split('.').pop();
  const language = {js:'JavaScript',css:'CSS',html:'HTML',svg:'SVG',md:'Markdown'}[extension] || 'Text';
  const source = sourceFiles[name].replace(/\r\n/g, '\n');
  const highlighted = highlightCode(source, language);
  get('codeContent').innerHTML = highlighted.split('\n').map(line => `<span class="code-line">${line || ' '}</span>`).join('');
  document.querySelectorAll('[data-file]').forEach(button => {
    button.classList.toggle('active', button.dataset.file === name);
    button.setAttribute('aria-current', button.dataset.file === name ? 'true' : 'false');
  });
  get('fileTabs').textContent = '';
  const tab = document.createElement('span'); tab.className = 'tab'; tab.textContent = name; get('fileTabs').append(tab);
  get('breadcrumb').textContent = 'bramma-voiceenroll / ' + name;
  get('languageLabel').textContent = language;
  get('lineCount').textContent = source.split('\n').length + ' lines';
  get('copyStatus').textContent = 'Read only · Select or copy the complete file';
  get('codeContent').parentElement.scrollTop = 0;
  get('codeContent').parentElement.scrollLeft = 0;
  if (updateUrl) history.replaceState(null, '', '#'+encodeURIComponent(name));
}
for (const name of fileNames) {
  const button = document.createElement('button'); button.dataset.file = name;
  const icon = document.createElement('span'); const ext = name.split('.').pop();
  icon.className = 'file-icon '+ext; icon.textContent = {js:'JS',css:'#',html:'<>',svg:'◇',md:'M↓'}[ext] || '·';
  button.append(icon, document.createTextNode(name)); button.onclick = () => openFile(name);
  get('fileList').append(button);
}
get('copyCode').onclick = async () => {
  if (!selectedFile) return;
  const source = sourceFiles[selectedFile];
  try {
    if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(source);
    else {
      const field = document.createElement('textarea'); field.value = source;
      field.style.cssText = 'position:fixed;left:-9999px'; document.body.append(field); field.select();
      const copied = document.execCommand('copy'); field.remove();
      if (!copied) throw Error('Clipboard unavailable');
    }
    get('copyStatus').textContent = 'Copied '+selectedFile;
  } catch { get('copyStatus').textContent = 'Copy unavailable. Select the code or download the file.'; }
};
get('downloadCode').onclick = () => {
  if (!selectedFile) return;
  const url = URL.createObjectURL(new Blob([sourceFiles[selectedFile]], {type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a'); link.href = url; link.download = selectedFile.split('/').pop();
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
};
window.addEventListener('hashchange', () => {
  try { openFile(decodeURIComponent(location.hash.slice(1)),false); } catch {}
});
let requested = ''; try { requested = decodeURIComponent(location.hash.slice(1)); } catch {}
if (fileNames.length) openFile(Object.hasOwn(sourceFiles,requested) ? requested : 'app.js',false);
else { get('fileError').hidden = false; get('fileError').textContent = 'Source bundle is missing. Run python package-demo.py and publish code-files.js with this viewer.'; get('copyCode').disabled = get('downloadCode').disabled = true; }
