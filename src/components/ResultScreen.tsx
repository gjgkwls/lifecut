import { useEffect, useState } from 'react'
import { composeStrip, downloadDataUrl } from '../utils/composeStrip'
import type { FrameOption, LayoutSpec } from '../utils/layouts'

interface Props {
  shots: string[]
  layout: LayoutSpec
  frame: FrameOption
  onRetake: () => void
}

export default function ResultScreen({ shots, layout, frame, onRetake }: Props) {
  const [stripUrl, setStripUrl] = useState<string | null>(null)
  const [mono, setMono] = useState(false)
  const [credit, setCredit] = useState(true)

  useEffect(() => {
    let cancelled = false
    // 토글 시 이전 이미지를 유지한 채 새 합성이 끝나면 교체 (깜빡임 방지)
    composeStrip(shots, layout, frame.src, mono, credit).then((url) => {
      if (!cancelled) setStripUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [shots, layout, frame, mono, credit])

  const handleDownload = () => {
    if (!stripUrl) return
    const now = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
    downloadDataUrl(stripUrl, `LifeCut_${stamp}.png`)
  }

  return (
    <div className="screen result-screen">
      <h2 className="result-title">All Done ✶</h2>
      {stripUrl ? (
        <div className="strip-wrap">
          <img src={stripUrl} alt="Your finished LifeCut" className="strip-preview" />
        </div>
      ) : (
        <p className="camera-hint">developing your photos...</p>
      )}
      <div className="tone-toggle" role="group" aria-label="Color mode">
        <button
          type="button"
          className={`tone-button tone-color${mono ? '' : ' active'}`}
          onClick={() => setMono(false)}
          aria-label="Color"
        />
        <button
          type="button"
          className={`tone-button tone-mono${mono ? ' active' : ''}`}
          onClick={() => setMono(true)}
          aria-label="Black and white"
        />
      </div>
      <button
        type="button"
        className={`credit-toggle${credit ? ' on' : ''}`}
        onClick={() => setCredit((v) => !v)}
        aria-pressed={credit}
      >
        <span className="credit-toggle-label">by.hajin</span>
        <span className="credit-toggle-track">
          <span className="credit-toggle-knob" />
        </span>
      </button>
      <div className="button-row">
        <button
          type="button"
          className="primary-button"
          onClick={handleDownload}
          disabled={!stripUrl}
        >
          save
        </button>
        <button type="button" className="secondary-button" onClick={onRetake}>
          retake
        </button>
      </div>
    </div>
  )
}
