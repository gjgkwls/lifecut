import { useEffect, useRef, useState } from 'react'
import { makeCutouts } from '../utils/cutout'
import { publishFrame, shareUrlFor } from '../utils/frameShare'
import RetroWindow from './RetroWindow'

export interface MyFrame {
  name: string
  cutouts: string[]
}

type Step = 'name' | 'upload' | 'processing' | 'preview' | 'share'

interface Props {
  existing: MyFrame | null
  onReady: (frame: MyFrame) => void
  onTryIt: () => void
  onExit: () => void
}

export default function MakeFrameScreen({ existing, onReady, onTryIt, onExit }: Props) {
  const [step, setStep] = useState<Step>(existing ? 'preview' : 'name')
  const [name, setName] = useState(existing?.name ?? '')
  const [files, setFiles] = useState<File[]>([])
  const [thumbs, setThumbs] = useState<string[]>([])
  const [cutouts, setCutouts] = useState<string[]>(existing?.cutouts ?? [])
  const [status, setStatus] = useState('')
  const [error, setError] = useState<string | null>(null)
  // 이미 발급된 공유 코드 (사진/이름이 바뀌면 초기화)
  const [shareCode, setShareCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // 드래그 정렬 상태: index = 드래그 중인 컷의 현재 위치, dy = 손가락/마우스를 따라가는 오프셋
  const [drag, setDrag] = useState<{ index: number; startY: number; dy: number } | null>(null)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    return () => {
      thumbs.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [thumbs])

  // 누끼가 이미 있으면 이름만 바꾸고 미리보기로 복귀
  const confirmName = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    setName(trimmed)
    setShareCode(null)
    if (cutouts.length) {
      onReady({ name: trimmed, cutouts })
      setStep('preview')
    } else {
      setStep('upload')
    }
  }

  const openShare = async () => {
    setError(null)
    let code = shareCode
    if (!code) {
      setSharing(true)
      try {
        code = await publishFrame(name, cutouts, setStatus)
        setShareCode(code)
      } catch {
        setError('프레임 업로드에 실패했어요 — 연결을 확인하고 다시 시도해주세요')
        return
      } finally {
        setSharing(false)
      }
    }
    setCopied(false)
    setStep('share')
  }

  const copyLink = async () => {
    if (!shareCode) return
    try {
      await navigator.clipboard.writeText(shareUrlFor(shareCode))
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('복사에 실패했어요 — 링크를 길게 눌러 복사해주세요')
    }
  }

  const handleFiles = (list: FileList | null) => {
    setError(null)
    if (!list) return
    if (list.length !== 4) {
      setFiles([])
      setThumbs([])
      setError(`사진을 꼭 4장 골라주세요 (지금 ${list.length}장이에요)`)
      return
    }
    const picked = Array.from(list)
    setFiles(picked)
    setThumbs(picked.map((f) => URL.createObjectURL(f)))
  }

  // 순서가 바뀌면 상위 상태를 갱신하고 공유 코드를 무효화한다
  const applyOrder = (next: string[]) => {
    setCutouts(next)
    setShareCode(null)
    onReady({ name, cutouts: next })
  }

  // 미리보기에서 컷 순서를 위/아래로 한 칸씩 이동
  const moveCut = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= cutouts.length) return
    const next = [...cutouts]
    ;[next[index], next[target]] = [next[target], next[index]]
    applyOrder(next)
  }

  // 마우스는 셀 아무 곳이나, 터치는 ⠿ 손잡이만 드래그 시작 (스크롤과 충돌 방지)
  const startDrag = (index: number) => (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    if (target.closest('.myframe-move')) return
    if (e.pointerType !== 'mouse' && !target.closest('.myframe-handle')) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    setDrag({ index, startY: e.clientY, dy: 0 })
  }

  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag) return
    const dy = e.clientY - drag.startY
    const cell = previewRef.current?.querySelector<HTMLElement>('.myframe-cell')
    const rowH = (cell?.offsetHeight ?? 168) + 6 // 셀 높이 + gap
    const shift = Math.round(dy / rowH)
    const target = Math.min(cutouts.length - 1, Math.max(0, drag.index + shift))
    if (target === drag.index) {
      setDrag({ ...drag, dy })
      return
    }
    const next = [...cutouts]
    const [moved] = next.splice(drag.index, 1)
    next.splice(target, 0, moved)
    applyOrder(next)
    // 재배치된 만큼 기준점을 옮겨서 드래그가 끊기지 않게 한다
    setDrag({
      index: target,
      startY: drag.startY + (target - drag.index) * rowH,
      dy: dy - (target - drag.index) * rowH,
    })
  }

  const endDrag = () => setDrag(null)

  const startCutout = async () => {
    setStep('processing')
    setError(null)
    try {
      const result = await makeCutouts(files, setStatus)
      setCutouts(result)
      setShareCode(null)
      onReady({ name, cutouts: result })
      setStep('preview')
    } catch (e) {
      setError(e instanceof Error ? e.message : '문제가 생겼어요 — 다시 시도해주세요')
      setStep('upload')
    }
  }

  return (
    <div className="screen">
      <RetroWindow title="Make my frame" className="makeframe-window">
        {step === 'name' && (
          <>
            <p className="makeframe-lead">
              내 사진 4장을 올리면, 친구들이
              <br />
              나와 함께 네컷을 찍을 수 있어요!
            </p>
            <label className="makeframe-name-label" htmlFor="frame-name">
              이름을 알려주세요!
            </label>
            <input
              id="frame-name"
              className="makeframe-input"
              type="text"
              value={name}
              maxLength={14}
              placeholder="이름"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmName()
              }}
            />
            {name.trim() && (
              <p className="makeframe-hint">→ "4 cuts with {name.trim()}"</p>
            )}
            <button
              type="button"
              className="primary-button"
              disabled={!name.trim()}
              onClick={confirmName}
            >
              다음
            </button>
            <button type="button" className="back-button" onClick={onExit}>
              ← back
            </button>
          </>
        )}

        {step === 'upload' && (
          <>
            <p className="makeframe-lead">
              내가 나온 사진 4장을 골라주세요 —
              <br />
              자동으로 누끼를 따드릴게요 ✂️
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => handleFiles(e.target.files)}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => fileInputRef.current?.click()}
            >
              {files.length === 4 ? '다시 고르기' : '사진 4장 고르기'}
            </button>
            {error && <p className="makeframe-error">{error}</p>}
            {thumbs.length === 4 && (
              <div className="makeframe-thumbs">
                {thumbs.map((src, i) => (
                  <div key={src} className="makeframe-thumb">
                    <img src={src} alt={`photo ${i + 1}`} />
                    <span className="makeframe-thumb-num">{i + 1}</span>
                  </div>
                ))}
              </div>
            )}
            {files.length === 4 && (
              <button type="button" className="primary-button" onClick={startCutout}>
                누끼 따기
              </button>
            )}
            <button
              type="button"
              className="back-button"
              onClick={() => setStep(cutouts.length ? 'preview' : 'name')}
            >
              ← back
            </button>
          </>
        )}

        {step === 'processing' && (
          <>
            <span className="makeframe-scissors" aria-hidden="true">
              ✂️
            </span>
            <p className="makeframe-status">{status}</p>
            <p className="makeframe-hint">처음에는 시간이 조금 걸릴 수 있어요</p>
          </>
        )}

        {step === 'preview' && (
          <>
            <p className="makeframe-lead">내 프레임이 완성됐어요 — "4 cuts with {name}"</p>
            <div className="myframe-preview" ref={previewRef}>
              {cutouts.map((src, i) => (
                <div
                  key={src}
                  className={`myframe-cell${drag?.index === i ? ' dragging' : ''}`}
                  style={drag?.index === i ? { transform: `translateY(${drag.dy}px)` } : undefined}
                  onPointerDown={startDrag(i)}
                  onPointerMove={onDragMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  <img src={src} alt={`cutout ${i + 1}`} draggable={false} />
                  <span className="myframe-cell-num">{i + 1}</span>
                  <span className="myframe-cell-controls">
                    <button
                      type="button"
                      className="myframe-move"
                      disabled={i === 0}
                      onClick={() => moveCut(i, -1)}
                      aria-label={`컷 ${i + 1} 위로 이동`}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      className="myframe-handle"
                      aria-label={`컷 ${i + 1} 드래그로 이동`}
                    >
                      ⠿
                    </button>
                    <button
                      type="button"
                      className="myframe-move"
                      disabled={i === cutouts.length - 1}
                      onClick={() => moveCut(i, 1)}
                      aria-label={`컷 ${i + 1} 아래로 이동`}
                    >
                      ▼
                    </button>
                  </span>
                </div>
              ))}
            </div>
            {sharing && <p className="makeframe-status">{status}</p>}
            {error && <p className="makeframe-error">{error}</p>}
            <div className="button-row">
              <button
                type="button"
                className="primary-button"
                disabled={sharing}
                onClick={openShare}
              >
                {sharing ? '업로드 중...' : '프레임 공유하기 💌'}
              </button>
              <button type="button" className="secondary-button" onClick={onTryIt}>
                바로 찍어보기
              </button>
            </div>
            <div className="button-row">
              <button type="button" className="back-button" onClick={() => setStep('upload')}>
                ↺ 사진 다시 고르기
              </button>
              <button type="button" className="back-button" onClick={() => setStep('name')}>
                ✎ 이름 바꾸기
              </button>
              <button type="button" className="back-button" onClick={onExit}>
                ← home
              </button>
            </div>
          </>
        )}

        {step === 'share' && shareCode && (
          <>
            <p className="makeframe-lead">
              프레임이 준비됐어요!
              <br />이 링크를 연 친구는
              <br />
              "4 cuts with {name}" 네컷을 찍을 수 있어요 📸
            </p>
            <input
              readOnly
              className="makeframe-input share-link-input"
              value={shareUrlFor(shareCode)}
              onFocus={(e) => e.target.select()}
            />
            {error && <p className="makeframe-error">{error}</p>}
            <div className="button-row">
              <button type="button" className="primary-button" onClick={copyLink}>
                {copied ? '복사 완료!' : '링크 복사'}
              </button>
              {typeof navigator.share === 'function' && (
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    navigator
                      .share({
                        title: 'LifeCut',
                        text: `4 cuts with ${name}!`,
                        url: shareUrlFor(shareCode),
                      })
                      .catch(() => {})
                  }}
                >
                  공유하기...
                </button>
              )}
            </div>
            <button type="button" className="back-button" onClick={() => setStep('preview')}>
              ← back
            </button>
          </>
        )}
      </RetroWindow>
    </div>
  )
}
