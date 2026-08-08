import RetroWindow from './RetroWindow'

interface Props {
  onStart: () => void
}

export default function StartScreen({ onStart }: Props) {
  return (
    <div className="screen start-screen">
      <RetroWindow title="LifeCut" className="start-window">
        <div className="memo">
          <p className="hero-line">today's you,</p>
          <h1 className="hero-title">LifeCut</h1>
          <p className="hero-sub">
            capture your special moments,
            <br />
            vintage style.
          </p>
        </div>
        <button type="button" className="start-button" onClick={onStart}>
          start
        </button>
      </RetroWindow>
    </div>
  )
}
