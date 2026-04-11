import React, { useState } from 'react';
import {
  ChakraProvider,
  defaultSystem,
  Box,
  Heading,
  VStack,
  Input,
  Button,
  Text,
  ListRoot,
  ListItem,
  Spinner,
  createToaster,
  Toaster,
  ToastRoot,
  ToastTitle,
  ToastDescription,
  ToastCloseTrigger,
} from '@chakra-ui/react';
import axios from 'axios';

const toaster = createToaster({ placement: 'top-end' });

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [podcasts, setPodcasts] = useState<Array<{ title: string; xmlurl: string }>>([]);

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

  return (
    <ChakraProvider value={defaultSystem}>
      <Toaster toaster={toaster}>
        {(toast: { title?: React.ReactNode; description?: React.ReactNode }) => (
          <ToastRoot>
            <ToastTitle>{toast.title}</ToastTitle>
            {toast.description && <ToastDescription>{toast.description}</ToastDescription>}
            <ToastCloseTrigger />
          </ToastRoot>
        )}
      </Toaster>
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
              <Heading as="h2" size="md" mb={2}>Podcasts Found</Heading>
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
    </ChakraProvider>
  );
}

export default App;
