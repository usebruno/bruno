/**
 * PdfPreview — lazy-loaded PDF renderer.
 *
 * Isolating pdfjs-dist (582 KiB) here so it only loads when a user actually
 * receives a PDF response, not at app startup or on first request tab open.
 */
import React, { useState } from 'react';
import { Document, Page } from 'react-pdf';
import 'pdfjs-dist/build/pdf.worker';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';

GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

const PdfPreview = ({ dataBuffer }) => {
  const [numPages, setNumPages] = useState(null);

  return (
    <div className="preview-pdf" style={{ height: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
      <Document
        file={`data:application/pdf;base64,${dataBuffer}`}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
      >
        {Array.from(new Array(numPages), (el, index) => (
          <Page key={`page_${index + 1}`} pageNumber={index + 1} renderAnnotationLayer={false} />
        ))}
      </Document>
    </div>
  );
};

export default PdfPreview;
