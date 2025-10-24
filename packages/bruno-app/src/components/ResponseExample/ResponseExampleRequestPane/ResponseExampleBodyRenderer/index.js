import React from 'react';
import { useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import get from 'lodash/get';
import CodeEditor from 'components/CodeEditor';
import ResponseExampleFormUrlEncodedParams from '../ResponseExampleFormUrlEncodedParams';
import ResponseExampleMultipartFormParams from '../ResponseExampleMultipartFormParams';
import ResponseExampleFileBody from '../ResponseExampleFileBody';

const ResponseExampleBodyRenderer = ({
  bodyMode,
  body,
  editMode,
  item,
  collection,
  exampleUid,
  onBodyEdit,
  onSave
}) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const getBodyContent = () => {
    if (!body) return '';

    switch (bodyMode) {
      case 'json':
        return body.json || '';
      case 'text':
        return body.text || '';
      case 'xml':
        return body.xml || '';
      case 'sparql':
        return body.sparql || '';
      default:
        return '';
    }
  };

  const getCodeMirrorMode = () => {
    const modeMap = {
      json: 'application/ld+json',
      text: 'application/text',
      xml: 'application/xml',
      sparql: 'application/sparql-query'
    };
    return modeMap[bodyMode] || 'application/text';
  };

  const renderBodyContent = () => {
    switch (bodyMode) {
      case 'none':
        return (
          <div className="text-sm no-body-text">
            No Body
          </div>
        );

      case 'json':
      case 'xml':
      case 'text':
      case 'sparql':
        return (
          <div className="min-h-96">
            <CodeEditor
              collection={collection}
              item={item}
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
              value={getBodyContent()}
              onEdit={onBodyEdit}
              onRun={() => {}}
              onSave={onSave}
              mode={getCodeMirrorMode()}
              enableVariableHighlighting={true}
              showHintsFor={['variables']}
              readOnly={!editMode}
            />
          </div>
        );

      case 'formUrlEncoded':
        return <ResponseExampleFormUrlEncodedParams item={item} collection={collection} exampleUid={exampleUid} editMode={editMode} />;

      case 'multipartForm':
        return <ResponseExampleMultipartFormParams item={item} collection={collection} exampleUid={exampleUid} editMode={editMode} />;

      case 'file':
        return <ResponseExampleFileBody item={item} collection={collection} exampleUid={exampleUid} editMode={editMode} />;

      default:
        return (
          <div className="text-sm no-body-text">
            No Body
          </div>
        );
    }
  };

  return renderBodyContent();
};

export default ResponseExampleBodyRenderer;
