import React, { forwardRef, useImperativeHandle, useRef, useCallback } from 'react';
import fastJsonFormat from 'fast-json-format';
import toast from 'react-hot-toast';
import { IconIndentIncrease } from '@tabler/icons';
import classnames from 'classnames';
import ActionIcon from 'ui/ActionIcon/index';
import StyledWrapper from './StyledWrapper';

const toJsonText = (data) => {
  if (typeof data === 'string') return data;
  if (data === undefined || data === null) return null;
  try {
    return JSON.stringify(data);
  } catch {
    return null;
  }
};

/**
 * Prettify only works on in-memory response `data`.
 * File-backed / windowed bodies stay on byte-offset reads — formatting them
 * would replace the sliding viewport and break scroll virtualization.
 */
export const useResponsePrettify = (data, onPrettified) => {
  const text = toJsonText(data);
  const canPrettify = text != null && text !== '';

  const prettify = useCallback(() => {
    if (!canPrettify) return;

    try {
      onPrettified?.(fastJsonFormat(text));
      toast.success('JSON formatted');
    } catch (err) {
      toast.error(err?.message || 'Failed to format JSON');
    }
  }, [canPrettify, text, onPrettified]);

  return {
    prettify,
    canPrettify,
    isDisabled: !canPrettify
  };
};

const ResponsePrettify = forwardRef(({ data, onPrettified, children }, ref) => {
  const { prettify, isDisabled, canPrettify } = useResponsePrettify(data, onPrettified);
  const elementRef = useRef(null);

  useImperativeHandle(ref, () => ({
    click: () => elementRef.current?.click(),
    isDisabled
  }), [isDisabled]);

  const handleClick = () => {
    if (!isDisabled) {
      prettify();
    }
  };

  const title = !children
    ? (canPrettify ? 'Prettify JSON' : 'Prettify is only available for in-memory JSON responses')
    : null;

  return (
    <div
      ref={elementRef}
      onClick={handleClick}
      title={title}
      aria-disabled={isDisabled}
      className={classnames({
        'opacity-50 cursor-not-allowed': isDisabled && !children
      })}
      data-testid="response-prettify-btn"
    >
      {children ? children : (
        <StyledWrapper className="flex items-center">
          <ActionIcon className="p-1" disabled={isDisabled} label="Prettify JSON">
            <IconIndentIncrease size={16} strokeWidth={2} />
          </ActionIcon>
        </StyledWrapper>
      )}
    </div>
  );
});

ResponsePrettify.displayName = 'ResponsePrettify';

export default ResponsePrettify;
