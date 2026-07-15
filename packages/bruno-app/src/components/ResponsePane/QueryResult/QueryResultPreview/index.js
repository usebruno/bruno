import React, { useState, useRef } from 'react';
import CodeEditor from 'components/CodeEditor/index';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { usePersistedState } from 'hooks/usePersistedState';
// PdfPreview is lazy-loaded so pdfjs-dist (582 KiB) stays out of the main bundle
const PdfPreview = React.lazy(() => import('./PdfPreview'));
import XmlPreview from './XmlPreview/index';
import TextPreview from './TextPreview';
import HtmlPreview from './HtmlPreview';
import VideoPreview from './VideoPreview';
const JsonPreview = React.lazy(() => import('./JsonPreview'));

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
      return <HtmlPreview data={data} baseUrl={baseUrl} />;
    }
    case 'preview-image': {
      return <img src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} />;
    }
    case 'preview-pdf': {
      return (
        <React.Suspense fallback={<div className="p-4">Loading PDF viewer…</div>}>
          <PdfPreview dataBuffer={dataBuffer} />
        </React.Suspense>
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
      return (
        <React.Suspense fallback={null}>
          <JsonPreview data={data} displayedTheme={displayedTheme} />
        </React.Suspense>
      );
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
