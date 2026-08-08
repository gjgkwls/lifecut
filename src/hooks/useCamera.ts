import { useCallback, useEffect, useState } from 'react'

function errorMessage(err: unknown): string {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError') {
      return 'Camera access was denied. Please allow camera permission in your browser settings and try again.'
    }
    if (err.name === 'NotFoundError' || err.name === 'OverconstrainedError') {
      return "We couldn't find a camera. Please check that one is connected."
    }
    if (err.name === 'NotReadableError') {
      return 'Another app is using the camera. Please close it and try again.'
    }
  }
  return 'Something went wrong while starting the camera. Please try again.'
}

/** 전면 카메라 스트림을 열고, 화면을 벗어나면 자동으로 정리한다. */
export function useCamera() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let active: MediaStream | null = null

    setStream(null)
    setError(null)

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })
      .then((mediaStream) => {
        if (cancelled) {
          mediaStream.getTracks().forEach((track) => track.stop())
          return
        }
        active = mediaStream
        setStream(mediaStream)
      })
      .catch((err) => {
        if (!cancelled) setError(errorMessage(err))
      })

    return () => {
      cancelled = true
      active?.getTracks().forEach((track) => track.stop())
    }
  }, [attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])

  return { stream, error, retry }
}
