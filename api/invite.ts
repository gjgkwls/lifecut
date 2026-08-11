import { list } from '@vercel/blob'

const CODE_RE = /^[a-z0-9]{10,20}$/

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// /i/:code 초대 링크 전용 페이지.
// 카톡/인스타/트위터 크롤러는 JS를 실행하지 않아서, 친구 이름이 담긴
// OG 태그를 서버에서 index.html에 심어 돌려준다. 사람에게는 같은 앱이 뜬다.
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url)
  const code = url.searchParams.get('code') ?? ''
  const origin = url.origin

  const html = await fetch(`${origin}/index.html`).then((r) => r.text())
  let page = html

  if (CODE_RE.test(code)) {
    try {
      const { blobs } = await list({ prefix: `frames/${code}/meta.json`, limit: 1 })
      if (blobs[0]) {
        const meta = await fetch(blobs[0].url).then((r) => r.json())
        if (typeof meta?.name === 'string' && Array.isArray(meta?.urls) && meta.urls[0]) {
          const name = escapeHtml(meta.name)
          const tags = [
            `<meta property="og:type" content="website" />`,
            `<meta property="og:title" content="4 cuts with ${name}" />`,
            `<meta property="og:description" content="💌 ${name}님이 초대했어요 — LifeCut에서 함께 네컷 찍어요!" />`,
            `<meta property="og:image" content="${escapeHtml(String(meta.urls[0]))}" />`,
            `<meta property="og:url" content="${origin}/i/${code}" />`,
            `<meta name="twitter:card" content="summary" />`,
          ].join('\n    ')
          // 같은 og 태그가 여러 개면 크롤러는 첫 번째를 쓰므로 <head> 맨 앞에 넣는다
          page = page.replace('<head>', `<head>\n    ${tags}`)
          page = page.replace(/<title>.*?<\/title>/, `<title>4 cuts with ${name} — LifeCut</title>`)
        }
      }
    } catch {
      // 메타 조회에 실패하면 기본 페이지 그대로 — 앱이 잘못된 링크를 안내한다
    }
  }

  return new Response(page, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, s-maxage=300, max-age=60',
    },
  })
}
