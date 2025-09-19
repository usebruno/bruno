import React from 'react';
import { IconAlertCircle } from '@tabler/icons';
import ToolHint from 'components/ToolHint';

const ScriptErrorIcon = ({ itemUid, onClick }) => {
  const toolhintId = `script-error-icon-${itemUid}`;
  
  return (
    <>
      <div 
        id={toolhintId}
        className="cursor-pointer ml-2"
        onClick={onClick}
      >
        <div className="flex items-center text-red-400">
          <IconAlertCircle size={16} strokeWidth={1.5} className="stroke-current" />
        </div>
      </div>
      <ToolHint
        toolhintId={toolhintId}
        text="Script execution error occurred"
        place="bottom"
      />
    </>
  );
};

export default ScriptErrorIcon; 