import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useAuth } from '../../src/hooks/useAuth'

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
      signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
      verifyOtp: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token', user: { id: 'user-123', email: 'test@example.com' } } },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'user-123', email: 'test@example.com', role: 'user', created_at: '2026-01-01T00:00:00Z' },
            error: null,
          }),
        }),
      }),
    }),
  },
}))

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('inizia con session null e loading true', () => {
    const { result } = renderHook(() => useAuth())
    expect(result.current.session).toBeNull()
    expect(result.current.loading).toBe(true)
  })

  it('sendOtp chiama supabase signInWithOtp con email', async () => {
    const { result } = renderHook(() => useAuth())
    const { supabase } = await import('../../src/lib/supabase')

    await act(async () => {
      await result.current.sendOtp('test@example.com')
    })

    expect(supabase.auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
    })
  })

  it('verifyOtp chiama supabase verifyOtp con email e token', async () => {
    const { result } = renderHook(() => useAuth())
    const { supabase } = await import('../../src/lib/supabase')

    await act(async () => {
      await result.current.verifyOtp('test@example.com', '123456')
    })

    expect(supabase.auth.verifyOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      token: '123456',
      type: 'email',
    })
  })
})
