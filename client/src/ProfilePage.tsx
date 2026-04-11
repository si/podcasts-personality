import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  VStack,
  Text,
  ListRoot,
  ListItem,
  Spinner,
  Button,
} from '@chakra-ui/react';
import axios from 'axios';
import { toaster } from './toaster';

interface Podcast {
  title: string;
  xmlurl: string;
}

interface Profile {
  hash: string;
  podcasts: Podcast[];
  created_at: string;
}

function ProfilePage() {
  const { hash } = useParams<{ hash: string }>();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    axios.get(`/api/profiles/${hash}`)
      .then(res => setProfile(res.data))
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
            <Heading as="h1" size="lg">Podcast Profile</Heading>
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
