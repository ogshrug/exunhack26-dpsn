export default function Eye({ zoom = false, zoomDelay, className = 'w-72 md:w-96' }: { zoom?: boolean; zoomDelay?: string; className?: string }) {
  return (
    <svg viewBox="0 0 200 100" className={`${className} ${zoom || zoomDelay ? 'eye-zoom' : ''}`} style={zoomDelay ? { animationDelay: zoomDelay } : undefined} aria-hidden="true">
      <defs><clipPath id="eye-clip"><path d="M10 50 Q100 -10 190 50 Q100 110 10 50Z" /></clipPath></defs>
      <path d="M10 50 Q100 -10 190 50 Q100 110 10 50Z" fill="#f2eef5" stroke="#df2935" strokeWidth="3" />
      <g clipPath="url(#eye-clip)">
        <g className="eye-iris">
          <circle cx="100" cy="50" r="27" fill="#df2935" />
          <circle cx="100" cy="50" r="12" fill="#000" />
          <circle cx="93" cy="43" r="3.5" fill="#fff" opacity=".8" />
        </g>
      </g>
    </svg>
  )
}
