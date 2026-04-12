import { notifications } from '@mantine/notifications';

export const toaster = {
  create: ({ title, description, type, duration }: {
    title?: string;
    description?: string;
    type?: 'success' | 'error' | 'info';
    duration?: number;
  }) => {
    notifications.show({
      title,
      message: description,
      color: type === 'error' ? 'red' : type === 'success' ? 'green' : 'blue',
      autoClose: duration ?? 3000,
    });
  },
};
