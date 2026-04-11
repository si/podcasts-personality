import React from 'react';
import {
  ChakraProvider,
  defaultSystem,
  Toaster,
  ToastRoot,
  ToastTitle,
  ToastDescription,
  ToastCloseTrigger,
} from '@chakra-ui/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { toaster } from './toaster';
import UploadPage from './UploadPage';
import ProfilePage from './ProfilePage';

function App() {
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
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/p/:hash" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </ChakraProvider>
  );
}

export default App;
