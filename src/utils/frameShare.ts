import { upload } from '@vercel/blob/client'

export interface SharedFrame {
  name: string
  cutouts: string[]
}

// 추측 불가능한 공유 코드 (36^12 ≈ 4.7×10^18 조합)
function randomCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (b) => (b % 36).toString(36)).join('')
}

export function shareUrlFor(code: string): string {
  return `${location.origin}/?with=${code}`
}

/** 누끼 4장과 이름을 Vercel Blob에 올리고 공유 코드를 돌려준다 */
export async function publishFrame(
  name: string,
  cutouts: string[],
  onProgress: (message: string) => void,
): Promise<string> {
  const code = randomCode()
  const urls: string[] = []
  for (let i = 0; i < cutouts.length; i++) {
    onProgress(`컷 ${i + 1} / ${cutouts.length} 업로드 중...`)
    const blob = await (await fetch(cutouts[i])).blob()
    const result = await upload(`frames/${code}/cut-${i + 1}.png`, blob, {
      access: 'public',
      handleUploadUrl: '/api/blob-upload',
      contentType: 'image/png',
    })
    urls.push(result.url)
  }
  onProgress('초대장을 쓰는 중...')
  const meta = new Blob(
    [JSON.stringify({ name, urls, createdAt: new Date().toISOString() })],
    { type: 'application/json' },
  )
  await upload(`frames/${code}/meta.json`, meta, {
    access: 'public',
    handleUploadUrl: '/api/blob-upload',
    contentType: 'application/json',
  })
  return code
}

/** 공유 코드로 친구의 프레임을 불러온다 (없거나 실패하면 null) */
export async function fetchSharedFrame(code: string): Promise<SharedFrame | null> {
  try {
    const res = await fetch(`/api/frame?code=${encodeURIComponent(code)}`)
    if (!res.ok) return null
    const data = await res.json()
    if (
      typeof data?.name !== 'string' ||
      !Array.isArray(data?.urls) ||
      data.urls.length !== 4 ||
      !data.urls.every((u: unknown) => typeof u === 'string')
    ) {
      return null
    }
    return { name: data.name, cutouts: data.urls }
  } catch {
    return null
  }
}
