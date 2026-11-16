"""Narration: one MP3 per scene with Microsoft's Vietnamese neural voice (edge-tts), plus durations.json."""
import asyncio, json, subprocess, sys
from pathlib import Path
import edge_tts

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'demo-out')
(out / 'audio').mkdir(parents=True, exist_ok=True)
voice = 'vi-VN-HoaiMyNeural'
scenes = json.loads((Path(__file__).parent / 'narration.json').read_text(encoding='utf-8'))

async def main():
    durations = {}
    for scene in scenes:
        target = out / 'audio' / f"{scene['id']}.mp3"
        await edge_tts.Communicate(scene['text'], voice, rate='+4%').save(str(target))
        seconds = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(target)]).decode().strip())
        durations[scene['id']] = round(seconds, 2)
        print(scene['id'], durations[scene['id']])
    (out / 'durations.json').write_text(json.dumps(durations, indent=1))
    print('total narration', round(sum(durations.values()), 1), 's')

asyncio.run(main())
