import '@testing-library/jest-dom';

const mockClient = {
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },
};

vi.mock('../src/lib/supabase', () => ({
  getSupabase: vi.fn().mockResolvedValue(mockClient),
  getSupabaseError: vi.fn().mockReturnValue(null),
  authedFetch: vi.fn().mockResolvedValue(new Response('[]', { status: 200 })),
  API_BASE: 'http://localhost:8000',
}));
