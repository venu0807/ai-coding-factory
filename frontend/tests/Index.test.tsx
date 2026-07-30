import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Index from '../src/pages/Index';

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;
const emptyResponse = { json: async () => ({ data: [], total: 0 }) };

describe('Index page', () => {
  it('renders heading', () => {
    mockFetch.mockResolvedValueOnce(emptyResponse);
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(screen.getByText('AI Coding Factory')).toBeDefined();
  });

  it('renders subtitle', () => {
    mockFetch.mockResolvedValueOnce(emptyResponse);
    render(
      <MemoryRouter>
        <Index />
      </MemoryRouter>
    );
    expect(screen.getByText(/Describe your idea/)).toBeDefined();
  });
});
