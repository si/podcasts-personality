import React, { useEffect, useState } from 'react';
import { Box, Text, Group, Stack, Badge, ActionIcon } from '@mantine/core';

interface ExampleTrait {
  emoji: string;
  label: string;
  score: number;
  color: string;
}

interface ExampleCategory {
  emoji: string;
  label: string;
  pct: number;
}

interface ExampleProfile {
  emoji: string;
  archetype: string;
  summary: string;
  traits: ExampleTrait[];
  categories: ExampleCategory[];
}

const EXAMPLES: ExampleProfile[] = [
  {
    emoji: '🦉',
    archetype: 'The Night-Owl Nerd',
    summary:
      "Deep dives at 1am. Six tech and sci-fi shows on the go at once, finished on no particular schedule — which is fine, because neither is the universe.",
    traits: [
      { emoji: '🔭', label: 'Openness', score: 91, color: 'var(--mantine-color-violet-4)' },
      { emoji: '📋', label: 'Conscientiousness', score: 38, color: 'var(--mantine-color-green-4)' },
      { emoji: '🌟', label: 'Extraversion', score: 44, color: 'var(--mantine-color-orange-4)' },
    ],
    categories: [
      { emoji: '💻', label: 'Technology', pct: 40 },
      { emoji: '🚀', label: 'Science Fiction', pct: 25 },
      { emoji: '🔬', label: 'Science', pct: 20 },
    ],
  },
  {
    emoji: '📰',
    archetype: 'The Current Affairs Completionist',
    summary:
      'Three news podcasts before breakfast. Needs to know what happened, who said what, and why it matters — ideally from four different angles.',
    traits: [
      { emoji: '📋', label: 'Conscientiousness', score: 88, color: 'var(--mantine-color-green-4)' },
      { emoji: '🔭', label: 'Openness', score: 65, color: 'var(--mantine-color-violet-4)' },
      { emoji: '🌊', label: 'Neuroticism', score: 58, color: 'var(--mantine-color-red-4)' },
    ],
    categories: [
      { emoji: '📰', label: 'News', pct: 45 },
      { emoji: '🗳️', label: 'Politics', pct: 30 },
      { emoji: '💼', label: 'Business', pct: 15 },
    ],
  },
  {
    emoji: '🔎',
    archetype: 'The True Crime Wind-Down',
    summary:
      'Murder mysteries as a bedtime story. The queue is 60% unsolved cases and 40% comedians helping you feel better about it afterwards.',
    traits: [
      { emoji: '🤝', label: 'Agreeableness', score: 70, color: 'var(--mantine-color-teal-4)' },
      { emoji: '🔭', label: 'Openness', score: 55, color: 'var(--mantine-color-violet-4)' },
      { emoji: '🌊', label: 'Neuroticism', score: 62, color: 'var(--mantine-color-red-4)' },
    ],
    categories: [
      { emoji: '🔍', label: 'True Crime', pct: 50 },
      { emoji: '😄', label: 'Comedy', pct: 30 },
      { emoji: '🌍', label: 'Society & Culture', pct: 20 },
    ],
  },
  {
    emoji: '🌈',
    archetype: 'The Renaissance Ear',
    summary:
      'Fourteen categories, no regrets. History on Monday, basketball on Tuesday, philosophy in the shower. Genuinely impossible to pin down — which is sort of the point.',
    traits: [
      { emoji: '🔭', label: 'Openness', score: 97, color: 'var(--mantine-color-violet-4)' },
      { emoji: '🌟', label: 'Extraversion', score: 60, color: 'var(--mantine-color-orange-4)' },
      { emoji: '📋', label: 'Conscientiousness', score: 50, color: 'var(--mantine-color-green-4)' },
    ],
    categories: [
      { emoji: '📜', label: 'History', pct: 15 },
      { emoji: '⚽', label: 'Sports', pct: 15 },
      { emoji: '💭', label: 'Philosophy', pct: 12 },
    ],
  },
  {
    emoji: '💪',
    archetype: 'The Self-Improvement Stacker',
    summary:
      "2x speed, always. Productivity, fitness and personal finance shows, consumed like a to-do list you're determined to clear.",
    traits: [
      { emoji: '📋', label: 'Conscientiousness', score: 93, color: 'var(--mantine-color-green-4)' },
      { emoji: '🔭', label: 'Openness', score: 60, color: 'var(--mantine-color-violet-4)' },
      { emoji: '🌟', label: 'Extraversion', score: 48, color: 'var(--mantine-color-orange-4)' },
    ],
    categories: [
      { emoji: '🌱', label: 'Self-Improvement', pct: 35 },
      { emoji: '🏃', label: 'Health & Fitness', pct: 30 },
      { emoji: '💵', label: 'Personal Finance', pct: 20 },
    ],
  },
];

