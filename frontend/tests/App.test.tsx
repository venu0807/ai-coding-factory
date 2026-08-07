import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../src/App';

describe('App', () => {
  it('renders without crashing', () => {
    vi.spyOn(global, 'fetch').mockResolvedValue(new Response('[]', { status: 200 }));
    render(<App />);
  });
});
