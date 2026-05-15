import React from 'react';
import { useTranslation } from 'react-i18next';
import CodeEditor from 'components/CodeEditor';

const DotEnvRawView = ({
  collection,
  item,
  theme,
  value,
  onChange,
  onSave,
  onReset,
  isSaving
}) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="raw-editor-container" data-testid="dotenv-raw-editor">
        <CodeEditor
          collection={collection}
          item={item}
          theme={theme}
          value={value}
          onEdit={onChange}
          onSave={onSave}
          mode="text/plain"
          enableVariableHighlighting={false}
          enableBrunoVarInfo={false}
        />
      </div>
      <div className="button-container">
        <div className="flex items-center">
          <button type="button" className="submit" onClick={onSave} disabled={isSaving} data-testid="save-dotenv-raw">
            {isSaving ? t('ENVIRONMENTS.SAVING') : t('ENVIRONMENTS.SAVE')}
          </button>
          <button type="button" className="submit reset ml-2" onClick={onReset} disabled={isSaving} data-testid="reset-dotenv-raw">
            {t('ENVIRONMENTS.RESET')}
          </button>
        </div>
      </div>
    </>
  );
};

export default DotEnvRawView;
