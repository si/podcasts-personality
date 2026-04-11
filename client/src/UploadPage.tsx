import React, { useState } from 'react';
import {
  Box,
  Heading,
  VStack,
  Input,
  Button,
  Text,
  ListRoot,
  ListItem,
  Spinner,
} from '@chakra-ui/react';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setPodcasts([]);
      setShareUrl(null);
    }
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
    <Box minH="100vh" bg="gray.50" py={10} px={4}>
      <VStack gap={8} maxW="lg" mx="auto" bg="white" p={8} borderRadius="lg" boxShadow="md">
        <Heading as="h1" size="lg">Upload Your Podcast OPML</Heading>
        <Input type="file" accept=".opml,.xml" onChange={handleFileChange} disabled={loading} />
        <Button colorPalette="blue" onClick={handleUpload} loading={loading} disabled={!file || loading}>
          Upload & Parse
        </Button>
        {loading && <Spinner />}
        {podcasts.length > 0 && (
          <Box w="100%">
            <Heading as="h2" size="md" mb={4}>{podcasts.length} Podcasts Found</Heading>

            {shareUrl ? (
              <Box p={4} bg="green.50" borderRadius="md" border="1px solid" borderColor="green.200" mb={4}>
                <Text fontWeight="bold" mb={2}>Your profile is ready to share:</Text>
                <Text fontSize="sm" color="gray.600" wordBreak="break-all" mb={3}>{shareUrl}</Text>
                <VStack gap={2} align="stretch">
                  <Button size="sm" colorPalette="green" onClick={handleCopyUrl}>Copy Link</Button>
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/p/${shareUrl.split('/p/')[1]}`)}>
                    View Profile
                  </Button>
                </VStack>
              </Box>
            ) : (
              <Button colorPalette="green" onClick={handleSaveProfile} loading={saving} mb={4} w="100%">
                Create Shareable Profile
              </Button>
            )}

            <ListRoot gap={2}>
              {podcasts.map((p, i) => (
                <ListItem key={i}>
                  <Text fontWeight="bold">{p.title || p.xmlurl}</Text>
                  <Text fontSize="sm" color="gray.500">{p.xmlurl}</Text>
                </ListItem>
              ))}
            </ListRoot>
          </Box>
        )}
      </VStack>
    </Box>
  );
}

export default UploadPage;