function MiniBar({ pct, color }: { pct: number; color: string }) {
  return (
    <Box h={6} bg="gray.1" style={{ borderRadius: 999, overflow: 'hidden' }}>
      <Box h={6} style={{ width: `${pct}%`, background: color, borderRadius: 999 }} />
    </Box>
  );
}

function ExampleCard({ example }: { example: ExampleProfile }) {
  return (
    <Box
      w="100%"
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--mantine-color-gray-2)',
      }}
    >
      <Box
        px={20}
        py={12}
        style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        <Group justify="space-between">
          <Text fw={700} c="white">🎙️ Personality Insights</Text>
          <Badge color="gray.0" c="violet.8" variant="filled" size="sm">Fictional example</Badge>
        </Group>
      </Box>
      <Box p={20}>
        <Stack gap={16}>
          <Box
            p={16}
            style={{ background: 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)', borderRadius: 12 }}
          >
            <Text fw={700} size="lg" mb={4}>
              {example.emoji} {example.archetype}
            </Text>
            <Text size="sm" c="gray.8" style={{ lineHeight: 1.6 }}>
              {example.summary}
            </Text>
          </Box>

          <Box>
            <Text fw={600} size="sm" c="gray.6" mb={8}>📊 Content Mix</Text>
            <Group gap={8} wrap="wrap">
              {example.categories.map(cat => (
                <Badge key={cat.label} color="blue" variant="outline" size="sm">
                  {cat.emoji} {cat.label} · {cat.pct}%
                </Badge>
              ))}
            </Group>
          </Box>

          <Box>
            <Text fw={600} size="sm" c="gray.6" mb={12}>🌊 Big Five Personality Traits</Text>
            <Stack gap={10}>
              {example.traits.map(trait => (
                <Box key={trait.label}>
                  <Group justify="space-between" mb={4} wrap="nowrap" gap={8}>
                    <Text size="sm" style={{ overflowWrap: 'anywhere' }}>{trait.emoji} {trait.label}</Text>
                    <Text size="xs" c="gray.5" fw={500} style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>{trait.score}%</Text>
                  </Group>
                  <MiniBar pct={trait.score} color={trait.color} />
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
}

const AUTO_ADVANCE_MS = 6000;

function ExampleCarousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex(i => (i + 1) % EXAMPLES.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [index]);

  const goTo = (i: number) => setIndex((i + EXAMPLES.length) % EXAMPLES.length);

  return (
    <Box w="100%">
      <Group justify="space-between" align="center" mb={12} wrap="nowrap" gap={8}>
        <ActionIcon
          variant="light"
          radius="xl"
          size="lg"
          onClick={() => goTo(index - 1)}
          aria-label="Previous example"
          style={{ flexShrink: 0 }}
        >
          ‹
        </ActionIcon>
        <Box style={{ flex: 1, minWidth: 0 }}>
          <ExampleCard example={EXAMPLES[index]} />
        </Box>
        <ActionIcon
          variant="light"
          radius="xl"
          size="lg"
          onClick={() => goTo(index + 1)}
          aria-label="Next example"
          style={{ flexShrink: 0 }}
        >
          ›
        </ActionIcon>
      </Group>
      <Group justify="center" gap={6}>
        {EXAMPLES.map((ex, i) => (
          <Box
            key={ex.archetype}
            onClick={() => goTo(i)}
            role="button"
            aria-label={`Show example ${i + 1}`}
            style={{
              width: i === index ? 20 : 8,
              height: 8,
              borderRadius: 999,
              cursor: 'pointer',
              transition: 'width 0.2s ease, background 0.2s ease',
              background: i === index ? 'var(--mantine-color-violet-5)' : 'var(--mantine-color-gray-3)',
            }}
          />
        ))}
      </Group>
    </Box>
  );
}

export default ExampleCarousel;
