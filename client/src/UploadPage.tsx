import React, { useState } from 'react';
import {
  Box,
  Title,
  Stack,
  FileInput,
  Button,
  Text,
  Loader,
} from '@mantine/core';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toaster } from './toaster';

interface Podcast {
  title: string;
  xmlurl: string;
}

function UploadPage() {
  const navigate = useNavigate();
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

  return (
    <Box mih="100vh" bg="gray.0" py={40} px={16}>
      <Stack gap={24} maw={480} mx="auto" bg="white" p={32} style={{ borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.08)' }}>
        <Title order={1} size="h2">Upload Your Podcast OPML</Title>
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
  );
}

export default UploadPage;
