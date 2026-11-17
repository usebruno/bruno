import React from 'react';
import { useTheme } from 'styled-components';
import useTooltipId from 'hooks/useTooltipId';
import Portal from 'ui/Portal';
import StyledTooltip from './StyledWrapper';

/**
 * @example
 * <Tooltip content="Save" shortcut="Cmd + S"><button>Save</button></Tooltip>
 * <Tooltip anchorId={inputId} content={error} delayShow={0} />
 * <Tooltip variant="rich" clickable content={<a href="#">Learn more</a>} />
 */
const Tooltip = ({
  children,
  content,
  variant = 'default',
  shortcut,
  id,
  anchorId,
  anchorSelect,
  place = 'top',
  width,
  maxWidth,
  offset,
  delayShow = 200,
  arrow = true,
  hidden = false,
  isOpen,
  clickable = false,
  className,
  'data-testid': dataTestId,
  tooltipTestId
}) => {
  const theme = useTheme();
  const generatedAnchorId = useTooltipId('tooltip-anchor');
  const wrapsChildren = Boolean(children);
  const anchorElementId = wrapsChildren ? anchorId || generatedAnchorId : anchorId;

  const renderBody = ({ content: anchorContent }) => {
    const body = anchorContent || content;
    if (body === null || body === undefined || body === '') {
      return null;
    }
    return (
      <>
        {tooltipTestId ? <span data-testid={tooltipTestId}>{body}</span> : body}
        {shortcut && <kbd className="tooltip-shortcut">{shortcut}</kbd>}
      </>
    );
  };

  return (
    <>
      {wrapsChildren && (
        <span id={anchorElementId} className={className} data-testid={dataTestId}>
          {children}
        </span>
      )}
      <Portal>
        <StyledTooltip
          id={id}
          anchorSelect={anchorSelect}
          anchorId={anchorElementId}
          render={renderBody}
          $variant={variant}
          $width={width}
          $maxWidth={width || maxWidth || (variant === 'rich' ? '320px' : '240px')}
          place={place}
          offset={offset}
          delayShow={delayShow}
          hidden={hidden}
          isOpen={isOpen}
          clickable={clickable}
          positionStrategy="fixed"
          noArrow={!arrow}
          border={`1px solid ${theme.border.border1}`}
          opacity={1}
        />
      </Portal>
    </>
  );
};

export default Tooltip;
