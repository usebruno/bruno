import React from 'react';
import { Tooltip as ReactToolHint } from 'react-tooltip';
import { useTheme } from 'providers/Theme';

const ToolHint = ({
  text,
  toolhintId,
  tooltipId,
  anchorSelect,
  children,
  tooltipStyle = {},
  place = 'top',
  hidden = false,
  offset,
  positionStrategy,
  theme = null,
  className = '',
  delayShow = 200,
  dataTestId,
  tooltipTestId
}) => {
  const { theme: contextTheme } = useTheme();
  const appliedTheme = theme || contextTheme;

  const toolhintBackgroundColor = appliedTheme?.background.surface0;
  const toolhintTextColor = appliedTheme?.text;

  const combinedToolhintStyle = {
    ...tooltipStyle,
    fontSize: '0.75rem',
    padding: '0.25rem 0.5rem',
    zIndex: 9999,
    backgroundColor: toolhintBackgroundColor,
    color: toolhintTextColor
  };

  const usesExternalAnchor = Boolean(tooltipId || anchorSelect);
  const toolhintProps_final = tooltipId
    ? { id: tooltipId }
    : anchorSelect
      ? { anchorSelect }
      : { anchorId: toolhintId };

  return (
    <>
      {!usesExternalAnchor && <span id={toolhintId} className={className} data-testid={dataTestId}>{children}</span>}
      {usesExternalAnchor && children}
      <ReactToolHint
        {...toolhintProps_final}
        content={usesExternalAnchor ? undefined : text}
        render={tooltipTestId ? ({ content }) => <span data-testid={tooltipTestId}>{content}</span> : undefined}
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
