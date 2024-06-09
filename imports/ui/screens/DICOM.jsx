import React, { useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { Button, Card, CardContent, Typography, Grid, Select, MenuItem, FormControl, InputLabel, CircularProgress } from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import cornerstone from 'cornerstone-core';
import cornerstoneWADOImageLoader from 'cornerstone-wado-image-loader';
import dicomParser from 'dicom-parser';

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

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;

cornerstoneWADOImageLoader.configure({
  beforeSend: function(xhr) {
  },
});

export default function DICOM() {
  const [file, setFile] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [processedMetadata, setProcessedMetadata] = useState(null);
  const [method, setMethod] = useState('suppression');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processedUrl, setProcessedUrl] = useState(null);
  const [processedFile, setProcessedFile] = useState(null);
  const dicomViewerRef = useRef();
  const processedViewerRef = useRef();

  useEffect(() => {
    cornerstone.enable(dicomViewerRef.current);
    cornerstone.enable(processedViewerRef.current);
  }, []);

  const { getRootProps, getInputProps } = useDropzone({
    onDrop: (acceptedFiles) => {
      if (acceptedFiles && acceptedFiles[0]) {
        const selectedFile = acceptedFiles[0];
        const fileExtension = selectedFile.name.split('.').pop().toLowerCase();
        if (['dcm'].includes(fileExtension)) {
          setFile(selectedFile);
          displayDicomImage(selectedFile, dicomViewerRef);
          extractMetadata(selectedFile, setMetadata);
        } else {
          alert('Invalid file type. Please upload a DICOM image.');
        }
      }
    },
    accept: '.dcm',
  });

  const displayDicomImage = (file, viewerRef) => {
    const fileReader = new FileReader();
    fileReader.onload = function (e) {
      const arrayBuffer = e.target.result;
      const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
      cornerstone.loadImage(imageId).then(image => {
        const viewport = cornerstone.getDefaultViewportForImage(viewerRef.current, image);
        cornerstone.displayImage(viewerRef.current, image, viewport);
      });
    };
    fileReader.readAsArrayBuffer(file);
  };

  const handleDownloadKey = async () => {
    try {
        const response = await axios.get('http://localhost:5000/download_key', {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const a = document.createElement('a');
        a.href = url;
        a.download = 'secret.key';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (error) {
        console.error('Error downloading key:', error);
        setError('An error occurred while downloading the key.');
    }
};


  const extractMetadata = (file, setMetadata) => {
    const fileReader = new FileReader();
    fileReader.onload = function (e) {
      const arrayBuffer = e.target.result;
      const dataSet = dicomParser.parseDicom(new Uint8Array(arrayBuffer));
      const metadata = {
        PatientName: dataSet.string('x00100010'),
        PatientID: dataSet.string('x00100020'),
        PatientBirthDate: dataSet.string('x00100030'),
        PatientSex: dataSet.string('x00100040'),
        StudyDescription: dataSet.string('x00081030'),
        SeriesDescription: dataSet.string('x0008103e'),
        InstitutionName: dataSet.string('x00080080')
      };
      setMetadata(metadata);
    };
    fileReader.readAsArrayBuffer(file);
  };

  const handleMethodChange = (event) => {
    setMethod(event.target.value);
  };

  const handleAnonymize = async () => {
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('method', method);

    try {
      const response = await axios.post('http://localhost:5000/anonymize', formData, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      setProcessedUrl(url);
      setProcessedFile(new File([response.data], 'anonymized.dcm'));
      displayDicomImage(response.data, processedViewerRef);
      extractMetadata(response.data, setProcessedMetadata);
    } catch (error) {
      console.error('Error anonymizing file:', error);
      setError('An error occurred while anonymizing the file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <Grid container spacing={3}>
        <Grid item xs={12} {...getRootProps({ style: { border: '2px dashed #eeeeee', padding: '20px', textAlign: 'center' } })}>
          <input {...getInputProps()} />
          <Typography variant="body2">
            {file ? `Selected file: ${file.name}` : 'Drag & drop a DICOM file here, or click to select one'}
          </Typography>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth variant="outlined" style={{ marginTop: '20px' }}>
            <InputLabel>Anonymization Method</InputLabel>
            <Select value={method} onChange={handleMethodChange} label="Anonymization Method">
              <MenuItem value="suppression">Suppression</MenuItem>
              <MenuItem value="randomization">Randomization</MenuItem>
              <MenuItem value="encryption">Encryption</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleAnonymize}
            disabled={!file || loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Anonymize'}
          </Button>
        </Grid>
        <Grid item xs={12} md={6}>
          {metadata && (
            <Card>
              <CardContent>
                <Typography variant="h5" component="h2">
                  DICOM Metadata
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
        <Grid item xs={12} md={6}>
          {processedMetadata && (
            <Card>
              <CardContent>
                <Typography variant="h5" component="h2">
                  Processed DICOM Metadata
                </Typography>
                {Object.entries(processedMetadata).map(([key, value]) => (
                  <Typography variant="body2" component="p" key={key}>
                    <strong>{key}:</strong> {value}
                  </Typography>
                ))}
              </CardContent>
            </Card>
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          <div style={{ marginTop: '20px', width: '100%', height: '512px' }}>
            <div ref={dicomViewerRef} style={{ width: '100%', height: '100%' }}></div>
          </div>
        </Grid>
        <Grid item xs={12} md={6}>
          <div style={{ marginTop: '20px', width: '100%', height: '512px' }}>
            <div ref={processedViewerRef} style={{ width: '100%', height: '100%' }}></div>
          </div>
          {processedFile && (
            <>
            <Button
              variant="contained"
              color="secondary"
              href={processedUrl}
              download="anonymized.dcm"
              style={{ marginTop: '20px', paddingLeft: '50px', paddingRight: '20px' }}
            >
              Download Anonymized DICOM
            </Button>

            <Button
                variant="contained"
                color="secondary"
                onClick={handleDownloadKey}
                style={{ marginTop: '20px' }}
            >
                Download Encryption Key
            </Button>

            </>
            
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
