import { list } from '@vercel/blob'

// 공유 코드로 프레임 정보(이름 + 누끼 이미지 URL 4개)를 돌려준다
export async function GET(request: Request): Promise<Response> {
  const code = new URL(request.url).searchParams.get('code') ?? ''
  if (!/^[a-z0-9]{10,20}$/.test(code)) {
    return Response.json({ error: 'invalid code' }, { status: 400 })
  }

  const { blobs } = await list({ prefix: `frames/${code}/meta.json`, limit: 1 })
  const meta = blobs[0]
  if (!meta) {
    return Response.json({ error: 'not found' }, { status: 404 })
  }

  const data = await fetch(meta.url).then((r) => r.json())
  return Response.json(
    { name: data.name, urls: data.urls },
    { headers: { 'cache-control': 'public, s-maxage=300, max-age=60' } },
  )
}
