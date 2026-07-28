import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Index from '../src/pages/Index';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Index page', () => {
  it('renders heading', () => {
    mockFetch.mockResolvedValueOnce({ json: async () => [] });
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(screen.getByText('AI Coding Factory')).toBeDefined();
  });

  it('renders subtitle', () => {
    mockFetch.mockResolvedValueOnce({ json: async () => [] });
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(screen.getByText(/Describe your idea/)).toBeDefined();
  });
});
