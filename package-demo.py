"""Build a portable Netlify upload with embedded visual assets."""
from pathlib import Path
import base64
import mimetypes
import re
import shutil
import zipfile
import json

root = Path(__file__).resolve().parent
output = root / 'netlify-public'
output.mkdir(exist_ok=True)

# A bundled source map keeps the code viewer usable offline without fetch/CORS.
source_names = ['app.js', 'style.css', 'index.html', 'notes.js', 'assets/edge-long.svg', 'MOTION.md']
source_files = {name: (root / name).read_text(encoding='utf-8') for name in source_names}
(root / 'code-files.js').write_text(
    'window.BRAMMA_SOURCE_FILES = ' + json.dumps(source_files, ensure_ascii=True) + ';\n', encoding='utf-8')

def data_url(relative_path):
    path = root / relative_path
    if not path.is_file() or not path.stat().st_size:
        raise ValueError(f'Missing asset: {relative_path}')
    kind = 'font/ttf' if path.suffix == '.ttf' else mimetypes.guess_type(path)[0]
    return f'data:{kind};base64,' + base64.b64encode(path.read_bytes()).decode('ascii')

html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'style.css').read_text(encoding='utf-8')
css = re.sub(r"url\('([^']+)'\)", lambda m: f"url('{data_url(m[1])}')" if m[1].startswith('assets/') else m[0], css)
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>\n' + css + '\n</style>')
html = re.sub(r'src="(assets/[^\"]+)"', lambda m: f'src="{data_url(m[1])}"', html)
for script in ['app.js', 'notes.js']:
    code = (root / script).read_text(encoding='utf-8')
    html = html.replace(f'<script src="{script}"></script>', '<script>\n' + code + '\n</script>')

# Keep the original source files available through Developer notes.
for name in ['app.js', 'notes.js', 'style.css', 'MOTION.md', 'code.html', 'code-viewer.css', 'code-viewer.js', 'code-files.js']:
    shutil.copy2(root / name, output / name)
shutil.copytree(root / 'assets', output / 'assets', dirs_exist_ok=True)
(output / 'index.html').write_text(html, encoding='utf-8')

with zipfile.ZipFile(root / 'Bramma-voice-demo.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(output.rglob('*')):
        if path.is_file():
            archive.write(path, path.relative_to(output).as_posix())

# Verify that the rendered page does not need external fonts/images/scripts.
assert 'src="assets/' not in html
assert "url('assets/" not in html
assert '<script src=' not in html
assert '<link rel="stylesheet"' not in html
assert 'href="code.html#app.js"' in html
assert 'data:image/svg+xml;base64,' in html
assert 'data:font/ttf;base64,' in html
print('PASS: portable HTML includes the original curve SVGs, icons, fonts, styles and animation scripts.')
print('Upload netlify-public/index.html or the refreshed Bramma-voice-demo.zip.')
