import { useState } from 'react';
import { Document, Page } from 'react-pdf';

const PdfResultViewer = ({ dataBuffer }) => {
  const [numPages, setNumPages] = useState(null);
  function onDocumentLoadSuccess({ numPages }) {
    // Only show up to 50 pages, because more will cause lag
    setNumPages(Math.min(numPages, 50));
  }

  return (
    <div className="preview-pdf" style={{ height: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
      <Document file={`data:application/pdf;base64,${dataBuffer}`} onLoadSuccess={onDocumentLoadSuccess}>
        {Array.from(new Array(numPages), (el, index) => (
          <Page key={`page_${index + 1}`} pageNumber={index + 1} renderAnnotationLayer={false} />
        ))}
      </Document>
    </div>
  );
};

export default PdfResultViewer;
