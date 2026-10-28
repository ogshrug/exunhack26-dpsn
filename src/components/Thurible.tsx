const LINE = '#a45bd0'
const FILL = '#170a22'

export default function Thurible({ className = '', chain = false }: { className?: string; chain?: boolean }) {
  const viewBox = chain ? '0 0 120 252' : '22 111 76 140'
  return (
    <svg viewBox={viewBox} className={className} fill="none" aria-hidden="true"
      stroke={LINE} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round">
      {chain && (
        <>
          <circle cx="60" cy="9" r="6" />
          <path d="M60 15V112" strokeDasharray="6 3.5" />
        </>
      )}

      <path d="M44 112h32l3 7H41z" fill={FILL} />
      <path d="M45 119 33 190M75 119 87 190M60 119V146" strokeDasharray="5 3" />

      <circle cx="60" cy="149" r="4" fill="#df2935" stroke="#df2935" />

      <path d="M29 192C29 168 44 156 60 154c16 2 31 14 31 38z" fill={FILL} />
      <path d="M43 189v-9a4 4 0 0 1 8 0v9M56 189v-14a4 4 0 0 1 8 0v14M69 189v-9a4 4 0 0 1 8 0v9" strokeWidth="2" />

      <path d="M25 192h70v7H25z" fill={FILL} />

      <path d="M29 199h62c0 24-14 40-31 42-17-2-31-18-31-42z" fill={FILL} />
      <path d="M33 211h54" strokeWidth="2" />

      <path d="M52 241h16l4 8H48z" fill={FILL} />
    </svg>
  )
}
