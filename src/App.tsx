import { BrowserRouter } from 'react-router-dom'
import CiHeader from './components/CiHeader'
import CiFooter from './components/CiFooter'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: 'var(--ci-bg)', display: 'flex', flexDirection: 'column' }}>
        <CiHeader />
        <main style={{ flex: 1, paddingTop: 'var(--topbar-h)' }}>
          <div style={{ padding: '2rem 1.5rem', textAlign: 'center', color: 'var(--ci-text-muted)' }}>
            CreaInfissi Configuratore — in costruzione
          </div>
        </main>
        <CiFooter />
      </div>
    </BrowserRouter>
  )
}
