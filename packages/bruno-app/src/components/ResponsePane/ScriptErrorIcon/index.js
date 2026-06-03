import React from 'react';
import { useTranslation } from 'react-i18next';
import classnames from 'classnames';
import { IconAlertCircle } from '@tabler/icons';
import ToolHint from 'components/ToolHint';

const ScriptErrorIcon = ({ itemUid, onClick, className }) => {
  const { t } = useTranslation();
  const toolhintId = `script-error-icon-${itemUid}`;

  return (
    <>
      <div
        id={toolhintId}
        className={classnames('cursor-pointer ml-2', className)}
        data-testid="script-error-icon"
        onClick={onClick}
      >
        <div className="flex items-center text-red-400">
          <IconAlertCircle size={16} strokeWidth={1.5} className="stroke-current" />
        </div>
      </div>
      <ToolHint
        toolhintId={toolhintId}
        text={t('RESPONSE_PANE.SCRIPT_EXECUTION_ERROR')}
        place="bottom"
      />
    </>
  );
};

export default ScriptErrorIcon;
