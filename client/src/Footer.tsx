import React from 'react';
import { Box, Text, Anchor, Group } from '@mantine/core';

function Footer() {
  return (
    <Box component="footer" py={24} ta="center">
      <Group justify="center" gap="xs" wrap="wrap">
        <Text size="sm" c="gray.5">
          An{' '}
          <Anchor
            href="https://unstyled.com"
            size="sm"
            c="gray.5"
            target="_blank"
            rel="noopener noreferrer"
          >
            Unstyled
          </Anchor>{' '}
          product by{' '}
          <Anchor
            href="https://github.com/si"
            size="sm"
            c="gray.5"
            target="_blank"
            rel="noopener noreferrer"
          >
            Si Jobling
          </Anchor>
        </Text>
        <Text size="sm" c="gray.3">·</Text>
        <Anchor
          href="https://github.com/si/podcasts-personality/"
          size="sm"
          c="gray.5"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </Anchor>
        <Text size="sm" c="gray.3">·</Text>
        <Anchor
          href="https://railway.com?referralCode=HgqUac"
          size="sm"
          c="gray.5"
          target="_blank"
          rel="noopener noreferrer"
        >
          Build your own apps with my Railway referral
        </Anchor>
        <Text size="sm" c="gray.3">·</Text>
        <Text size="sm" c="gray.5">Built with Claude Code</Text>
      </Group>
    </Box>
  );
}

export default Footer;

