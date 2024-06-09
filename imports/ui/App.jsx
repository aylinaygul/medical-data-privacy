import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppBar, Toolbar, Typography, Container, CssBaseline, Box, Button } from '@mui/material';

import DICOM from './screens/DICOM';
import Decryption from './screens/Decryption';
import Nifti from './screens/Nifti';

export const App = () => {

  return (
    <>
      <CssBaseline />
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
             Medical Data Anonymizer
          </Typography>
        </Toolbar>
      </AppBar>
      <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', paddingTop: 3 }}>
        <Container>
          <BrowserRouter>
            <Routes>
              <Route path="" element={<DICOM />} />
              <Route path="decrypt" element={<Decryption />} />
              <Route path="nifti" element={<Nifti />} />
            </Routes>
          </BrowserRouter>
        </Container>
      </Box>
    </>
  );
};
