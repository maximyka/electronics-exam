#!/usr/bin/env python3
import json
import re
import sys
import subprocess
from datetime import datetime

VERSION_FILE = 'app/version.json'
SW_FILE = 'app/sw.js'
APP_JS_FILE = 'app/app.js'
HTML_FILE = 'app/index.html'

def bump_version(note="Обновление материалов курса"):
    with open(VERSION_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    parts = [int(p) for p in data['version'].split('.')]
    parts[-1] += 1
    new_version = '.'.join(str(p) for p in parts)
    
    data['version'] = new_version
    data['build'] = data.get('build', 1) + 1
    data['releaseDate'] = datetime.now().strftime('%d.%m.%Y %H:%M')
    data['notes'] = note
    
    with open(VERSION_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    # 2. Обновляем sw.js
    with open(SW_FILE, 'r', encoding='utf-8') as f:
        sw_code = f.read()
    sw_code = re.sub(r"const CACHE_NAME = 'electronics-exam-v[^']*';", f"const CACHE_NAME = 'electronics-exam-v{new_version}';", sw_code)
    with open(SW_FILE, 'w', encoding='utf-8') as f:
        f.write(sw_code)
        
    # 3. Обновляем app.js
    with open(APP_JS_FILE, 'r', encoding='utf-8') as f:
        app_code = f.read()
    app_code = re.sub(r"const CURRENT_APP_VERSION = '[^']*';", f"const CURRENT_APP_VERSION = '{new_version}';", app_code)
    with open(APP_JS_FILE, 'w', encoding='utf-8') as f:
        f.write(app_code)
        
    # 4. Обновляем index.html
    with open(HTML_FILE, 'r', encoding='utf-8') as f:
        html_code = f.read()
    html_code = re.sub(r'<span id="app-version-tag">[^<]*</span>', f'<span id="app-version-tag">v{new_version}</span>', html_code)
    with open(HTML_FILE, 'w', encoding='utf-8') as f:
        f.write(html_code)
        
    print(f"✅ Версия успешно повышена до: v{new_version}")
    return new_version

if __name__ == '__main__':
    note = sys.argv[1] if len(sys.argv) > 1 else "Обновление материалов и формул"
    bump_version(note)
