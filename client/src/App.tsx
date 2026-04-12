import React from 'react';
import { MantineProvider } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import UploadPage from './UploadPage';
import ProfilePage from './ProfilePage';

function App() {
  return (
    <MantineProvider>
      <Notifications />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<UploadPage />} />
          <Route path="/p/:hash" element={<ProfilePage />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
