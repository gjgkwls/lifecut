import { useCallback, useEffect, useRef, useState } from 'react'
import { useCamera } from '../hooks/useCamera'
import type { LayoutSpec } from '../utils/layouts'
import RetroWindow from './RetroWindow'

const COUNTDOWN_SECONDS = 5
// 인물 오버레이가 컷 안에서 차지할 수 있는 최대 가로 비율 (CSS .camera-overlay와 동일해야 함)
const OVERLAY_MAX_WIDTH = 0.65

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    // 공유 프레임의 원격 이미지도 캔버스를 오염시키지 않도록 CORS 모드로 로드
    if (!src.startsWith('data:')) img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function captureFrame(
  video: HTMLVideoElement,
  cutW: number,
  cutH: number,
  overlay?: HTMLImageElement | null,
): string {
  const canvas = document.createElement('canvas')
  canvas.width = cutW
  canvas.height = cutH
  const ctx = canvas.getContext('2d')!

  // 비디오 프레임을 목표 비율로 center-crop
  const vw = video.videoWidth
  const vh = video.videoHeight
  const targetRatio = cutW / cutH
  let sx = 0
  let sy = 0
  let sw = vw
  let sh = vh
  if (vw / vh > targetRatio) {
    sw = vh * targetRatio
    sx = (vw - sw) / 2
  } else {
    sh = vw / targetRatio
    sy = (vh - sh) / 2
  }

  // 미러 프리뷰에서 본 모습 그대로 저장되도록 좌우 반전
  ctx.translate(cutW, 0)
  ctx.scale(-1, 1)
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, cutW, cutH)

  // 프리뷰와 같은 위치(왼쪽 아래)에 인물 오버레이를 얹는다
  if (overlay) {
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const scale = Math.min(
      (cutW * OVERLAY_MAX_WIDTH) / overlay.naturalWidth,
      cutH / overlay.naturalHeight,
    )
    const w = overlay.naturalWidth * scale
    const h = overlay.naturalHeight * scale
    ctx.drawImage(overlay, 0, cutH - h, w, h)
  }
  return canvas.toDataURL('image/png')
}

interface Props {
  layout: LayoutSpec
  onComplete: (shots: string[]) => void
  onExit: () => void
}

