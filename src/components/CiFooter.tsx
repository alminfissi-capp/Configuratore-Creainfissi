export default function CiFooter() {
  return (
    <footer style={{
      background: 'var(--ci-graphite)',
      color: 'rgba(255,255,255,0.5)',
      padding: '1.25rem 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: '0.75rem',
    }}>
      <p style={{
        fontFamily: 'Montserrat, sans-serif',
        fontSize: '0.75rem',
        margin: 0,
      }}>
        © {new Date().getFullYear()} CreaInfissi Srl — Tutti i diritti riservati
      </p>
      <a
        href="https://creainfissi.it"
        style={{
          fontFamily: 'Montserrat, sans-serif',
          fontSize: '0.75rem',
          color: 'var(--ci-teal)',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
        }}
      >
        Torna allo store →
      </a>
    </footer>
  )
}
