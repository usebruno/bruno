import React from 'react';
import get from 'lodash/get';
import { useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';

const Hooks = ({
  value = '',
  onEdit,
  onSave,
  onRun,
  collection,
  item,
  showHintsFor = ['req', 'res', 'bru']
}) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  return (
    <CodeEditor
      collection={collection}
      item={item}
      value={value}
      theme={displayedTheme}
      font={get(preferences, 'font.codeFont', 'default')}
      fontSize={get(preferences, 'font.codeFontSize')}
      onEdit={onEdit}
      mode="javascript"
      onRun={onRun}
      onSave={onSave}
      showHintsFor={showHintsFor}
    />
  );
};

export default Hooks;
