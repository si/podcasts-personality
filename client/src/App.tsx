import React, { useState } from 'react';
import {
  ChakraProvider,
  Box,
  Heading,
  VStack,
  Input,
  Button,
  Text,
  List,
  ListItem,
  Spinner,
  useToast,
} from '@chakra-ui/react';
import axios from 'axios';

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [podcasts, setPodcasts] = useState<Array<{ title: string; xmlurl: string }>>([]);
  const toast = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setLoading(true);
    setPodcasts([]);
    const formData = new FormData();
    formData.append('opml', file);
    try {
      const res = await axios.post('http://localhost:5000/api/upload-opml', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPodcasts(res.data.podcasts);
      toast({ title: 'OPML parsed!', status: 'success', duration: 2000, isClosable: true });
    } catch (err: any) {
      toast({ title: 'Failed to parse OPML', description: err?.response?.data?.error || err.message, status: 'error', duration: 3000, isClosable: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChakraProvider>
      <Box minH="100vh" bg="gray.50" py={10} px={4}>
        <VStack spacing={8} maxW="lg" mx="auto" bg="white" p={8} borderRadius="lg" boxShadow="md">
          <Heading as="h1" size="lg">Upload Your Podcast OPML</Heading>
          <Input type="file" accept=".opml,.xml" onChange={handleFileChange} isDisabled={loading} />
          <Button colorScheme="blue" onClick={handleUpload} isLoading={loading} isDisabled={!file || loading}>
            Upload & Parse
          </Button>
          {loading && <Spinner />}
          {podcasts.length > 0 && (
            <Box w="100%">
              <Heading as="h2" size="md" mb={2}>Podcasts Found</Heading>
              <List spacing={2}>
                {podcasts.map((p, i) => (
                  <ListItem key={i}>
                    <Text fontWeight="bold">{p.title || p.xmlurl}</Text>
                    <Text fontSize="sm" color="gray.500">{p.xmlurl}</Text>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </VStack>
      </Box>
    </ChakraProvider>
  );
}

export default App;
