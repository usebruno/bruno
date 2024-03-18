import CodeEditor from 'components/CodeEditor';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { Document, Page } from 'react-pdf';
import { useState } from 'react';
import 'pdfjs-dist/build/pdf.worker';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { useTheme } from 'providers/Theme';
import PdfResultViewer from 'components/ResponsePane/QueryResult/QueryResultViewer/PdfResultViewer';

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
  disableRunEventListener
}) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const dispatch = useDispatch();

  // Fail safe, so we don't render anything with an invalid tab
  if (!allowedPreviewModes.includes(previewTab)) {
    return null;
  }

  const onRun = () => {
    if (disableRunEventListener) {
      return;
    }
    dispatch(sendRequest(item, collection.uid));
  };

  switch (previewTab) {
    case 'preview-web': {
      const webViewSrc = data.replace('<head>', `<head><base href="${item.requestSent?.url || ''}">`);
      return (
        <webview
          src={`data:text/html; charset=utf-8,${encodeURIComponent(webViewSrc)}`}
          webpreferences="disableDialogs=true, javascript=yes"
          className="h-full bg-white"
        />
      );
    }
    case 'preview-image': {
      return <img src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} className="mx-auto" />;
    }
    case 'preview-pdf': {
      return <PdfResultViewer dataBuffer={dataBuffer} />;
    }
    case 'pretty': {
      return (
        <CodeEditor
          collection={collection}
          font={get(preferences, 'font.codeFont', 'default')}
          theme={displayedTheme}
          onRun={onRun}
          value={formattedData}
          mode={mode}
          height={'100%'}
          readOnly
        />
      );
    }
    case 'preview-audio': {
      return (
        <audio controls src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} className="mx-auto" />
      );
    }
    case 'preview-video': {
      return (
        <video controls src={`data:${contentType.replace(/\;(.*)/, '')};base64,${dataBuffer}`} className="mx-auto" />
      );
    }
    default:
    case 'raw': {
      return (
        <CodeEditor
          collection={collection}
          font={get(preferences, 'font.codeFont', 'default')}
          theme={displayedTheme}
          onRun={onRun}
          value={atob(dataBuffer)}
          mode={mode}
          height={'100%'}
          readOnly
        />
      );
    }
  }
};

export default QueryResultPreview;
