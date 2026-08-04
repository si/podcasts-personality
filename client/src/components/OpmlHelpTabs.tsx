import React from 'react';
import { Tabs, Text, Stack, List } from '@mantine/core';

interface AppGuide {
  value: string;
  label: string;
  emoji: string;
  steps: string[];
  note?: string;
}

const GUIDES: AppGuide[] = [
  {
    value: 'apple',
    label: 'Apple Podcasts',
    emoji: '🎧',
    steps: [
      "Apple Podcasts doesn't have a built-in export button — annoying, but there's an easy workaround.",
      'Search the App Store for a free "podcast OPML export" tool. It reads your existing subscriptions and generates the file for you in seconds.',
      'Save the file, then upload it below (AirDrop or email it to yourself if you exported on your phone).',
    ],
  },
  {
    value: 'spotify',
    label: 'Spotify',
    emoji: '🟢',
    steps: [
      "Spotify keeps podcasts inside its own walled garden — there's no OPML export at all, built-in or otherwise.",
      'The workaround: jot down the shows you follow, then re-follow them in an app that does support OPML (Overcast or Pocket Casts both work well).',
      'Export your OPML from that app instead — see its tab above.',
    ],
    note: "Not ideal, we know. Blame Spotify's walled garden, not you.",
  },
  {
    value: 'overcast',
    label: 'Overcast',
    emoji: '🟠',
    steps: [
      'Open overcast.fm in a browser and sign in.',
      'Go to Account → Export OPML.',
      'The file downloads instantly — no app needed.',
    ],
  },
  {
    value: 'pocketcasts',
    label: 'Pocket Casts',
    emoji: '🔴',
    steps: [
      'Open the Pocket Casts app and tap the Profile tab.',
      'Tap Settings → Import & Export → Export OPML.',
      'Save the file, or email it to yourself.',
    ],
  },
];

function OpmlHelpTabs() {
  return (
    <Tabs defaultValue="apple" variant="pills" radius="md">
      <Tabs.List mb={16} style={{ flexWrap: 'wrap' }}>
        {GUIDES.map(g => (
          <Tabs.Tab key={g.value} value={g.value}>
            {g.emoji} {g.label}
          </Tabs.Tab>
        ))}
      </Tabs.List>

      {GUIDES.map(g => (
        <Tabs.Panel key={g.value} value={g.value}>
          <Stack gap={8}>
            <List size="sm" c="gray.7" spacing={6}>
              {g.steps.map((step, i) => (
                <List.Item key={i}>{step}</List.Item>
              ))}
            </List>
            {g.note && (
              <Text size="xs" c="gray.5" fs="italic">{g.note}</Text>
            )}
          </Stack>
        </Tabs.Panel>
      ))}
    </Tabs>
  );
}

export default OpmlHelpTabs;
