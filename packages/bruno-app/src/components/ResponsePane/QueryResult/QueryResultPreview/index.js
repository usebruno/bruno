import React, { useState, useEffect, memo } from 'react';
import CodeEditor from 'components/CodeEditor/index';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { Document, Page } from 'react-pdf';
import 'pdfjs-dist/build/pdf.worker';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import AgGridVisualizationTable from './AgGridVisualizationTable/index';
import VisualizationTable from './VisualizationTable/index';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';

GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';

const VideoPreview = memo(({ contentType, dataBuffer }) => {
  const [videoError, setVideoError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState(null);

  useEffect(() => {
    const videoType = contentType.split(';')[0];
    try {
      const byteArray = Uint8Array.from(atob(dataBuffer), (c) => c.charCodeAt(0));
      const blob = new Blob([byteArray], { type: videoType });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
      return () => URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Video processing error:', error);
      setVideoError(true);
    }
  }, [contentType, dataBuffer]);

  if (videoError || !videoUrl) return <div>Failed to load video</div>;

  return (
    <video
      controls
      src={videoUrl}
      className="mx-auto max-w-full"
      onError={(e) => {
        console.error('Error loading video:', e);
        setVideoError(true);
        setIsLoading(false);
      }}
      onLoadedData={() => setIsLoading(false)}
      style={{ display: isLoading ? 'none' : 'block' }}
    />
  );
});

const TablePreview = memo(({ data }) => {
  if (!data) return null;

  switch (data?.data?.provider) {
    case 'ag-grid':
      return <AgGridVisualizationTable data={data} />;
    case 'react-table':
      return <VisualizationTable data={data} />;
    default:
      return <div>Table Provider not supported</div>;
  }
});

const QueryResultPreview = ({
  previewTab,
  allowedPreviewModes,
  data,
  dataBuffer,
  formattedData,
  item,
  contentType,
  collection,
  mode,
  disableRunEventListener,
  displayedTheme,
  visualizations
}) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();
  const [numPages, setNumPages] = useState(null);

  const onRun = () => {
    if (disableRunEventListener) return;
    dispatch(sendRequest(item, collection.uid));
  };

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
  };

  // Fail safe, so we don't render anything with an invalid tab
  if (!allowedPreviewModes.find((mode) => mode?.uid === previewTab?.uid)) {
    return null;
  }

  const renderPreview = () => {
    switch (previewTab?.mode) {
      case 'preview-web': {
        const webViewSrc = data.replace('<head>', `<head><base href="${item?.requestSent?.url || ''}">`);
        return (
          <webview
            src={`data:text/html; charset=utf-8,${encodeURIComponent(webViewSrc)}`}
            webpreferences="disableDialogs=true, javascript=yes"
            className="h-full bg-white"
          />
        );
      }
      case 'preview-pdf': {
        return (
          <div className="preview-pdf" style={{ height: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
            <Document file={`data:application/pdf;base64,${dataBuffer}`} onLoadSuccess={onDocumentLoadSuccess}>
              {Array.from(new Array(numPages), (el, index) => (
                <Page key={`page_${index + 1}`} pageNumber={index + 1} renderAnnotationLayer={false} />
              ))}
            </Document>
          </div>
        );
      }
      case 'preview-video':
        return <VideoPreview contentType={contentType} dataBuffer={dataBuffer} />;
      case 'preview-image':
        return <img src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} className="mx-auto" />;
      case 'preview-audio':
        return (
          <audio controls src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} className="mx-auto" />
        );
      case 'table':
        const tableData = visualizations.find((v) => v?.uid === previewTab?.uid);
        return <TablePreview data={tableData} />;
      case 'raw':
      default:
        return (
          <CodeEditor
            collection={collection}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            theme={displayedTheme}
            onRun={onRun}
            value={formattedData}
            mode={mode}
            readOnly
          />
        );
    }
  };

  return <React.Suspense fallback={<div>Loading preview...</div>}>{renderPreview()}</React.Suspense>;
};

export default memo(QueryResultPreview);
