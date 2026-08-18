from pathlib import Path
import json, sys
root=Path(__file__).resolve().parents[1]
required=[
 'package.json','.env.example','docker-compose.yml','apps/server/src/app.ts','apps/server/src/store.ts',
 'apps/desktop/src/App.tsx','apps/desktop/src/audio.ts','apps/desktop/src-tauri/tauri.conf.json',
 'packages/protocol/src/index.ts','packages/permissions/src/index.ts','infrastructure/livekit/livekit.yaml'
]
missing=[p for p in required if not (root/p).exists()]
for path in root.rglob('*.json'):
    try: json.loads(path.read_text(encoding='utf-8'))
    except Exception as exc:
        print(f'Invalid JSON: {path.relative_to(root)}: {exc}'); sys.exit(2)
if missing:
    print('Missing core files:', ', '.join(missing)); sys.exit(3)
text='\n'.join(p.read_text(encoding='utf-8',errors='ignore') for p in root.rglob('*') if p.is_file() and p.suffix in {'.ts','.tsx','.rs','.md','.json','.yaml','.yml'})
for forbidden in ['teamspeak_logo','TeamSpeak proprietary']:
    if forbidden in text:
        print('Forbidden copied asset/reference marker:',forbidden);sys.exit(4)
print(f'Voxora source smoke check OK — {sum(1 for p in root.rglob("*") if p.is_file())} files present.')
