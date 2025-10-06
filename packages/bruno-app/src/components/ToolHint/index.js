import React from 'react';
import { Tooltip as ReactToolHint } from 'react-tooltip';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';

const ToolHint = ({
  text,
  toolhintId,
  anchorSelect,
  children,
  tooltipStyle = {},
  place = 'top',
  offset,
  positionStrategy,
  theme = null,
  className = '',
  ...toolhintProps
}) => {
  const { theme: contextTheme } = useTheme();
  const appliedTheme = theme || contextTheme;

  const toolhintBackgroundColor = appliedTheme?.sidebar.badge.bg || 'black';
  const toolhintTextColor = appliedTheme?.text || 'white';

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

      <StyledWrapper theme={appliedTheme}>
        <ReactToolHint
          {...toolhintProps_final}
          content={anchorSelect ? undefined : text}
          className="toolhint"
          offset={offset}
          place={place}
          positionStrategy={positionStrategy}
          noArrow={true}
          style={combinedToolhintStyle}
          {...toolhintProps}
        />
      </StyledWrapper>
    </>
  );
};

export default ToolHint;
