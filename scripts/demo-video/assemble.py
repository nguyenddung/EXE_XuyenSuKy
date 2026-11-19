"""Cuts the screencast into scenes by marks.json, adds each scene's narration and title, and joins them.
Usage: python3 assemble.py demo-out  ->  demo-out/xuyen-su-ky-demo.mp4"""
import json, os, subprocess, sys
from pathlib import Path

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'demo-out')
data = json.loads((out / 'marks.json').read_text())
durations = json.loads((out / 'durations.json').read_text())
frames, marks = data['frames'], data['marks']
narration = {item['id']: item for item in json.loads((Path(__file__).parent / 'narration.json').read_text(encoding='utf-8'))}
# Voice clips (character answers, the student's spoken questions) at the moment they play.
voices = data.get('clips', [])
font = next((f for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'] if os.path.exists(f)), None)
work = out / 'scenes'; work.mkdir(exist_ok=True)
parts = []
for number, mark in enumerate(marks):
    start, end = mark['start'], mark['end']
    # Kept stretches of the scene: everything but the cut waits.
    cuts = sorted(mark.get('cuts', []))
    pieces, cursor = [], start
    for cut_from, cut_to in cuts:
        if cut_from > cursor: pieces.append((cursor, min(cut_from, end)))
        cursor = max(cursor, cut_to)
    if cursor < end: pieces.append((cursor, end))
    def shifted(moment):  # scene time of an absolute moment once the cuts are taken out
        return sum(min(moment, b) - a for a, b in pieces if moment > a)
    lines, last = [], None
    for piece_from, piece_to in pieces:
        before = [f for f in frames if f['t'] <= piece_from]
        inside = [f for f in frames if piece_from < f['t'] < piece_to]
        shots = ([{**before[-1], 't': piece_from}] if before else []) + inside
        for index, shot in enumerate(shots):
            until = shots[index + 1]['t'] if index + 1 < len(shots) else piece_to
            lines += [f"file '{Path(shot['file']).resolve()}'", f"duration {max(until - shot['t'], 0.001):.3f}"]
            last = shot
    if not last: continue
    lines.append(f"file '{Path(last['file']).resolve()}'")
    listing = work / f"{mark['id']}.txt"; listing.write_text('\n'.join(lines) + '\n')
    length = sum(b - a for a, b in pieces)
    title = work / f"{mark['id']}.title.txt"; title.write_text(mark['title'])
    video = 'fps=30,scale=1280:720:flags=lanczos,format=yuv420p'
    if font: video += f",drawtext=fontfile={font}:textfile={title}:fontsize=26:fontcolor=white:box=1:boxcolor=0x0f2a4a@0.82:boxborderw=14:x=28:y=h-th-40:enable='lt(t,4.5)'"
    badge = narration.get(mark['id'], {}).get('badge')
    if font and badge:
        badge_file = work / f"{mark['id']}.badge.txt"; badge_file.write_text(badge)
        video += f",drawtext=fontfile={font}:textfile={badge_file}:fontsize=20:fontcolor=white:box=1:boxcolor=0x7a2e12@0.85:boxborderw=10:x=w-tw-28:y=24"
    if number == 0: video += ',fade=t=in:st=0:d=0.6'
    if number == len(marks) - 1: video += f',fade=t=out:st={max(length - 1.2, 0):.2f}:d=1.2'
    audio = out / 'audio' / f"{mark['id']}.mp3"
    temp, final = work / f"{mark['id']}.part.mp4", work / f"{mark['id']}.mp4"
    command = ['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(listing)]
    command += ['-i', str(audio)] if audio.exists() else ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
    extra = [{**v, 'offset': shifted(v['at'])} for v in voices if start <= v['at'] < end]
    for clip in extra: command += ['-i', str(Path(clip['file']).resolve())]
    mix = ''.join(f"[{index + 2}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={int(clip['offset'] * 1000) + 150}:all=1[x{index}];" for index, clip in enumerate(extra))
    audio_chain = f"[1:a]aresample=48000,aformat=channel_layouts=stereo,adelay=350:all=1[n];{mix}[n]{''.join(f'[x{index}]' for index in range(len(extra)))}amix=inputs={len(extra) + 1}:normalize=0:duration=longest,apad[a]" if extra else "[1:a]aresample=48000,adelay=350:all=1,apad[a]"
    command += ['-filter_complex', f"[0:v]{video}[v];{audio_chain}", '-map', '[v]', '-map', '[a]', '-t', f'{length:.3f}',
                '-c:v', 'libx264', '-crf', '19', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-ar', '48000', str(temp)]
    subprocess.run(command, check=True)
    temp.rename(final); parts.append(final)
    print(mark['id'], f'{length:.1f} s', f"(narration {durations.get(mark['id'], 0):.1f} s)")
(work / 'all.txt').write_text(''.join(f"file '{p.resolve()}'\n" for p in parts))
result = out / 'xuyen-su-ky-demo.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(work / 'all.txt'), '-c', 'copy', '-movflags', '+faststart', str(result)], check=True)
total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(result)]).decode())
print(f'{result}: {total:.1f} s, {result.stat().st_size / 1e6:.1f} MB')
