import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  VStack,
  HStack,
  Text,
  ListRoot,
  ListItem,
  Spinner,
  Button,
  Input,
} from '@chakra-ui/react';
import axios from 'axios';
import { toaster } from './toaster';

interface Podcast {
  title: string;
  xmlurl: string;
}

interface Profile {
  hash: string;
  name: string | null;
  podcasts: Podcast[];
  created_at: string;
}

function ProfilePage() {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [nameInput, setNameInput] = useState('');
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    axios.get(`/api/profiles/${hash}`)
      .then(res => {
        setProfile(res.data);
        setNameInput(res.data.name || '');
      })
      .catch(err => {
        if (err.response?.status === 404) {
          setNotFound(true);
        } else {
          toaster.create({ title: 'Failed to load profile', type: 'error', duration: 3000 });
          setNotFound(true);
        }
      })
      .finally(() => setLoading(false));
  }, [hash]);

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    setSavingName(true);
    try {
      const res = await axios.patch(`/api/profiles/${hash}`, { name: nameInput.trim() });
      setProfile(prev => prev ? { ...prev, name: res.data.name } : prev);
      toaster.create({ title: 'Name saved!', type: 'success', duration: 1500 });
    } catch {
      toaster.create({ title: 'Failed to save name', type: 'error', duration: 3000 });
    } finally {
      setSavingName(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (typeof navigator.share !== 'undefined') {
      try {
        await navigator.share({ title: 'Podcast Profile', url });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          await navigator.clipboard.writeText(url);
          toaster.create({ title: 'Link copied!', type: 'success', duration: 1500 });
        }
      }
    } else {
      await navigator.clipboard.writeText(url);
      toaster.create({ title: 'Link copied!', type: 'success', duration: 1500 });
    }
  };

  return (
    <Box minH="100vh" bg="gray.50" py={10} px={4}>
      <VStack gap={8} maxW="lg" mx="auto" bg="white" p={8} borderRadius="lg" boxShadow="md">
        {loading && <Spinner size="xl" />}

        {notFound && (
          <>
            <Heading as="h1" size="lg">Profile Not Found</Heading>
            <Text color="gray.500">This profile doesn't exist or has been removed.</Text>
            <Button colorPalette="blue" onClick={() => navigate('/')}>Create Your Own Profile</Button>
          </>
        )}

        {profile && (
          <>
            <Heading as="h1" size="lg">
              {profile.name ? `${profile.name}'s Profile` : 'Podcast Profile'}
            </Heading>

            {/* Name form */}
            <Box w="100%" p={4} bg="gray.50" borderRadius="md">
              <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.600">
                {profile.name ? 'Your name' : 'Set your name'}
              </Text>
              <HStack>
                <Input
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  placeholder="Enter your name"
                  size="sm"
                  onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                />
                <Button
                  size="sm"
                  colorPalette="blue"
                  onClick={handleSaveName}
                  loading={savingName}
                  disabled={!nameInput.trim() || savingName}
                >
                  Save
                </Button>
              </HStack>
            </Box>

            <Text color="gray.500">{profile.podcasts.length} podcasts</Text>
            <Button colorPalette="blue" onClick={handleShare} w="100%">Share This Profile</Button>
            <Box w="100%">
              <ListRoot gap={2}>
                {profile.podcasts.map((p, i) => (
                  <ListItem key={i}>
                    <Text fontWeight="bold">{p.title || p.xmlurl}</Text>
                    <Text fontSize="sm" color="gray.500">{p.xmlurl}</Text>
                  </ListItem>
                ))}
              </ListRoot>
            </Box>
            <Button variant="ghost" onClick={() => navigate('/')}>Create Your Own Profile</Button>
          </>
        )}
      </VStack>
    </Box>
  );
}

export default ProfilePage;
