import React, { useCallback, useState, useRef } from 'react';
import CodeEditor from 'components/CodeEditor/index';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { newHttpRequest, sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
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
import { sanitizeName } from 'utils/common/regex';
import { flattenItems, isItemARequest } from 'utils/collections';
import toast from 'react-hot-toast';
import { formatIpcError } from 'utils/common/error';

const LINKED_REQUEST_FALLBACK_NAME = 'Linked Request';

const getRequestNameFromUrl = (url) => {
  try {
    const { hostname, pathname } = new URL(url);
    const pathSegment = pathname.split('/').filter(Boolean).pop();
    return decodeURIComponent(pathSegment || hostname || LINKED_REQUEST_FALLBACK_NAME) || LINKED_REQUEST_FALLBACK_NAME;
  } catch (e) {
    return LINKED_REQUEST_FALLBACK_NAME;
  }
};

const getUniqueLinkedRequestFilename = (collection, requestName) => {
  const baseFilename = sanitizeName(requestName) || LINKED_REQUEST_FALLBACK_NAME;
  const existingFilenames = new Set(
    flattenItems(collection?.items || [])
      .filter(isItemARequest)
      .map((requestItem) => String(requestItem.filename || '').replace(/\.(bru|ya?ml)$/i, '').trim())
  );

  if (!existingFilenames.has(baseFilename)) {
    return baseFilename;
  }

  let suffix = 2;
  while (existingFilenames.has(`${baseFilename} (${suffix})`)) {
    suffix += 1;
  }
  return `${baseFilename} (${suffix})`;
};

const isPutObjectPresignedUrl = (url) => {
  try {
    return new URL(url).searchParams.get('x-id')?.toLowerCase() === 'putobject';
  } catch (e) {
    return false;
  }
};

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

  const handleResponseLinkClick = useCallback((url) => {
    if (!url || !collection?.uid) {
      return;
    }

    const requestName = getRequestNameFromUrl(url);
    const isPutObject = isPutObjectPresignedUrl(url);

    dispatch(
      newHttpRequest({
        requestName,
        filename: getUniqueLinkedRequestFilename(collection, requestName),
        requestType: 'http-request',
        requestUrl: url,
        requestMethod: isPutObject ? 'PUT' : 'GET',
        collectionUid: collection.uid,
        itemUid: null,
        isTransient: true,
        auth: {
          mode: 'none'
        },
        settings: {
          encodeUrl: false
        },
        ...(isPutObject ? { requestPaneTab: 'body' } : {})
      })
    ).catch((err) => toast.error(formatIpcError(err) || 'An error occurred while adding the request'));
  }, [collection, dispatch]);

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
        onLinkClick={handleResponseLinkClick}
        readOnly
      />
    );
  }

  switch (previewMode) {
    case 'preview-web': {
      const baseUrl = item.requestSent?.url || '';
      return <HtmlPreview data={data} baseUrl={baseUrl} />;
    }
    case 'preview-image': {
      return <img src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} />;
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
    case 'preview-audio': {
      return (
        <audio controls src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} className="mx-auto" />
      );
    }
    case 'preview-video': {
      return <VideoPreview contentType={contentType} dataBuffer={dataBuffer} />;
    }
    case 'preview-json': {
      return <JsonPreview data={data} displayedTheme={displayedTheme} onLinkClick={handleResponseLinkClick} />;
    }

    case 'preview-text': {
      return <TextPreview data={data} />;
    }

    case 'preview-xml': {
      return <XmlPreview data={data} />;
    }

    default:
      return (
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
