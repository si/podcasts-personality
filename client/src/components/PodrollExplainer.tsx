import React from 'react';
import { Box, Text, Stack, Title, Anchor } from '@mantine/core';

function PodrollExplainer() {
  return (
    <Box
      w="100%"
      p={20}
      style={{
        borderRadius: 12,
        border: '1px solid var(--mantine-color-gray-2)',
        background: 'var(--mantine-color-gray-0)',
      }}
    >
      <Stack gap={10}>
        <Title order={3} size="h4">🧩 Wait, what's a "podroll"?</Title>
        <Text c="gray.7" size="sm" style={{ lineHeight: 1.6 }}>
          Some podcasters add a <Text component="span" fw={700}>podroll</Text> to their show — a
          short, hand-picked list of other podcasts they love, baked right into their RSS feed so
          podcast apps can display it. Think of it as a recommendation shelf, curated by one
          person, for their audience.
        </Text>
        <Text c="gray.7" size="sm" style={{ lineHeight: 1.6 }}>
          Podnality is the same idea turned inside out. Instead of a podcaster hand-picking a
          few shows for you, we take <Text component="span" fw={700}>your entire subscription list</Text>{' '}
          and turn it into a profile — a different lens on the same "here's what's worth
          checking out" spirit, generated from what you actually listen to rather than what
          someone else recommends.
        </Text>
        <Text c="gray.7" size="sm" style={{ lineHeight: 1.6 }}>
          We think that's a natural extension of the idea: what if the open podcast namespace
          had room for a listener-generated podroll, not just a podcaster-curated one? We'd love
          to see that explored — the spec lives in the open on GitHub if you want to dig in.
        </Text>
        <Anchor
          href="https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/tags/podroll.md"
          size="sm"
          fw={600}
          target="_blank"
          rel="noopener noreferrer"
        >
          Read the podroll spec →
        </Anchor>
      </Stack>
    </Box>
  );
}

export default PodrollExplainer;
