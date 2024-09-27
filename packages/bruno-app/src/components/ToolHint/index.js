import React from 'react';
import { Tooltip as ReactToolHint } from 'react-tooltip';
import StyledWrapper from './StyledWrapper';
import { useTheme } from 'providers/Theme';

const ToolHint = ({
  text,
  toolhintId,
  children,
  tooltipStyle = {},
  place = 'top',
  offset,
  theme = null
}) => {
  const { theme: contextTheme } = useTheme();
  const appliedTheme = theme || contextTheme;

  const toolhintBackgroundColor = appliedTheme?.sidebar.badge.bg || 'black';
  const toolhintTextColor = appliedTheme?.text || 'white';

  const combinedToolhintStyle = {
    ...tooltipStyle,
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    backgroundColor: toolhintBackgroundColor,
    color: toolhintTextColor
  };

  return (
    <>
      <span id={toolhintId}>{children}</span>
      <StyledWrapper theme={appliedTheme}>
        <ReactToolHint
          anchorId={toolhintId}
          html={text}
          className="toolhint"
          offset={offset}
          place={place}
          noArrow={true}
          style={combinedToolhintStyle}
        />
      </StyledWrapper>
    </>
  );
};

export default ToolHint;
