import React, { useRef, useState } from 'react';
import {
  Box,
  Title,
  Stack,
  FileInput,
  Button,
  Text,
  Loader,
  Divider,
  Accordion,
  Group,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toaster } from './toaster';
import Footer from './Footer';
import ReasonsGrid from './components/ReasonsGrid';
import ExampleCarousel from './components/ExampleCarousel';
import PodrollExplainer from './components/PodrollExplainer';
import OpmlHelpTabs from './components/OpmlHelpTabs';

interface Podcast {
  title: string;
  xmlurl: string;
}

function UploadPage() {
  const navigate = useNavigate();
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const handleFileChange = (f: File | null) => {
    setFile(f);
    setPodcasts([]);
    setShareUrl(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setPodcasts([]);
    setShareUrl(null);
    const formData = new FormData();
    formData.append('opml', file);
    try {
      const res = await axios.post('/api/upload-opml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPodcasts(res.data.podcasts);
      toaster.create({ title: 'OPML parsed!', type: 'success', duration: 2000 });
    } catch (err: any) {
      toaster.create({
        title: 'Failed to parse OPML',
        description: err?.response?.data?.error || err.message,
        type: 'error',
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await axios.post('/api/profiles', { podcasts });
      const url = `${window.location.origin}/p/${res.data.hash}`;
      setShareUrl(url);

      if (typeof navigator.share !== 'undefined') {
        try {
          await navigator.share({ title: 'My Podcast Profile', url });
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            await navigator.clipboard.writeText(url);
            toaster.create({ title: 'Link copied to clipboard!', type: 'success', duration: 2000 });
          }
        }
      } else {
        await navigator.clipboard.writeText(url);
        toaster.create({ title: 'Link copied to clipboard!', type: 'success', duration: 2000 });
      }
    } catch (err: any) {
      toaster.create({
        title: 'Failed to save profile',
        description: err?.response?.data?.error || err.message,
        type: 'error',
        duration: 3000,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    toaster.create({ title: 'Link copied!', type: 'success', duration: 1500 });
  };

  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Box mih="100vh" bg="gray.0" py={40} px={16}>
      <Stack gap={32} maw={720} mx="auto" bg="white" p={32} style={{ borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>

        {/* ── Brand ── */}
        <Text fw={800} size="sm" c="gray.5" style={{ letterSpacing: 1, textTransform: 'uppercase' }}>
          🎙️ Podnality
        </Text>

        {/* ── Hero ── */}
        <Stack gap={16}>
          <Text
            variant="gradient"
            gradient={{ from: 'violet', to: 'cyan' }}
            fw={900}
            style={{ fontSize: 'clamp(28px, 5vw, 40px)', lineHeight: 1.15 }}
          >
            What do your podcast subscriptions say about you?
          </Text>
          <Text c="gray.7" size="lg" style={{ lineHeight: 1.6 }}>
            Your listening habits reveal a lot — the topics you seek out, the voices you trust,
            the worlds you choose to tune into. Upload your subscriptions and we'll turn them
            into a personality profile that's actually worth sharing.
          </Text>
          <Group>
            <Button
              size="md"
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
              onClick={scrollToUpload}
            >
              Analyse My Subscriptions ↓
            </Button>
          </Group>
        </Stack>

        {/* ── Reasons ── */}
        <Stack gap={12}>
          <Title order={2} size="h4">Why bother?</Title>
          <ReasonsGrid />
        </Stack>

        <Divider />

        {/* ── Example carousel ── */}
        <Stack gap={12}>
          <Title order={2} size="h4">Here's the kind of thing you'll get</Title>
          <Text c="gray.6" size="sm">
            A few made-up examples of what a Podnality profile looks like — yours will be built
            from your actual subscriptions.
          </Text>
          <ExampleCarousel />
          <Button variant="gradient" gradient={{ from: 'violet', to: 'pink' }} onClick={scrollToUpload} fullWidth mt={4}>
            Build my real one →
          </Button>
        </Stack>

        <Divider />

        {/* ── Podroll explainer ── */}
        <PodrollExplainer />

        <Divider />

        {/* ── Upload section ── */}
        <Box ref={uploadSectionRef}>
          <Stack gap={16}>
            <Title order={2} size="h4">Get your profile</Title>
            <Text c="gray.7">
              Most podcast apps let you export an <Text component="span" fw={700}>OPML file</Text> — a
              simple list of every show you follow. Export it from your app, save it to your
              device, then upload it below.
            </Text>

            <Accordion variant="separated" radius="md">
              <Accordion.Item value="opml-help">
                <Accordion.Control>🤔 Not sure where to find your OPML file?</Accordion.Control>
                <Accordion.Panel><OpmlHelpTabs /></Accordion.Panel>
              </Accordion.Item>
            </Accordion>

            <FileInput
              accept=".opml,.xml"
              placeholder="Choose OPML file"
              value={file}
              onChange={handleFileChange}
              disabled={loading}
            />
            <Button
              variant="gradient"
              gradient={{ from: 'blue', to: 'cyan' }}
              onClick={handleUpload}
              loading={loading}
              disabled={!file || loading}
            >
              Upload &amp; Parse
            </Button>
            {loading && <Loader mx="auto" />}

            <Text size="xs" c="gray.5">
              🔒 Your profile gets an unlisted link — not searchable, but anyone who has the link
              can view it. That's kind of the point (it's meant to be shared!), just know it
              isn't private. Straightforward stats on your subscriptions, plus an optional
              AI-generated personality read when available — no login required.
            </Text>

            {podcasts.length > 0 && (
              <Box w="100%">
                <Title order={2} size="h4" mb={16}>{podcasts.length} Podcasts Found</Title>

                {shareUrl ? (
                  <Box p={16} bg="green.0" style={{ borderRadius: 8, border: '1px solid var(--mantine-color-green-3)' }} mb={16}>
                    <Text fw={700} mb={8}>Your profile is ready to share:</Text>
                    <Text size="sm" c="gray.6" style={{ wordBreak: 'break-all' }} mb={12}>{shareUrl}</Text>
                    <Stack gap={8}>
                      <Button size="sm" variant="gradient" gradient={{ from: 'teal', to: 'lime' }} onClick={handleCopyUrl}>Copy Link</Button>
                      <Button size="sm" variant="subtle" onClick={() => navigate(`/p/${shareUrl.split('/p/')[1]}`)}>
                        View Profile
                      </Button>
                    </Stack>
                  </Box>
                ) : (
                  <Button
                    variant="gradient"
                    gradient={{ from: 'teal', to: 'lime' }}
                    onClick={handleSaveProfile}
                    loading={saving}
                    mb={16}
                    fullWidth
                  >
                    Create Shareable Profile
                  </Button>
                )}

                <Stack gap={8}>
                  {podcasts.map((p, i) => (
                    <Box key={i}>
                      <Text fw={700}>{p.title || p.xmlurl}</Text>
                      <Text size="sm" c="gray.5">{p.xmlurl}</Text>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </Stack>
        </Box>
      </Stack>
      <Footer />
    </Box>
  );
}

export default UploadPage;
