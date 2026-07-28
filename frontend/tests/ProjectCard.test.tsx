import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProjectCard from '../src/components/ProjectCard';

describe('ProjectCard', () => {
  it('renders project name and link', () => {
    const project = { id: 'abc', name: 'Test Proj', description: 'A test', created_at: '2024-01-01T00:00:00Z' };
    render(
      <BrowserRouter>
        <ProjectCard project={project} />
      </BrowserRouter>
    );
    expect(screen.getByText('Test Proj')).toBeDefined();
    expect(screen.getByText('A test')).toBeDefined();
  });

  it('handles missing description', () => {
    const project = { id: 'abc', name: 'No Desc', created_at: '2024-01-01T00:00:00Z' };
    render(
      <BrowserRouter>
        <ProjectCard project={project} />
      </BrowserRouter>
    );
    expect(screen.getByText('No Desc')).toBeDefined();
  });
});
