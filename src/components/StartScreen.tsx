import RetroWindow from './RetroWindow'

interface Props {
  inviteName?: string | null
  inviteFailed?: boolean
  onStart: () => void
  /** 초대 링크로 들어왔지만 일반 네컷을 찍고 싶을 때 */
  onNormalStart?: () => void
  onMakeFrame: () => void
}

export default function StartScreen({
  inviteName,
  inviteFailed,
  onStart,
  onNormalStart,
  onMakeFrame,
}: Props) {
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
        {inviteName && (
          <div className="invite-note">
            <span className="invite-note-line">💌 you're invited!</span>
          </div>
        )}
        {inviteFailed && (
          <p className="invite-error">couldn't load your friend's frame :(</p>
        )}
        {inviteName ? (
          <>
            <button type="button" className="start-button invite-start" onClick={onStart}>
              <strong>{inviteName}</strong> frame start
            </button>
            <button type="button" className="makeframe-button" onClick={onMakeFrame}>
              🙎🏻 make my frame
            </button>
            {onNormalStart && (
              <button type="button" className="normal-cut-button" onClick={onNormalStart}>
                그냥 네컷만 찍을래요 →
              </button>
            )}
          </>
        ) : (
          <>
            <button type="button" className="start-button" onClick={onStart}>
              start
            </button>
            <button type="button" className="makeframe-button" onClick={onMakeFrame}>
              🙎🏻 make my frame
            </button>
          </>
        )}
      </RetroWindow>
    </div>
  )
}
