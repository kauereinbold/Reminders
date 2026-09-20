import { fireEvent, render, screen } from '@testing-library/react';

import { EmptyState } from './index';

describe('EmptyState', () => {
  it('shows the copy of the selected view', () => {
    render(<EmptyState view="Today" query="" onCreate={jest.fn()} />);

    expect(screen.getByText('Today is clear')).toBeInTheDocument();
    expect(
      screen.getByText('No reminders due today, check Upcoming to get ahead.'),
    ).toBeInTheDocument();
  });

  it.each([
    ['All' as const, 'Nothing on the list'],
    ['Upcoming' as const, 'Nothing scheduled'],
    ['Done' as const, 'Nothing completed yet'],
  ])('shows the %s copy', (view, title) => {
    render(<EmptyState view={view} query="" onCreate={jest.fn()} />);

    expect(screen.getByText(title)).toBeInTheDocument();
  });

  it('shows the search copy with the query, whatever the view', () => {
    render(<EmptyState view="Done" query="  notary  " onCreate={jest.fn()} />);

    expect(screen.getByText('No matches')).toBeInTheDocument();
    expect(
      screen.getByText('No reminder matches "notary".'),
    ).toBeInTheDocument();
  });

  it('calls onCreate from the button', () => {
    const onCreate = jest.fn();
    render(<EmptyState view="All" query="" onCreate={onCreate} />);

    fireEvent.click(screen.getByRole('button', { name: 'Add a reminder' }));

    expect(onCreate).toHaveBeenCalled();
  });
});
