// A-RiA brand name: dash and round dot on i in brand blue
export default function ARiALogo({ className = '', style = {} }) {
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'baseline', ...style }}>
      {'A'}
      <span style={{ color: '#1D6FDB' }}>{'-'}</span>
      {'R'}
      <span style={{ position: 'relative', display: 'inline-block', lineHeight: 'inherit' }}>
        ı
        <span style={{
          position: 'absolute',
          left: '50%',
          top: '0.05em',
          transform: 'translateX(-50%)',
          width: '0.2em',
          height: '0.2em',
          borderRadius: '50%',
          background: '#1D6FDB',
          display: 'block',
          pointerEvents: 'none',
        }} />
      </span>
      {'A'}
    </span>
  )
}
