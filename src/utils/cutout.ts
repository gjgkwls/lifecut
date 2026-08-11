import { removeBackground } from '@imgly/background-removal'

// 업로드 사진을 이 크기까지 줄여서 처리 (속도/용량 절약, hajin 컷아웃과 비슷한 해상도)
const MAX_DIM = 1200

function loadFromUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('unsupported image format'))
    img.src = url
  })
}

// EXIF 회전은 브라우저가 <img> 디코드 단계에서 반영해준다
async function fileToScaledCanvas(file: File): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadFromUrl(url)
    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('canvas export failed'))),
      'image/png',
    )
  })
}

async function blobToCanvas(blob: Blob): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(blob)
  try {
    const img = await loadFromUrl(url)
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d')!.drawImage(img, 0, 0)
    return canvas
  } finally {
    URL.revokeObjectURL(url)
  }
}

// 알파 채널에서 가장 큰 연결 성분(사람)만 남기고 나머지 조각을 지운 뒤,
// 알파 바운딩 박스로 투명 여백을 잘라낸다
function cleanAndCrop(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const w = canvas.width
  const h = canvas.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = imageData.data

  const labels = new Int32Array(w * h).fill(-1)
  const sizes: number[] = []
  const stack: number[] = []
  for (let start = 0; start < w * h; start++) {
    if (labels[start] !== -1 || data[start * 4 + 3] <= 8) continue
    const label = sizes.length
    let size = 0
    stack.length = 0
    stack.push(start)
    labels[start] = label
    while (stack.length) {
      const p = stack.pop()!
      size++
      const x = p % w
      const neighbors = [p - w, p + w]
      if (x > 0) neighbors.push(p - 1)
      if (x < w - 1) neighbors.push(p + 1)
      for (const np of neighbors) {
        if (np < 0 || np >= w * h) continue
        if (labels[np] === -1 && data[np * 4 + 3] > 8) {
          labels[np] = label
          stack.push(np)
        }
      }
    }
    sizes.push(size)
  }
  if (sizes.length === 0) throw new Error('no person found')

  let largest = 0
  for (let i = 1; i < sizes.length; i++) {
    if (sizes[i] > sizes[largest]) largest = i
  }
  for (let p = 0; p < w * h; p++) {
    if (labels[p] !== -1 && labels[p] !== largest) {
      data[p * 4] = 0
      data[p * 4 + 1] = 0
      data[p * 4 + 2] = 0
      data[p * 4 + 3] = 0
    }
  }

  let minX = w
  let minY = h
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 16) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) throw new Error('no person found')

  ctx.putImageData(imageData, 0, 0)
  const pad = 6
  const cx = Math.max(0, minX - pad)
  const cy = Math.max(0, minY - pad)
  const cw = Math.min(w, maxX + pad) - cx
  const ch = Math.min(h, maxY + pad) - cy
  const out = document.createElement('canvas')
  out.width = cw
  out.height = ch
  out.getContext('2d')!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch)
  return out
}

/**
 * 사진 파일들에서 사람 누끼를 따서 PNG data URL로 돌려준다.
 * AI 모델은 첫 사용 시 한 번만 다운로드된다 (이후 캐시).
 */
export async function makeCutouts(
  files: File[],
  onProgress: (message: string) => void,
): Promise<string[]> {
  const results: string[] = []
  for (let i = 0; i < files.length; i++) {
    onProgress(`사진 ${i + 1} / ${files.length} 누끼 따는 중...`)
    let source: HTMLCanvasElement
    try {
      source = await fileToScaledCanvas(files[i])
    } catch {
      throw new Error(
        `${i + 1}번째 사진을 열 수 없어요 — 이 브라우저가 지원하지 않는 형식일 수 있어요 (JPG/PNG로 시도해주세요)`,
      )
    }
    const cutBlob = await removeBackground(await canvasToBlob(source), {
      output: { format: 'image/png' },
      progress: (key, current, total) => {
        if (key.startsWith('fetch') && total > 0) {
          const pct = Math.round((current / total) * 100)
          onProgress(`마법의 가위를 다운로드하는 중... ${pct}% (처음 한 번만 받아요)`)
        }
      },
    })
    try {
      results.push(cleanAndCrop(await blobToCanvas(cutBlob)).toDataURL('image/png'))
    } catch {
      throw new Error(`${i + 1}번째 사진에서 사람을 찾지 못했어요 — 다른 사진으로 해주세요`)
    }
  }
  return results
}
