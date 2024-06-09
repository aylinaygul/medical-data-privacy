import React, { useState } from 'react';
import { styled } from '@mui/material/styles';
import { Button, Typography, Grid, CircularProgress } from '@mui/material';
import ImageIcon from '@mui/icons-material/Image';
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

export default function Nifti() {
  const [file, setFile] = useState(null);
  const [images, setImages] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles && acceptedFiles[0]) {
      const selectedFile = acceptedFiles[0];
      const fileName = selectedFile.name.toLowerCase();
      if (fileName.endsWith('.nii') || fileName.endsWith('.nii.gz')) {
        setFile(selectedFile);
      } else {
        alert('Invalid file type. Please upload a NIFTI image.');
      }
    }
  };

  const { getRootProps, getInputProps } = useDropzone({ onDrop, accept: '.nii,.nii.gz' });

  const handleProcessNifti = async () => {
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/process_nifti', formData);
      setImages(response.data);
    } catch (error) {
      console.error('Error during processing:', error);
      setError('An error occurred while processing the file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <div {...getRootProps({ style: { border: '2px dashed #eeeeee', padding: '20px', textAlign: 'center' } })}>
            <input {...getInputProps()} />
            {file ? (
              <Typography variant="body2">
                Selected file: {file.name}
              </Typography>
            ) : (
              <div style={{ padding: '50px 0' }}>
                <ImageIcon style={{ fontSize: '64px', color: '#cccccc' }} />
                <Typography variant="h6" style={{ color: '#cccccc' }}>
                  Drag & drop a NIFTI file here, or click to select one
                </Typography>
              </div>
            )}
          </div>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleProcessNifti}
            style={{ marginTop: '20px' }}
            disabled={!file || loading}
          >
            Process NIFTI
          </Button>
        </Grid>
        {loading && (
          <Grid item xs={12} style={{ textAlign: 'center' }}>
            <CircularProgress />
            <Typography variant="body2" style={{ marginTop: '20px' }}>
              Processing...
            </Typography>
          </Grid>
        )}
        {!loading && images && (
          <>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Original Images</Typography>
              {images.original.axial_image && (
                <img src={`data:image/png;base64,${images.original.axial_image}`} alt="Axial Slice" style={{ width: '100%', marginBottom: '20px' }} />
              )}
              {images.original.coronal_image && (
                <img src={`data:image/png;base64,${images.original.coronal_image}`} alt="Coronal Slice" style={{ width: '100%', marginBottom: '20px' }} />
              )}
              {images.original.sagittal_image && (
                <img src={`data:image/png;base64,${images.original.sagittal_image}`} alt="Sagittal Slice" style={{ width: '100%', marginBottom: '20px' }} />
              )}
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography variant="h6">Processed Images</Typography>
              {images.processed.axial_image && (
                <img src={`data:image/png;base64,${images.processed.axial_image}`} alt="Axial Slice" style={{ width: '100%', marginBottom: '20px' }} />
              )}
              {images.processed.coronal_image && (
                <img src={`data:image/png;base64,${images.processed.coronal_image}`} alt="Coronal Slice" style={{ width: '100%', marginBottom: '20px' }} />
              )}
              {images.processed.sagittal_image && (
                <img src={`data:image/png;base64,${images.processed.sagittal_image}`} alt="Sagittal Slice" style={{ width: '100%', marginBottom: '20px' }} />
              )}
            </Grid>
          </>
        )}
        {!loading && error && (
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
