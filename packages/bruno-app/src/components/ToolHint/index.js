import React from 'react';
import { Tooltip as ReactToolHint } from 'react-tooltip';
import { useTheme } from 'providers/Theme';

const ToolHint = ({
  text,
  toolhintId,
  anchorSelect,
  children,
  tooltipStyle = {},
  place = 'top',
  hidden = false,
  offset,
  positionStrategy,
  theme = null,
  className = '',
  delayShow = 200
}) => {
  const { theme: contextTheme } = useTheme();
  const appliedTheme = theme || contextTheme;

  const toolhintBackgroundColor = appliedTheme?.background.surface1;
  const toolhintTextColor = appliedTheme?.text;

  const combinedToolhintStyle = {
    ...tooltipStyle,
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    zIndex: 9999,
    backgroundColor: toolhintBackgroundColor,
    color: toolhintTextColor
  };

  const toolhintProps_final = anchorSelect
    ? { anchorSelect }
    : { anchorId: toolhintId };

  return (
    <>
      {!anchorSelect && <span id={toolhintId} className={className}>{children}</span>}
      {anchorSelect && children}
      <ReactToolHint
        {...toolhintProps_final}
        content={anchorSelect ? undefined : text}
        className="toolhint"
        offset={offset}
        place={place}
        hidden={hidden}
        positionStrategy={positionStrategy}
        noArrow={true}
        delayShow={delayShow}
        style={combinedToolhintStyle}
        opacity={1}
      />
    </>
  );
};

export default ToolHint;
