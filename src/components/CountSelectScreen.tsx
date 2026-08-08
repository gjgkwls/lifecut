import RetroWindow from './RetroWindow'
import { LAYOUTS, type LayoutSpec } from '../utils/layouts'

interface Props {
  onSelect: (layout: LayoutSpec) => void
  onBack: () => void
}

export default function CountSelectScreen({ onSelect, onBack }: Props) {
  return (
    <div className="screen">
      <RetroWindow title="How many cuts?" className="select-window">
        <div className="option-grid">
          {LAYOUTS.map((layout) => (
            <button
              key={layout.id}
              type="button"
              className="option-card"
              onClick={() => onSelect(layout)}
            >
              <span className={`mini-frame mini-${layout.id}`}>
                {Array.from({ length: layout.shots }, (_, i) => (
                  <span key={i} className="mini-cell" />
                ))}
              </span>
              <span className="option-label">{layout.label}</span>
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
