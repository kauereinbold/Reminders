import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('@/app/api', () => ({ IS_MOCK_API: true }));

// eslint-disable-next-line import/first
import { AppHeader } from './index';

describe('AppHeader demo badge', () => {
  const props = {
    query: '',
    onQueryChange: jest.fn(),
    onCreate: jest.fn(),
    view: 'All' as const,
    counts: { All: 0, Today: 0, Upcoming: 0, Done: 0 },
    onSelectView: jest.fn(),
    progress: { pct: 0, caption: '0 of 0 done in the next 7 days' },
  };

  it('shows the demo badge when the mock API is enabled', () => {
    render(<AppHeader {...props} />);

    expect(screen.getByText('Demo data')).toBeInTheDocument();
  });
});
