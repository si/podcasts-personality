import React from 'react';
import { SimpleGrid, Box, Text, Stack } from '@mantine/core';

interface Reason {
  emoji: string;
  title: string;
  body: string;
}

const REASONS: Reason[] = [
  {
    emoji: '🧠',
    title: 'See yourself in your subscriptions',
    body: "You never sat down and picked a personality — but your queue has one anyway. We'll show you what it is.",
  },
  {
    emoji: '🎉',
    title: 'Share something more fun than a screenshot',
    body: 'Get a link worth sending to a group chat — more interesting than "just listened to this."',
  },
  {
    emoji: '🤝',
    title: 'Compare tastes with friends',
    body: 'Send yours, get theirs back. Find out who overlaps and who is wildly, delightfully different.',
  },
  {
    emoji: '🔍',
    title: 'Spot your own blind spots',
    body: 'Eclectic or stuck in a rut? See your actual content mix, not just what you think you listen to.',
  },
];

function ReasonsGrid() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing={16}>
      {REASONS.map(reason => (
        <Box
          key={reason.title}
          p={16}
          style={{ borderRadius: 12, border: '1px solid var(--mantine-color-gray-2)' }}
        >
          <Stack gap={4}>
            <Text size="lg">{reason.emoji}</Text>
            <Text fw={700} size="sm">{reason.title}</Text>
            <Text size="sm" c="gray.6" style={{ lineHeight: 1.5 }}>{reason.body}</Text>
          </Stack>
        </Box>
      ))}
    </SimpleGrid>
  );
}

export default ReasonsGrid;