export default function CaptureScreen({ layout, onComplete, onExit }: Props) {
  const { stream, error, retry } = useCamera()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoReady, setVideoReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [taken, setTaken] = useState(0)
  const [flash, setFlash] = useState(false)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const snapRef = useRef(false)
  // 아티스트 프레임용 인물 누끼 이미지 (없는 레이아웃은 빈 배열)
  const [overlays, setOverlays] = useState<HTMLImageElement[] | null>(null)

  useEffect(() => {
    let cancelled = false
    if (!layout.overlayShots) {
      setOverlays([])
      return
    }
    Promise.all(layout.overlayShots.map(loadImage)).then((imgs) => {
      if (!cancelled) setOverlays(imgs)
    })
    return () => {
      cancelled = true
    }
  }, [layout])

  const setPausedState = useCallback((value: boolean) => {
    pausedRef.current = value
    setPaused(value)
  }, [])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !stream) return
    video.srcObject = stream
    return () => {
      video.srcObject = null
      setVideoReady(false)
    }
  }, [stream])

  useEffect(() => {
    if (!videoReady || !overlays) return
    const video = videoRef.current
    if (!video) return

    let cancelled = false

    const waitWhilePaused = async () => {
      while (pausedRef.current && !cancelled) {
        await sleep(150)
      }
    }

    // 셔터 버튼에 빠르게 반응하도록 1초를 잘게 쪼개서 대기
    const waitSecond = async () => {
      for (let t = 0; t < 10; t++) {
        await sleep(100)
        if (cancelled || pausedRef.current || snapRef.current) return
      }
    }

    const run = async () => {
      const shots: string[] = []
      await sleep(800)
      for (let cut = 0; cut < layout.shots; cut++) {
        // 일시정지되면 해당 컷의 카운트다운을 처음부터 다시 시작한다
        let captured = false
        while (!captured) {
          if (cancelled) return
          if (pausedRef.current) {
            setCountdown(null)
            await waitWhilePaused()
            if (cancelled) return
          }
          snapRef.current = false
          let interrupted = false
          for (let second = COUNTDOWN_SECONDS; second > 0; second--) {
            if (cancelled) return
            if (pausedRef.current) {
              interrupted = true
              break
            }
            if (snapRef.current) break // 셔터 클릭 → 즉시 촬영
            setCountdown(second)
            await waitSecond()
            if (snapRef.current && !pausedRef.current) break
          }
          if (cancelled) return
          if (interrupted || pausedRef.current) {
            setCountdown(null)
            continue
          }
          snapRef.current = false
          setCountdown(null)
          shots.push(
            captureFrame(video, layout.captureWidth, layout.captureHeight, overlays[cut]),
          )
          setTaken(cut + 1)
          setFlash(true)
          await sleep(180)
          if (cancelled) return
          setFlash(false)
          await sleep(500)
          captured = true
        }
      }
      if (!cancelled) onComplete(shots)
    }

    run()
    return () => {
      cancelled = true
    }
  }, [videoReady, onComplete, layout, overlays])

  if (error) {
    return (
      <div className="screen error-screen">
        <RetroWindow title="Notice!" className="notice-window">
          <p className="error-message">{error}</p>
          <div className="button-row">
            <button type="button" className="primary-button" onClick={retry}>
              retry
            </button>
            <button type="button" className="secondary-button" onClick={onExit}>
              home
            </button>
          </div>
        </RetroWindow>
      </div>
    )
  }

  const captureRatio = layout.captureWidth / layout.captureHeight

  return (
    <div className="screen capture-screen">
      <RetroWindow title="Say Cheese!" className="capture-window">
        <div className="progress">
          {Array.from({ length: layout.shots }, (_, i) => (
            <span key={i} className={`progress-heart${i < taken ? ' filled' : ''}`}>
              ♥
            </span>
          ))}
          <span className="progress-label">
            {taken} / {layout.shots}
          </span>
        </div>

        <div
          className="camera-frame"
          style={{
            aspectRatio: `${layout.captureWidth} / ${layout.captureHeight}`,
            width: `min(88vw, calc((100dvh - 320px) * ${captureRatio.toFixed(4)}), 800px)`,
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setVideoReady(true)}
            className="camera-video"
          />
          {layout.overlayShots && videoReady && (
            <img
              src={layout.overlayShots[Math.min(taken, layout.overlayShots.length - 1)]}
              alt=""
              aria-hidden="true"
              className="camera-overlay"
            />
          )}
          {!videoReady && !stream && (
            <p className="camera-hint">turning on the camera...</p>
          )}
          {countdown !== null && !paused && (
            <span key={`${taken}-${countdown}`} className="countdown">
              {countdown}
            </span>
          )}
          {videoReady && !paused && (
            <button
              type="button"
              className="pause-button"
              onClick={() => setPausedState(true)}
              aria-label="Pause"
            >
              ❚❚
            </button>
          )}
          {videoReady && !paused && (
            <button
              type="button"
              className="snap-button"
              onClick={() => {
                snapRef.current = true
              }}
              aria-label="Take photo now"
            >
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              >
                <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z" />
                <circle cx="12" cy="13.5" r="3.5" />
              </svg>
            </button>
          )}
          {paused && (
            <div className="pause-overlay">
              <p className="pause-title">Paused</p>
              <div className="button-row">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setPausedState(false)}
                >
                  resume
                </button>
                <button type="button" className="secondary-button" onClick={onExit}>
                  home
                </button>
              </div>
            </div>
          )}
          <div className={`flash${flash ? ' on' : ''}`} />
        </div>

        <p className="capture-hint">auto-snap when the countdown ends</p>
      </RetroWindow>
    </div>
  )
}
