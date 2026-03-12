import React from 'react';
import { IconAlertTriangle } from '@tabler/icons';
import ToolHint from 'components/ToolHint';

const ScriptWarningIcon = ({ itemUid, onClick }) => {
  const toolhintId = `script-warning-icon-${itemUid}`;

  return (
    <>
      <div
        id={toolhintId}
        className="cursor-pointer ml-2"
        onClick={onClick}
      >
        <div className="flex items-center text-yellow-600">
          <IconAlertTriangle size={16} strokeWidth={1.5} className="stroke-current" />
        </div>
      </div>
      <ToolHint
        toolhintId={toolhintId}
        text="Unsupported Postman API warnings"
        place="bottom"
      />
    </>
  );
};

export default ScriptWarningIcon;
