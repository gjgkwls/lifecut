import type { LayoutSpec } from './layouts'

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** 사진만 흑백으로 변환한 캔버스를 만든다 (프레임 배경은 컬러 유지). */
function grayscaleCanvas(img: HTMLImageElement, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0, w, h)
  const imageData = ctx.getImageData(0, 0, w, h)
  const d = imageData.data
  for (let i = 0; i < d.length; i += 4) {
    const gray = d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
    d[i] = gray
    d[i + 1] = gray
    d[i + 2] = gray
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

/** 촬영된 사진들을 선택한 레이아웃과 프레임 배경으로 합성해 dataURL로 반환한다. */
export async function composeStrip(
  shots: string[],
  layout: LayoutSpec,
  frameSrc: string,
  mono = false,
  credit = true,
): Promise<string> {
  const [frameImg, images] = await Promise.all([
    loadImage(frameSrc),
    Promise.all(shots.map(loadImage)),
  ])

  const W = layout.canvasWidth
  const H = layout.canvasHeight
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  // 프레임 이미지를 cover 방식으로 캔버스 전체에 그린다
  const scale = Math.max(W / frameImg.width, H / frameImg.height)
  const fw = frameImg.width * scale
  const fh = frameImg.height * scale
  ctx.drawImage(frameImg, (W - fw) / 2, (H - fh) / 2, fw, fh)

  layout.slots.forEach((slot, i) => {
    const img = images[i]
    if (!img) return
    const source: CanvasImageSource = mono ? grayscaleCanvas(img, slot.w, slot.h) : img
    ctx.drawImage(source, slot.x, slot.y, slot.w, slot.h)
  })

  if (credit) await drawCredit(ctx, layout)

  return canvas.toDataURL('image/png')
}

/** 문구가 놓일 자리의 프레임 밝기를 샘플링해 어두운 배경인지 판단한다. */
function isDarkAt(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): boolean {
  const canvas = ctx.canvas
  const x = Math.max(0, Math.round(cx - size * 2))
  const y = Math.max(0, Math.round(cy - size))
  const w = Math.min(canvas.width - x, size * 4)
  const h = Math.min(canvas.height - y, size * 2)
  if (w < 1 || h < 1) return false
  const d = ctx.getImageData(x, y, w, h).data
  let sum = 0
  for (let i = 0; i < d.length; i += 4) {
    sum += d[i] * 0.299 + d[i + 1] * 0.587 + d[i + 2] * 0.114
  }
  return sum / (d.length / 4) < 128
}

/** 하단 여백 중앙에 작은 크레딧 문구를 넣는다. */
async function drawCredit(ctx: CanvasRenderingContext2D, layout: LayoutSpec) {
  const W = layout.canvasWidth
  const H = layout.canvasHeight
  const fontSize = Math.round(W * 0.026)
  try {
    await document.fonts.load(`${fontSize}px 'Special Elite'`)
  } catch {
    // 폰트 로드에 실패해도 폴백 서체로 그린다
  }
  // 사진 아래 남는 띠의 세로 중앙에, 띠가 아주 넓으면 바닥 쪽에 붙인다
  const photosBottom = Math.max(...layout.slots.map((s) => s.y + s.h))
  const band = H - photosBottom
  const y = H - Math.min(Math.max(band / 2, 40), 100)
  ctx.font = `${fontSize}px 'Special Elite', 'Courier New', serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = isDarkAt(ctx, W / 2, y, fontSize)
    ? 'rgba(247, 242, 231, 0.85)'
    : 'rgba(75, 53, 39, 0.8)'
  ctx.fillText('by.hajin', W / 2, y)
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}
