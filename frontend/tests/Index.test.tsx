import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Index from '../src/pages/Index';
import { getSupabase } from '../src/lib/supabase';

const mockFetch = vi.fn();
global.fetch = mockFetch;
const emptyResponse = { json: async () => ({ data: [], total: 0 }) };
const oneProjectResponse = {
  json: async () => ({
    data: [{ id: "p1", name: "Test Project", description: "Test", status: "idle", created_at: "2024-01-01" }],
    total: 1,
  }),
};
const manyProjectsResponse = {
  json: async () => ({
    data: Array.from({ length: 20 }, (_, i) => ({
      id: `p${i}`, name: `Project ${i}`, description: `Desc ${i}`, status: "idle", created_at: "2024-01-01",
    })),
    total: 25,
  }),
};

beforeEach(() => {
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(emptyResponse);
  vi.mocked(getSupabase).mockResolvedValue({
    channel: vi.fn(() => ({ on: vi.fn().mockReturnThis(), subscribe: vi.fn(() => ({ unsubscribe: vi.fn() })) })),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }) },
  } as any);
});

describe('Index page', () => {
  it('renders heading', async () => {
    mockFetch.mockResolvedValue(emptyResponse);
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(await screen.findByText('AI Coding Factory')).toBeDefined();
  });

  it('renders subtitle', async () => {
    mockFetch.mockResolvedValue(emptyResponse);
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(await screen.findByText(/Describe your idea/)).toBeDefined();
  });

  it('hides load more when all results shown', async () => {
    mockFetch.mockResolvedValue(oneProjectResponse);
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    await new Promise((r) => setTimeout(r, 100));
    expect(screen.queryByText(/Load more/)).toBeNull();
  });
});
