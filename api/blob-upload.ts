import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'

// 프레임 저장 경로만 허용: frames/{공유코드}/cut-1..4.png 또는 meta.json
const PATH_RE = /^frames\/[a-z0-9]{10,20}\/(cut-[1-4]\.png|meta\.json)$/

export async function POST(request: Request): Promise<Response> {
  const body = (await request.json()) as HandleUploadBody
  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!PATH_RE.test(pathname)) {
          throw new Error('invalid upload path')
        }
        return {
          allowedContentTypes: ['image/png', 'application/json'],
          addRandomSuffix: false,
          maximumSizeInBytes: 8 * 1024 * 1024,
        }
      },
      onUploadCompleted: async () => {},
    })
    return Response.json(result)
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : 'upload failed' },
      { status: 400 },
    )
  }
}
