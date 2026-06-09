import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import OtpForm from '../../src/components/OtpForm'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

describe('OtpForm', () => {
  it('mostra campo email inizialmente', () => {
    render(<OtpForm onSuccess={vi.fn()} />)
    expect(screen.getByPlaceholderText(/email/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /invia codice/i })).toBeInTheDocument()
  })

  it('dopo invio email mostra campo OTP', async () => {
    const sendOtp = vi.fn().mockResolvedValue({ error: null })
    render(<OtpForm onSuccess={vi.fn()} sendOtp={sendOtp} />)

    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /invia codice/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/codice/i)).toBeInTheDocument()
    })
  })

  it('mostra errore se verifyOtp fallisce', async () => {
    const sendOtp = vi.fn().mockResolvedValue({ error: null })
    const verifyOtp = vi.fn().mockResolvedValue({ error: new Error('Token non valido') })
    render(<OtpForm onSuccess={vi.fn()} sendOtp={sendOtp} verifyOtp={verifyOtp} />)

    // Submit email
    fireEvent.change(screen.getByPlaceholderText(/email/i), {
      target: { value: 'test@example.com' },
    })
    fireEvent.click(screen.getByRole('button', { name: /invia codice/i }))

    await waitFor(() => screen.getByPlaceholderText(/codice/i))

    // Submit OTP
    fireEvent.change(screen.getByPlaceholderText(/codice/i), {
      target: { value: '999999' },
    })
    fireEvent.click(screen.getByRole('button', { name: /verifica/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })
})
