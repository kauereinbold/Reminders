import {
  createReminder,
  deleteReminder,
  getReminders,
  updateReminder,
} from '@/app/api';
import { useMutation, useQuery } from '@/app/hooks';

const REMINDER_QUERY_NAME = 'reminders';

const REMINDERS_QUERY_KEY = [REMINDER_QUERY_NAME];

const useReminders = () => useQuery({
  queryKey: [REMINDER_QUERY_NAME],
  queryFn: getReminders,
});

const useCreateReminder = () => {
  return useMutation({
    mutationFn: createReminder,
  });
};

const useUpdateReminder = () => {
  return useMutation({
    mutationFn: updateReminder,
  });
};

const useDeleteReminder = () => {
  return useMutation({
    mutationFn: deleteReminder,
  });
};

export {
  REMINDERS_QUERY_KEY,
  useReminders,
  useCreateReminder,
  useUpdateReminder,
  useDeleteReminder,
};
