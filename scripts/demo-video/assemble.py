"""Cuts the screencast into scenes by marks.json, adds each scene's narration and title, and joins them.
Usage: python3 assemble.py demo-out  ->  demo-out/xuyen-su-ky-demo.mp4"""
import json, os, subprocess, sys
from pathlib import Path

out = Path(sys.argv[1] if len(sys.argv) > 1 else 'demo-out')
data = json.loads((out / 'marks.json').read_text())
durations = json.loads((out / 'durations.json').read_text())
frames, marks = data['frames'], data['marks']
font = next((f for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', '/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf'] if os.path.exists(f)), None)
work = out / 'scenes'; work.mkdir(exist_ok=True)
parts = []
for number, mark in enumerate(marks):
    start, end = mark['start'], mark['end']
    before = [f for f in frames if f['t'] <= start]
    inside = [f for f in frames if start < f['t'] < end]
    shots = ([{**before[-1], 't': start}] if before else []) + inside
    if not shots: continue
    lines = []
    for index, shot in enumerate(shots):
        until = shots[index + 1]['t'] if index + 1 < len(shots) else end
        lines += [f"file '{Path(shot['file']).resolve()}'", f"duration {max(until - shot['t'], 0.001):.3f}"]
    lines.append(f"file '{Path(shots[-1]['file']).resolve()}'")
    listing = work / f"{mark['id']}.txt"; listing.write_text('\n'.join(lines) + '\n')
    length = end - start
    title = work / f"{mark['id']}.title.txt"; title.write_text(mark['title'])
    video = 'fps=30,scale=1280:720:flags=lanczos,format=yuv420p'
    if font: video += f",drawtext=fontfile={font}:textfile={title}:fontsize=26:fontcolor=white:box=1:boxcolor=0x0f2a4a@0.82:boxborderw=14:x=28:y=h-th-40:enable='lt(t,4.5)'"
    if number == 0: video += ',fade=t=in:st=0:d=0.6'
    if number == len(marks) - 1: video += f',fade=t=out:st={max(length - 1.2, 0):.2f}:d=1.2'
    audio = out / 'audio' / f"{mark['id']}.mp3"
    temp, final = work / f"{mark['id']}.part.mp4", work / f"{mark['id']}.mp4"
    command = ['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(listing)]
    command += ['-i', str(audio)] if audio.exists() else ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
    command += ['-filter_complex', f"[0:v]{video}[v];[1:a]aresample=48000,adelay=350:all=1,apad[a]", '-map', '[v]', '-map', '[a]', '-t', f'{length:.3f}',
                '-c:v', 'libx264', '-crf', '19', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', '30', '-c:a', 'aac', '-b:a', '160k', '-ac', '2', '-ar', '48000', str(temp)]
    subprocess.run(command, check=True)
    temp.rename(final); parts.append(final)
    print(mark['id'], f'{length:.1f} s', f"(narration {durations.get(mark['id'], 0):.1f} s)")
(work / 'all.txt').write_text(''.join(f"file '{p.resolve()}'\n" for p in parts))
result = out / 'xuyen-su-ky-demo.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(work / 'all.txt'), '-c', 'copy', '-movflags', '+faststart', str(result)], check=True)
total = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(result)]).decode())
print(f'{result}: {total:.1f} s, {result.stat().st_size / 1e6:.1f} MB')
