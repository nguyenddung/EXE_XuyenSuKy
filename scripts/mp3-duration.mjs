// Duration of an MPEG-1 Layer III file (what ElevenLabs returns), by walking its frames: no decoder needed.
const bitrates = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320]
const sampleRates = [44100, 48000, 32000]

export function mp3Seconds(buffer) {
  let offset = 0
  if (buffer.subarray(0, 3).toString('latin1') === 'ID3') offset = 10 + ((buffer[6] & 0x7f) << 21 | (buffer[7] & 0x7f) << 14 | (buffer[8] & 0x7f) << 7 | (buffer[9] & 0x7f))
  let seconds = 0
  while (offset + 4 <= buffer.length) {
    const mpeg1 = ((buffer[offset + 1] >> 3) & 3) === 3
    const layer3 = ((buffer[offset + 1] >> 1) & 3) === 1
    const bitrate = bitrates[buffer[offset + 2] >> 4]
    const rate = sampleRates[(buffer[offset + 2] >> 2) & 3]
    if (buffer[offset] !== 0xff || (buffer[offset + 1] & 0xe0) !== 0xe0 || !mpeg1 || !layer3 || !bitrate || !rate) { offset++; continue }
    seconds += 1152 / rate
    offset += Math.floor((144 * bitrate * 1000) / rate) + ((buffer[offset + 2] >> 1) & 1)
  }
  return Math.round(seconds * 100) / 100
}
