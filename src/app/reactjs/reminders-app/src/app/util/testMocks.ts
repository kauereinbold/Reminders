const mockReminder = {
  id: 1,
  title: 'Test Title 1',
  description: 'Test Description 1',
  limitDate: '',
  limitDateFormatted: '2023-01-01',
  isDone: true,
  isDoneFormatted: 'Yes',
};

const mockReminders = [
  { ...mockReminder },
  {
    id: 2,
    title: 'Test Title 2',
    description: 'Test Description 2',
    limitDateFormatted: '2023-01-02',
    isDone: false,
    isDoneFormatted: 'No',
  },
];

const mockUpdateMutateAsync = jest.fn().mockResolvedValue({});

const mockCreateMutateAsync = jest.fn().mockResolvedValue({});

const mockDeleteMutateAsync = jest.fn().mockResolvedValue({});

const mockQueryClient = {
  getQueryData: jest.fn().mockReturnValue(mockReminders),
  setQueryData: jest.fn(),
  invalidateQueries: jest.fn(),
};

const jestObjectsMock = {
  '@/app/api': {
    useReminders: jest.fn().mockImplementation(() => ({
      data: mockReminders,
    })),
    REMINDERS_QUERY_KEY: ['reminders'],
    useUpdateReminder: jest.fn().mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
    }),
    useCreateReminder: jest.fn().mockReturnValue({
      mutateAsync: mockCreateMutateAsync,
    }),
    useDeleteReminder: jest.fn().mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
    }),
    createReminder: jest.fn(),
    deleteReminder: jest.fn(),
    updateReminder: jest.fn(),
  },
  '@/app/hooks': {
    useRemindersQueryClient: jest.fn().mockReturnValue(mockQueryClient),
  },
};

const jestFunctionsMock = {
  '@/app/api': () => jestObjectsMock['@/app/api'],
  '@/app/hooks': () => jestObjectsMock['@/app/hooks'],
};

export {
  jestFunctionsMock,
  jestObjectsMock,
  mockReminders,
  mockReminder,
  mockQueryClient,
  mockUpdateMutateAsync,
  mockCreateMutateAsync,
  mockDeleteMutateAsync,
};
