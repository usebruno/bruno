import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import CodeEditor from 'components/CodeEditor/index';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { usePersistedState } from 'hooks/usePersistedState';
import { Document, Page } from 'react-pdf';
import 'pdfjs-dist/build/pdf.worker';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { GlobalWorkerOptions } from 'pdfjs-dist/build/pdf';
GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.min.mjs';
import XmlPreview from './XmlPreview/index';
import TextPreview from './TextPreview';
import HtmlPreview from './HtmlPreview';
import VideoPreview from './VideoPreview';
import JsonPreview from './JsonPreview';

const QueryResultPreview = ({
  selectedTab,
  data,
  dataBuffer,
  formattedData,
  item,
  contentType,
  collection,
  codeMirrorMode,
  previewMode,
  disableRunEventListener,
  displayedTheme,
  docKey
}) => {
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();
  const editorRef = useRef(null);
  const previewContainerRef = useRef(null);

  const handlePreviewKeyDown = useCallback((e) => {
    const isCtrlOrCmd = e.ctrlKey || e.metaKey;
    if (isCtrlOrCmd && e.key === 'f') {
      e.preventDefault();
      e.stopPropagation();
      toast('Search is not available in Preview mode. Switch to Editor mode to search.', { icon: '🔍' });
    }
  }, []);

  useEffect(() => {
    if (selectedTab !== 'preview') return;
    const container = previewContainerRef.current;
    if (!container) return;
    container.addEventListener('keydown', handlePreviewKeyDown, true);
    return () => container.removeEventListener('keydown', handlePreviewKeyDown, true);
  }, [selectedTab, handlePreviewKeyDown]);

  const wrapPreview = useCallback((content) => (
    // tabIndex makes the div focusable so keydown events are captured
    <div ref={previewContainerRef} tabIndex={-1} style={{ outline: 'none', height: '100%' }}>
      {content}
    </div>
  ), []);

  const [responseScroll, setResponseScroll] = usePersistedState({ key: `response-body-scroll-${item.uid}`, default: 0 });

  const [numPages, setNumPages] = useState(null);
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const onRun = () => {
    if (disableRunEventListener) {
      return;
    }

    dispatch(sendRequest(item, collection.uid));
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  if (selectedTab === 'editor') {
    return (
      <CodeEditor
        ref={editorRef}
        collection={collection}
        docKey={docKey || 'response:editor'}
        font={get(preferences, 'font.codeFont', 'default')}
        fontSize={get(preferences, 'font.codeFontSize')}
        theme={displayedTheme}
        onRun={onRun}
        onSave={onSave}
        value={formattedData}
        mode={codeMirrorMode}
        initialScroll={responseScroll}
        onScroll={setResponseScroll}
        readOnly
      />
    );
  }

  switch (previewMode) {
    case 'preview-web': {
      const baseUrl = item.requestSent?.url || '';
      return wrapPreview(<HtmlPreview data={data} baseUrl={baseUrl} />);
    }
    case 'preview-image': {
      return wrapPreview(<img src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} />);
    }
    case 'preview-pdf': {
      return wrapPreview(
        <div className="preview-pdf" style={{ height: '100%', overflow: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
          <Document file={`data:application/pdf;base64,${dataBuffer}`} onLoadSuccess={onDocumentLoadSuccess}>
            {Array.from(new Array(numPages), (el, index) => (
              <Page key={`page_${index + 1}`} pageNumber={index + 1} renderAnnotationLayer={false} />
            ))}
          </Document>
        </div>
      );
    }
    case 'preview-audio': {
      return wrapPreview(
        <audio controls src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} className="mx-auto" />
      );
    }
    case 'preview-video': {
      return wrapPreview(<VideoPreview contentType={contentType} dataBuffer={dataBuffer} />);
    }
    case 'preview-json': {
      return wrapPreview(<JsonPreview data={data} displayedTheme={displayedTheme} />);
    }

    case 'preview-text': {
      return wrapPreview(<TextPreview data={data} />);
    }

    case 'preview-xml': {
      return wrapPreview(<XmlPreview data={data} />);
    }

    default:
      return wrapPreview(
        <div className="p-4 flex flex-col items-center justify-center h-full text-center">
          <div className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-2">
            No Preview Available
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Sorry, no preview is available for this content type.
          </div>
        </div>
      );
  }
};

export default QueryResultPreview;
