// Coordinates are calibrated against the original, unmodified illustration pixels.
interface Ellipse { x: number; y: number; rx: number; ry: number }
interface Eye extends Ellipse { angle: number }
export interface CharacterPortrait {
  width: number
  height: number
  subtitle: string
  head: Ellipse
  shoulder: Ellipse
  mouth: { x: number; y: number; width: number; height: number; angle: number; lip: string }
  eyes: Eye[]
  skin: [string, string]
}

export const characterPortraits: Record<string, CharacterPortrait> = {
  'tran-hung-dao': {
    width: 1024, height: 1536,
    subtitle: 'Hào khí Đông A · Bạch Đằng năm 1288',
    head: { x: 503, y: 350, rx: 224, ry: 286 },
    shoulder: { x: 678, y: 1175, rx: 130, ry: 155 },
    mouth: { x: 550, y: 401, width: 70, height: 14, angle: 1, lip: '#a06b4b' },
    eyes: [{ x: 499, y: 299, rx: 26, ry: 12, angle: -4 }, { x: 587, y: 303, rx: 23, ry: 11, angle: 2 }],
    skin: ['#c79563', '#dfb182'],
  },
  'ngo-quyen': {
    width: 768, height: 1152,
    subtitle: 'Bạch Đằng năm 938 · Bước ngoặt tự chủ',
    head: { x: 375, y: 292, rx: 173, ry: 204 },
    shoulder: { x: 506, y: 967, rx: 96, ry: 113 },
    mouth: { x: 412, y: 344, width: 53, height: 11, angle: 2, lip: '#a57049' },
    eyes: [{ x: 379, y: 276, rx: 18, ry: 8, angle: -2 }, { x: 445, y: 281, rx: 16, ry: 8, angle: 3 }],
    skin: ['#c69a68', '#dfb381'],
  },
  'ho-chi-minh': {
    width: 768, height: 1152,
    subtitle: 'Hành trình tìm đường cứu nước',
    head: { x: 379, y: 329, rx: 153, ry: 224 },
    shoulder: { x: 493, y: 704, rx: 113, ry: 187 },
    mouth: { x: 379, y: 391, width: 63, height: 12, angle: 4, lip: '#a56e4e' },
    eyes: [{ x: 350, y: 293, rx: 23, ry: 8, angle: 4 }, { x: 430, y: 302, rx: 21, ry: 8, angle: 7 }],
    skin: ['#c99867', '#dfb381'],
  },
  'vo-nguyen-giap': {
    width: 768, height: 1152,
    subtitle: 'Điện Biên Phủ · Bản lĩnh người chỉ huy',
    head: { x: 362, y: 288, rx: 165, ry: 202 },
    shoulder: { x: 608, y: 992, rx: 97, ry: 104 },
    mouth: { x: 419, y: 348, width: 57, height: 11, angle: -6, lip: '#9e6240' },
    eyes: [{ x: 376, y: 270, rx: 20, ry: 10, angle: -9 }, { x: 448, y: 265, rx: 18, ry: 9, angle: -5 }],
    skin: ['#dba16d', '#efbd86'],
  },
}
