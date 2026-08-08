import type { ReactNode } from 'react'

interface Props {
  title: string
  children: ReactNode
  className?: string
}

/** 빈티지 브라우저 창 스타일 프레임 (신호등 + 타이틀바) */
export default function RetroWindow({ title, children, className }: Props) {
  return (
    <div className={`retro-window${className ? ` ${className}` : ''}`}>
      <div className="retro-titlebar">
        <span className="traffic-lights">
          <i className="light light-red" />
          <i className="light light-yellow" />
          <i className="light light-green" />
        </span>
        <span className="retro-title">{title}</span>
        <span className="retro-controls">
          <i>─</i>
          <i>▢</i>
          <i>✕</i>
        </span>
      </div>
      <div className="retro-body">{children}</div>
    </div>
  )
}
