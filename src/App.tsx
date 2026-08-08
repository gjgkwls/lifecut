import { useCallback, useState } from 'react'
import StartScreen from './components/StartScreen'
import CountSelectScreen from './components/CountSelectScreen'
import FrameSelectScreen from './components/FrameSelectScreen'
import CaptureScreen from './components/CaptureScreen'
import ResultScreen from './components/ResultScreen'
import type { FrameOption, LayoutSpec } from './utils/layouts'
import './App.css'

type Screen = 'start' | 'count' | 'frame' | 'capture' | 'result'

const STICKERS = [
  { emoji: '🌼', top: '7%', left: '8%', size: 34, delay: '0s' },
  { emoji: '📷', top: '14%', left: '84%', size: 36, delay: '0.6s' },
  { emoji: '⭐', top: '30%', left: '5%', size: 28, delay: '1.2s' },
  { emoji: '🧸', top: '72%', left: '9%', size: 38, delay: '0.3s' },
  { emoji: '🎞️', top: '58%', left: '90%', size: 30, delay: '1.6s' },
  { emoji: '✉️', top: '84%', left: '80%', size: 32, delay: '0.9s' },
  { emoji: '🌿', top: '46%', left: '93%', size: 28, delay: '2s' },
  { emoji: '☕', top: '88%', left: '16%', size: 30, delay: '1.4s' },
  { emoji: '🌷', top: '10%', left: '38%', size: 26, delay: '0.4s' },
  { emoji: '⭐', top: '68%', left: '73%', size: 22, delay: '2.4s' },
]

export default function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [layout, setLayout] = useState<LayoutSpec | null>(null)
  const [frame, setFrame] = useState<FrameOption | null>(null)
  const [shots, setShots] = useState<string[]>([])

  const handleStart = useCallback(() => setScreen('count'), [])

  const handleLayoutSelect = useCallback((selected: LayoutSpec) => {
    setLayout(selected)
    setScreen('frame')
  }, [])

  const handleFrameSelect = useCallback((selected: FrameOption) => {
    setFrame(selected)
    setScreen('capture')
  }, [])

  const handleComplete = useCallback((taken: string[]) => {
    setShots(taken)
    setScreen('result')
  }, [])

  const handleRetake = useCallback(() => {
    setShots([])
    setLayout(null)
    setFrame(null)
    setScreen('start')
  }, [])

  return (
    <main className="app">
      <div className="sticker-layer" aria-hidden="true">
        {STICKERS.map((s, i) => (
          <span
            key={i}
            className="sticker"
            style={{
              top: s.top,
              left: s.left,
              fontSize: s.size,
              animationDelay: s.delay,
            }}
          >
            {s.emoji}
          </span>
        ))}
      </div>
      {screen === 'start' && <StartScreen onStart={handleStart} />}
      {screen === 'count' && (
        <CountSelectScreen
          onSelect={handleLayoutSelect}
          onBack={() => setScreen('start')}
        />
      )}
      {screen === 'frame' && (
        <FrameSelectScreen
          onSelect={handleFrameSelect}
          onBack={() => setScreen('count')}
        />
      )}
      {screen === 'capture' && layout && (
        <CaptureScreen layout={layout} onComplete={handleComplete} onExit={handleRetake} />
      )}
      {screen === 'result' && layout && frame && (
        <ResultScreen
          shots={shots}
          layout={layout}
          frame={frame}
          onRetake={handleRetake}
        />
      )}
      <p className="site-credit">by.hajin</p>
    </main>
  )
}
