export default function ARiALogo({ className = '', style = {} }) {
  return (
    <span className={className} style={{ letterSpacing: 'inherit', ...style }}>
      A<span style={{ color: '#1D6FDB' }}>-</span>R
      <span style={{ position: 'relative', display: 'inline-block' }}>
        ı
        <span style={{
          position: 'absolute',
          left: '50%',
          top: '0.08em',
          transform: 'translateX(-50%)',
          width: '0.18em',
          height: '0.18em',
          borderRadius: '50%',
          background: '#1D6FDB',
          display: 'block',
          pointerEvents: 'none',
        }} />
      </span>
      A
    </span>
  )
}
