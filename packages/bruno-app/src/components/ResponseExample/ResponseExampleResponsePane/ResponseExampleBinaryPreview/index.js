import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'pdfjs-dist/build/pdf.worker';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
import VideoPreview from 'components/ResponsePane/QueryResult/QueryResultPreview/VideoPreview';

export const getBinaryPreviewType = (mime) => {
  if (typeof mime !== 'string') {
    return null;
  }

  if (mime === 'application/pdf') {
    return 'pdf';
  }
  if (mime.startsWith('image/') && !mime.endsWith('+xml')) {
    return 'image';
  }
  if (mime.startsWith('audio/')) {
    return 'audio';
  }
  if (mime.startsWith('video/')) {
    return 'video';
  }
  return null;
};

const ResponseExampleBinaryPreview = ({ contentType, content }) => {
  const [numPages, setNumPages] = useState(null);
  const mime = String(contentType).toLowerCase().split(';')[0].trim();
  const previewType = getBinaryPreviewType(mime);

  switch (previewType) {
    case 'image': {
      return <img src={`data:${mime};base64,${content}`} />;
    }
    case 'pdf': {
      return (
        <div className="preview-pdf" style={{ height: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          <Document file={`data:application/pdf;base64,${content}`} onLoadSuccess={({ numPages }) => setNumPages(numPages)}>
            {Array.from(new Array(numPages), (el, index) => (
              <Page key={`page_${index + 1}`} pageNumber={index + 1} renderAnnotationLayer={false} />
            ))}
          </Document>
        </div>
      );
    }
    case 'audio': {
      return <audio controls src={`data:${mime};base64,${content}`} className="mx-auto" />;
    }
    case 'video': {
      return <VideoPreview contentType={mime} dataBuffer={content} />;
    }
    default:
      return null;
  }
};

export default ResponseExampleBinaryPreview;
