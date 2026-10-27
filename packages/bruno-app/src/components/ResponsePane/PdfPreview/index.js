import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'pdfjs-dist/build/pdf.worker';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
import StyledWrapper from './StyledWrapper';

GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

const PdfPreview = ({ dataBuffer }) => {
  const [loaded, setLoaded] = useState({ file: null, numPages: 0 });
  // The page count belongs to the document it was read from, so a new document never renders with the old count
  const numPages = loaded.file === dataBuffer ? loaded.numPages : 0;

  return (
    <StyledWrapper className="preview-pdf" style={{ height: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
      <Document file={`data:application/pdf;base64,${dataBuffer}`} onLoadSuccess={({ numPages }) => setLoaded({ file: dataBuffer, numPages })}>
        {Array.from(new Array(numPages), (el, index) => (
          <Page key={`page_${index + 1}`} pageNumber={index + 1} renderAnnotationLayer={false} />
        ))}
      </Document>
    </StyledWrapper>
  );
};

export default PdfPreview;
