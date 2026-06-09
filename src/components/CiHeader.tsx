import { Link, useNavigate } from 'react-router-dom'

interface CiHeaderProps {
  isLoggedIn?: boolean
  onLogout?: () => void
}

export default function CiHeader({ isLoggedIn = false, onLogout }: CiHeaderProps) {
  const navigate = useNavigate()

  return (
    <header style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      height: 'var(--topbar-h)',
      background: 'var(--ci-graphite)',
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    }}>
      <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0', textDecoration: 'none' }}>
        <span style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--ci-white)',
          letterSpacing: '0.06em',
        }}>CREA</span>
        <span style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700,
          fontSize: '1.1rem',
          color: 'var(--ci-teal)',
          letterSpacing: '0.06em',
        }}>INFISSI</span>
        <span style={{
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 400,
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.12em',
          marginLeft: '0.75rem',
          textTransform: 'uppercase',
        }}>Configuratore</span>
      </Link>

      <nav style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
        <Link
          to="/preventivi"
          style={{
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 500,
            fontSize: '0.8rem',
            color: 'rgba(255,255,255,0.8)',
            textDecoration: 'none',
            letterSpacing: '0.04em',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--ci-teal)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
        >
          I miei preventivi
        </Link>

        {isLoggedIn ? (
          <button
            onClick={onLogout}
            className="ci-btn ci-btn--outline ci-btn--sm"
            style={{ borderColor: 'rgba(255,255,255,0.3)', color: 'rgba(255,255,255,0.8)' }}
          >
            Esci
          </button>
        ) : (
          <button
            onClick={() => navigate('/login')}
            className="ci-btn ci-btn--teal ci-btn--sm"
          >
            Accedi
          </button>
        )}
      </nav>
    </header>
  )
}
