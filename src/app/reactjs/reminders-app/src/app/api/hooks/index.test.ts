import { act, renderHook } from '@testing-library/react';
import {
  useCreateReminder,
  useDeleteReminder,
  useReminders,
  useUpdateReminder,
} from '.';
import { mockReminders } from '@/app/util/testMocks';

jest.mock(
  '@/app/api',
  () => require('@/app/util/testMocks').jestFunctionsMock['@/app/api'],
);
jest.mock('@/app/hooks', () => ({
  useMutation: jest.fn(),
  useQuery: jest.fn().mockImplementation(() => mockReminders),
}));

describe('Reminder Hooks', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('useReminders hook', () => {
    const { result } = renderHook(() => useReminders());

    expect(result.current).toEqual(mockReminders);
  });

  it('useCreateReminder hook', () => {
    jest
      .spyOn(require('@/app/hooks'), 'useMutation')
      .mockImplementation(() => ({ mutateAsync: jest.fn() }));

    const { result } = renderHook(() => useCreateReminder());

    act(() => {
      (result.current as any).mutateAsync();
    });
    expect(result.current.mutateAsync).toHaveBeenCalled();
  });

  it('useUpdateReminder hook', () => {
    jest
      .spyOn(require('@/app/hooks'), 'useMutation')
      .mockImplementation(() => ({ mutateAsync: jest.fn() }));

    const { result } = renderHook(() => useUpdateReminder());

    act(() => {
      (result.current as any).mutateAsync();
    });
    expect(result.current.mutateAsync).toHaveBeenCalled();
  });

  it('useDeleteReminder hook', () => {
    jest
      .spyOn(require('@/app/hooks'), 'useMutation')
      .mockImplementation(() => ({ mutateAsync: jest.fn() }));

    const { result } = renderHook(() => useDeleteReminder());

    act(() => {
      (result.current as any).mutateAsync();
    });
    expect(result.current.mutateAsync).toHaveBeenCalled();
  });
});
