import RetroWindow from './RetroWindow'
import { FRAMES, type FrameOption } from '../utils/layouts'

interface Props {
  onSelect: (frame: FrameOption) => void
  onBack: () => void
}

export default function FrameSelectScreen({ onSelect, onBack }: Props) {
  return (
    <div className="screen">
      <RetroWindow title="Pick a Frame" className="select-window">
        <div className="frame-grid">
          {FRAMES.map((frame) => (
            <button
              key={frame.id}
              type="button"
              className="frame-card"
              onClick={() => onSelect(frame)}
            >
              <img src={frame.src} alt={frame.name} className="frame-thumb" />
            </button>
          ))}
        </div>
        <button type="button" className="back-button" onClick={onBack}>
          ← back
        </button>
      </RetroWindow>
    </div>
  )
}
