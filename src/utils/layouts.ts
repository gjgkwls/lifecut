export type LayoutId = 'single' | 'duo' | 'strip4' | 'hajin4' | 'grid4' | 'custom4'

export interface Slot {
  x: number
  y: number
  w: number
  h: number
}

export interface LayoutSpec {
  id: LayoutId
  label: string
  shots: number
  captureWidth: number
  captureHeight: number
  canvasWidth: number
  canvasHeight: number
  slots: Slot[]
  /** 컷마다 미리 합성될 인물 누끼 이미지 (아티스트 프레임) */
  overlayShots?: string[]
}

// 레퍼런스처럼 바깥 여백은 넉넉하게, 사진 사이 여백은 그보다 좁게
const STRIP_SIDE = 100
const STRIP_EDGE = 160
const STRIP_GAP = 50

function verticalStrip(id: LayoutId, label: string, count: number): LayoutSpec {
  const w = 800
  const h = 600
  return {
    id,
    label,
    shots: count,
    captureWidth: w,
    captureHeight: h,
    canvasWidth: w + STRIP_SIDE * 2,
    canvasHeight: STRIP_EDGE * 2 + h * count + STRIP_GAP * (count - 1),
    slots: Array.from({ length: count }, (_, i) => ({
      x: STRIP_SIDE,
      y: STRIP_EDGE + i * (h + STRIP_GAP),
      w,
      h,
    })),
  }
}

export const LAYOUTS: LayoutSpec[] = [
  {
    // 9:16 프레임 배경 중앙에 작은 세로 사진 한 장 (레퍼런스 스타일)
    id: 'single',
    label: '1 cut',
    shots: 1,
    captureWidth: 600,
    captureHeight: 800,
    canvasWidth: 1080,
    canvasHeight: 1920,
    slots: [{ x: 348, y: 704, w: 384, h: 512 }],
  },
  verticalStrip('duo', '2 cuts', 2),
  verticalStrip('strip4', '4 cuts', 4),
  {
    // 포토이즘 아티스트 프레임처럼 hajin과 같이 찍히는 4컷
    ...verticalStrip('hajin4', '4 cuts with hajin', 4),
    overlayShots: [
      '/hajin/hajin-1.png',
      '/hajin/hajin-2.png',
      '/hajin/hajin-3.png',
      '/hajin/hajin-4.png',
    ],
  },
  {
    // 레퍼런스처럼 사진 사이는 얇은 틈, 바깥은 넉넉한 여백의 2×2
    id: 'grid4',
    label: '2×2 cuts',
    shots: 4,
    captureWidth: 600,
    captureHeight: 800,
    canvasWidth: 1504,
    canvasHeight: 2024,
    slots: [
      { x: 140, y: 200, w: 600, h: 800 },
      { x: 764, y: 200, w: 600, h: 800 },
      { x: 140, y: 1024, w: 600, h: 800 },
      { x: 764, y: 1024, w: 600, h: 800 },
    ],
  },
]

/** "make my frame"으로 만든 인물 누끼 4장을 얹는 커스텀 4컷 레이아웃 */
export function customStrip(name: string, overlayShots: string[]): LayoutSpec {
  return {
    ...verticalStrip('custom4', `4 cuts with ${name}`, 4),
    overlayShots,
  }
}

export interface FrameOption {
  id: string
  name: string
  src: string
}

export const FRAMES: FrameOption[] = [
  { id: 'star-cream', name: 'cream stars', src: '/frames/star-cream.jpg' },
  { id: 'star-choco', name: 'choco stars', src: '/frames/star-choco.png' },
  { id: 'star-multi', name: 'multi stars', src: '/frames/star-multi.jpg' },
  { id: 'gingham', name: 'blue gingham', src: '/frames/gingham.png' },
  { id: 'gingham-green', name: 'green gingham', src: '/frames/gingham-green.jpg' },
  { id: 'star-blue', name: 'blue stars', src: '/frames/star-blue.jpg' },
  { id: 'stripe-blue', name: 'blue stripes', src: '/frames/stripe-blue.png' },
]
