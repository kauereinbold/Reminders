import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import RemindersList from './page';
import {
  mockCreateMutateAsync,
  mockDeleteMutateAsync,
  mockQueryClient,
  mockReminders,
  mockUpdateMutateAsync,
} from '@/app/util/testMocks';

jest.mock('@/app/api', require('@/app/util/testMocks').jestFunctionsMock['@/app/api']);
jest.mock(
  '@/app/hooks',
  require('@/app/util/testMocks').jestFunctionsMock['@/app/hooks'],
);

describe('RemindersList', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders reminders grouped with section headers', () => {
    render(<RemindersList />);

    expect(screen.getByText('New reminder')).toBeInTheDocument();

    // Mock dates are in the past: open reminder is Overdue, done one is Done.
    expect(
      screen.getByRole('heading', { name: 'Overdue' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument();

    mockReminders.forEach(mockReminder => {
      expect(screen.getByText(mockReminder.title)).toBeInTheDocument();
      expect(screen.getByText(mockReminder.description)).toBeInTheDocument();
    });
  });

  it('renders sidebar nav with counts and week progress', () => {
    render(<RemindersList />);

    // The mobile chips mirror the nav labels, so scope to the sidebar.
    const sidebar = within(screen.getByRole('complementary'));

    // 2 reminders total, 1 done, both past dates: 1 overdue.
    const allNav = sidebar.getByRole('button', { name: 'All 2' });
    expect(allNav).toHaveAttribute('aria-current', 'true');
    expect(sidebar.getByRole('button', { name: 'Done 1' })).toBeInTheDocument();
    expect(sidebar.getByText('This week')).toBeInTheDocument();
    expect(sidebar.getByText('50%')).toBeInTheDocument();
    expect(sidebar.getByText('1 reminder is overdue')).toBeInTheDocument();
  });

  it('moves the active state when a view is selected', () => {
    render(<RemindersList />);

    const sidebar = within(screen.getByRole('complementary'));

    fireEvent.click(sidebar.getByRole('button', { name: 'Upcoming 0' }));

    expect(
      sidebar.getByRole('button', { name: 'Upcoming 0' }),
    ).toHaveAttribute('aria-current', 'true');
    expect(sidebar.getByRole('button', { name: 'All 2' })).not.toHaveAttribute(
      'aria-current',
    );
  });

  it('filters the list by the selected view', () => {
    render(<RemindersList />);

    const sidebar = within(screen.getByRole('complementary'));

    fireEvent.click(sidebar.getByRole('button', { name: 'Done 1' }));

    expect(screen.getByText('Test Title 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Title 2')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Overdue' }),
    ).not.toBeInTheDocument();

    // Sidebar counts stay unfiltered.
    expect(sidebar.getByRole('button', { name: 'All 2' })).toBeInTheDocument();
  });

  it('renders mobile chips mirroring the nav and filters from them', () => {
    render(<RemindersList />);

    // Chips live inside the sticky header (banner role).
    const header = within(screen.getByRole('banner'));

    const allChip = header.getByRole('button', { name: 'All 2' });
    expect(allChip).toHaveAttribute('aria-current', 'true');

    fireEvent.click(header.getByRole('button', { name: 'Done 1' }));

    expect(
      header.getByRole('button', { name: 'Done 1' }),
    ).toHaveAttribute('aria-current', 'true');
    expect(screen.getByText('Test Title 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Title 2')).not.toBeInTheDocument();
  });

  it('opens the create sheet from the mobile FAB', () => {
    render(<RemindersList />);

    fireEvent.click(screen.getByLabelText('New reminder'));

    expect(
      screen.getByRole('dialog', { name: 'New reminder' }),
    ).toBeInTheDocument();
  });

  it('filters the list by search query on title and description', () => {
    render(<RemindersList />);

    const search = screen.getByPlaceholderText('Search reminders');

    fireEvent.change(search, { target: { value: 'title 2' } });
    expect(screen.getByText('Test Title 2')).toBeInTheDocument();
    expect(screen.queryByText('Test Title 1')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'DESCRIPTION 1' } });
    expect(screen.getByText('Test Title 1')).toBeInTheDocument();
    expect(screen.queryByText('Test Title 2')).not.toBeInTheDocument();

    fireEvent.change(search, { target: { value: 'nothing' } });
    expect(screen.queryByRole('article')).not.toBeInTheDocument();
  });

  it('shows the search empty state when nothing matches', () => {
    render(<RemindersList />);

    fireEvent.change(screen.getByPlaceholderText('Search reminders'), {
      target: { value: 'nothing' },
    });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText('No matches')).toBeInTheDocument();
    expect(
      screen.getByText('No reminder matches "nothing".'),
    ).toBeInTheDocument();
  });

  it('shows the view empty state and creates from it', () => {
    render(<RemindersList />);

    const sidebar = within(screen.getByRole('complementary'));
    fireEvent.click(sidebar.getByRole('button', { name: 'Upcoming 0' }));

    expect(screen.getByText('Nothing scheduled')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Add a reminder' }));

    expect(
      screen.getByRole('dialog', { name: 'New reminder' }),
    ).toBeInTheDocument();
  });

  it('opens the create sheet from the New reminder button', () => {
    render(<RemindersList />);

    fireEvent.click(screen.getByText('New reminder'));

    expect(screen.getByRole('dialog', { name: 'New reminder' })).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveValue('');
  });

  it('creates a reminder from the sheet and refreshes the list', async () => {
    render(<RemindersList />);

    fireEvent.click(screen.getByText('New reminder'));
    fireEvent.change(screen.getByTestId('title'), {
      target: { value: 'Buy milk' },
    });
    fireEvent.click(screen.getByTestId('save-button'));

    await waitFor(() => {
      expect(mockCreateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Buy milk' }),
      );
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['reminders'],
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('keeps the sheet open and shows the error when saving fails', async () => {
    mockCreateMutateAsync.mockResolvedValueOnce({
      errors: { Title: ['The field is Required'] },
    });

    render(<RemindersList />);

    fireEvent.click(screen.getByText('New reminder'));
    fireEvent.change(screen.getByTestId('title'), {
      target: { value: 'Buy milk' },
    });
    fireEvent.click(screen.getByTestId('save-button'));

    expect(
      await screen.findByText('The field is Required'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('keeps the sheet open and reports a rejected save', async () => {
    mockCreateMutateAsync.mockRejectedValueOnce(new Error('Network error'));

    render(<RemindersList />);

    fireEvent.click(screen.getByText('New reminder'));
    fireEvent.change(screen.getByTestId('title'), {
      target: { value: 'Buy milk' },
    });
    fireEvent.click(screen.getByTestId('save-button'));

    expect(
      await screen.findByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('opens the edit sheet prefilled from a card', () => {
    render(<RemindersList />);

    // First card is the open reminder (Overdue group renders before Done).
    fireEvent.click(screen.getAllByLabelText('Edit reminder')[0]);

    expect(
      screen.getByRole('dialog', { name: 'Edit reminder' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('title')).toHaveValue('Test Title 2');
    expect(screen.getByText('Save changes')).toBeInTheDocument();
  });

  it('updates a reminder from the edit sheet', async () => {
    render(<RemindersList />);

    fireEvent.click(screen.getAllByLabelText('Edit reminder')[0]);
    fireEvent.change(screen.getByTestId('title'), {
      target: { value: 'Renamed' },
    });
    fireEvent.click(screen.getByTestId('save-button'));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 2, title: 'Renamed' }),
      );
    });
  });

  it('leaves focus on the page after deleting from the sheet', async () => {
    render(<RemindersList />);

    fireEvent.click(screen.getAllByLabelText('Edit reminder')[0]);
    fireEvent.click(screen.getByText('Delete reminder'));
    fireEvent.click(screen.getByTestId('delete-button'));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    expect(document.activeElement).not.toBe(document.body);
  });

  it('keeps the sheet open and reports a rejected delete', async () => {
    mockDeleteMutateAsync.mockRejectedValueOnce(new Error('Network error'));

    render(<RemindersList />);

    fireEvent.click(screen.getAllByLabelText('Edit reminder')[0]);
    fireEvent.click(screen.getByText('Delete reminder'));
    fireEvent.click(screen.getByTestId('delete-button'));

    expect(
      await screen.findByText('Something went wrong. Please try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByText('Delete this reminder?')).not.toBeInTheDocument();
  });

  it('deletes a reminder after the confirmation dialog', async () => {
    render(<RemindersList />);

    fireEvent.click(screen.getAllByLabelText('Edit reminder')[0]);
    fireEvent.click(screen.getByText('Delete reminder'));

    expect(screen.getByText('Delete this reminder?')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('delete-button'));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith(2);
    });

    expect(mockQueryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['reminders'],
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('keeps the reminder when the confirmation is dismissed', () => {
    render(<RemindersList />);

    fireEvent.click(screen.getAllByLabelText('Edit reminder')[0]);
    fireEvent.click(screen.getByText('Delete reminder'));
    fireEvent.click(screen.getByTestId('close-button'));

    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
    expect(screen.queryByText('Delete this reminder?')).not.toBeInTheDocument();
    expect(
      screen.getByRole('dialog', { name: 'Edit reminder' }),
    ).toBeInTheDocument();
  });

  it('toggles a reminder optimistically', async () => {
    render(<RemindersList />);

    fireEvent.click(screen.getByLabelText('Mark done'));

    const openReminder = mockReminders.find(reminder => !reminder.isDone);
    const toggled = { ...openReminder, isDone: true };

    expect(mockQueryClient.setQueryData).toHaveBeenCalledWith(
      ['reminders'],
      expect.any(Function),
    );

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(toggled);
    });
  });

  it('rolls back the optimistic toggle when the update fails', async () => {
    mockUpdateMutateAsync.mockResolvedValueOnce({
      errors: { request: ['failed'] },
    });

    render(<RemindersList />);

    fireEvent.click(screen.getByLabelText('Mark done'));

    await waitFor(() => {
      expect(mockQueryClient.setQueryData).toHaveBeenLastCalledWith(
        ['reminders'],
        mockReminders,
      );
    });
  });
});
