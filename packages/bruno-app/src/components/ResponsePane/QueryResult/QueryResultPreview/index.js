import React, { useState, useMemo } from 'react';
import CodeEditor from 'components/CodeEditor/index';
import { get } from 'lodash';
import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { updateResponsePaneScrollPosition, selectTabsForLocation, selectActiveTabIdForLocation } from 'providers/ReduxStore/slices/tabs';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
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

const LOCATION = 'request-pane';

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
  displayedTheme
}) => {
  const preferences = useSelector((state) => state.app.preferences);
  const tabs = useSelector(selectTabsForLocation(LOCATION));
  const activeTabUid = useSelector(selectActiveTabIdForLocation(LOCATION));
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);

  const dispatch = useDispatch();

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

  const onScroll = (event) => {
    dispatch(
      updateResponsePaneScrollPosition({
        uid: focusedTab.uid,
        scrollY: event.doc.scrollTop,
        location: LOCATION
      })
    );
  };

  if (selectedTab === 'editor') {
    return (
      <CodeEditor
        collection={collection}
        font={get(preferences, 'font.codeFont', 'default')}
        fontSize={get(preferences, 'font.codeFontSize')}
        theme={displayedTheme}
        onRun={onRun}
        onSave={onSave}
        onScroll={onScroll}
        value={formattedData}
        mode={codeMirrorMode}
        initialScroll={focusedTab?.properties?.responsePaneScrollPosition || 0}
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
      return <JsonPreview data={data} displayedTheme={displayedTheme} />;
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
