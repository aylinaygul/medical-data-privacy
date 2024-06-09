import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import { Button, Card, CardContent, Typography, Grid, CircularProgress } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export default function Decryption() {
  const [dicomFile, setDicomFile] = useState(null);
  const [keyFile, setKeyFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleDecryption = async () => {
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', dicomFile);
    formData.append('key', keyFile);

    try {
      const response = await axios.post('http://localhost:5000/decrypt', formData);
      setMetadata(response.data);
    } catch (error) {
      console.error('Error decrypting file:', error);
      setError('An error occurred while decrypting the file.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (acceptedFiles, setFile) => {
    if (acceptedFiles && acceptedFiles[0]) {
      setFile(acceptedFiles[0]);
    }
  };

  const dicomDropzone = useDropzone({
    onDrop: (acceptedFiles) => handleFileChange(acceptedFiles, setDicomFile),
    accept: '.dcm',
  });

  const keyDropzone = useDropzone({
    onDrop: (acceptedFiles) => handleFileChange(acceptedFiles, setKeyFile),
    accept: '.txt',
  });

  return (
    <div style={{ padding: '20px' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} {...dicomDropzone.getRootProps({ style: { border: '2px dashed #eeeeee', padding: '20px', textAlign: 'center' } })}>
          <input {...dicomDropzone.getInputProps()} />
          <Typography variant="body2">
            {dicomFile ? `Selected file: ${dicomFile.name}` : 'Drag & drop a DICOM file here, or click to select one'}
          </Typography>
        </Grid>
        <Grid item xs={12} {...keyDropzone.getRootProps({ style: { border: '2px dashed #eeeeee', padding: '20px', textAlign: 'center' } })}>
          <input {...keyDropzone.getInputProps()} />
          <Typography variant="body2">
            {keyFile ? `Selected key file: ${keyFile.name}` : 'Drag & drop an encryption key file here, or click to select one'}
          </Typography>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleDecryption}
            disabled={!dicomFile || !keyFile || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Decrypt'}
          </Button>
        </Grid>
        <Grid item xs={12}>
          {metadata && (
            <Card>
              <CardContent>
                <Typography variant="h5" component="h2">
                  Decrypted DICOM Metadata
                </Typography>
                {Object.entries(metadata).map(([key, value]) => (
                  <Typography variant="body2" component="p" key={key}>
                    <strong>{key}:</strong> {value}
                  </Typography>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
        {error && (
          <Grid item xs={12}>
            <Typography variant="body2" color="error" style={{ marginTop: '20px' }}>
              <strong>Error:</strong> {error}
            </Typography>
          </Grid>
        )}
      </Grid>
    </div>
  );
}
