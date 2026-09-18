import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';

import { AppHeader } from './index';

const baseProps = {
  query: '',
  onQueryChange: jest.fn(),
  onCreate: jest.fn(),
  view: 'All' as const,
  counts: { All: 5, Today: 1, Upcoming: 2, Done: 2 },
  onSelectView: jest.fn(),
  progress: { pct: 40, caption: '2 of 5 done in the next 7 days' },
};

describe('AppHeader', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders title, today date, search, and create button', () => {
    render(<AppHeader {...baseProps} />);

    const todayLabel = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    expect(screen.getByText('Reminders')).toBeInTheDocument();
    expect(screen.getByText(todayLabel)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search reminders')).toBeInTheDocument();
    expect(screen.getByText('New reminder')).toBeInTheDocument();
    expect(screen.queryByText('Demo data')).not.toBeInTheDocument();
  });

  it('reports search input changes', () => {
    render(<AppHeader {...baseProps} />);

    fireEvent.change(screen.getByPlaceholderText('Search reminders'), {
      target: { value: 'milk' },
    });

    expect(baseProps.onQueryChange).toHaveBeenCalledWith('milk');
  });

  it('calls onCreate when the new reminder button is clicked', () => {
    render(<AppHeader {...baseProps} />);

    fireEvent.click(screen.getByText('New reminder'));

    expect(baseProps.onCreate).toHaveBeenCalled();
  });

  it('renders filter chips with counts and marks the active one', () => {
    render(<AppHeader {...baseProps} view="Today" />);

    const active = screen.getByRole('button', { current: true });
    expect(active).toHaveTextContent('Today');
    expect(screen.getByRole('button', { name: 'All 5' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done 2' })).toBeInTheDocument();
  });

  it('calls onSelectView when a chip is clicked', () => {
    render(<AppHeader {...baseProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Upcoming 2' }));

    expect(baseProps.onSelectView).toHaveBeenCalledWith('Upcoming');
  });

  it('renders the mobile progress strip', () => {
    render(<AppHeader {...baseProps} />);

    expect(screen.getByText('40%')).toBeInTheDocument();
    expect(
      screen.getByText('2 of 5 done in the next 7 days'),
    ).toBeInTheDocument();
  });

  it('calls onCreate from the FAB', () => {
    render(<AppHeader {...baseProps} />);

    fireEvent.click(screen.getByLabelText('New reminder'));

    expect(baseProps.onCreate).toHaveBeenCalled();
  });
});
