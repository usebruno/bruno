import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPortal } from 'react-dom';
import { IconX } from '@tabler/icons';
import {
  nextStep,
  completeGuideAndPersist,
  exitGuide,
  selectActiveGuideId,
  selectCurrentStepIndex,
  selectIsOnboardingActive,
  selectIsOnboardingPaused
} from 'providers/ReduxStore/slices/onboarding';
import { getGuideById, getGuideStep, getGuideTotalSteps } from '../guides';
import StyledWrapper from './StyledWrapper';

const TOOLTIP_OFFSET = 16;
const SPOTLIGHT_PADDING_DEFAULT = 8;

/**
 * Build a CSS clip-path polygon that covers the entire viewport
 * but has a rectangular hole where the spotlight is, so clicks
 * inside the spotlight pass through to the actual elements.
 */
const buildClipPath = (rect) => {
  if (!rect) return undefined;
  const { top, left, width, height } = rect;
  const r = left + width;
  const b = top + height;
  return `polygon(
    0% 0%, 0% 100%,
    ${left}px 100%, ${left}px ${top}px,
    ${r}px ${top}px, ${r}px ${b}px,
    ${left}px ${b}px, ${left}px 100%,
    100% 100%, 100% 0%
  )`;
};

const OnboardingOverlay = () => {
  const dispatch = useDispatch();
  const activeGuideId = useSelector(selectActiveGuideId);
  const currentStepIndex = useSelector(selectCurrentStepIndex);
  const isActive = useSelector(selectIsOnboardingActive);
  const isPaused = useSelector(selectIsOnboardingPaused);

  const [targetRect, setTargetRect] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [arrowPosition, setArrowPosition] = useState('bottom');
  const [isWaitingForElement, setIsWaitingForElement] = useState(false);

  const tooltipRef = useRef(null);
  const observerRef = useRef(null);
  const retryTimeoutRef = useRef(null);
  const removalObserverRef = useRef(null);

  const guide = activeGuideId ? getGuideById(activeGuideId) : null;
  const currentStep = guide ? getGuideStep(activeGuideId, currentStepIndex) : null;
  const totalSteps = guide ? getGuideTotalSteps(activeGuideId) : 0;
  const isLastStep = currentStepIndex === totalSteps - 1;

  const needsClickThrough = currentStep?.allowInteraction || currentStep?.highlightClick;

  // Find target element and update position
  const updateTargetPosition = useCallback(() => {
    if (!currentStep?.target) {
      setTargetRect(null);
      return false;
    }

    let selector = currentStep.target;
    let element;

    // Support :last suffix to select the last matching element
    if (selector.endsWith(':last')) {
      selector = selector.slice(0, -5);
      const elements = document.querySelectorAll(selector);
      element = elements.length > 0 ? elements[elements.length - 1] : null;
    } else {
      element = document.querySelector(selector);
    }

    if (!element) {
      setTargetRect(null);
      return false;
    }

    const rect = element.getBoundingClientRect();
    const padding = currentStep.spotlightPadding ?? SPOTLIGHT_PADDING_DEFAULT;

    setTargetRect({
      top: rect.top - padding,
      left: rect.left - padding,
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
      element
    });

    return true;
  }, [currentStep]);

  // Calculate tooltip position based on target and placement
  const updateTooltipPosition = useCallback(() => {
    if (!targetRect || !tooltipRef.current) return;

    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const placement = currentStep?.placement || 'bottom';
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top, left;
    let actualPlacement = placement;

    // Calculate initial position
    switch (placement) {
      case 'top':
        top = targetRect.top - tooltipRect.height - TOOLTIP_OFFSET;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.top + targetRect.height + TOOLTIP_OFFSET;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - TOOLTIP_OFFSET;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left + targetRect.width + TOOLTIP_OFFSET;
        break;
      default:
        top = targetRect.top + targetRect.height + TOOLTIP_OFFSET;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
    }

    // Flip if out of viewport
    if (placement === 'top' && top < 10) {
      top = targetRect.top + targetRect.height + TOOLTIP_OFFSET;
      actualPlacement = 'bottom';
    } else if (placement === 'bottom' && top + tooltipRect.height > viewportHeight - 10) {
      top = targetRect.top - tooltipRect.height - TOOLTIP_OFFSET;
      actualPlacement = 'top';
    } else if (placement === 'left' && left < 10) {
      left = targetRect.left + targetRect.width + TOOLTIP_OFFSET;
      actualPlacement = 'right';
    } else if (placement === 'right' && left + tooltipRect.width > viewportWidth - 10) {
      left = targetRect.left - tooltipRect.width - TOOLTIP_OFFSET;
      actualPlacement = 'left';
    }

    // Keep tooltip within viewport
    left = Math.max(10, Math.min(left, viewportWidth - tooltipRect.width - 10));
    top = Math.max(10, Math.min(top, viewportHeight - tooltipRect.height - 10));

    setTooltipPosition({ top, left });
    setArrowPosition(actualPlacement);
  }, [targetRect, currentStep?.placement]);

  // Watch for target element appearance
  useEffect(() => {
    if (!isActive || isPaused || !currentStep) return;

    const findElement = () => {
      const found = updateTargetPosition();
      if (found) {
        setIsWaitingForElement(false);
      } else if (currentStep.waitForElement) {
        // Still waiting for element to appear
        setIsWaitingForElement(true);
        retryTimeoutRef.current = setTimeout(findElement, 100);
      } else {
        setIsWaitingForElement(false);
      }
    };

    findElement();

    // Set up mutation observer for dynamic elements
    observerRef.current = new MutationObserver(() => {
      if (isWaitingForElement) {
        findElement();
      }
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Handle resize and scroll
    const handleReposition = () => updateTargetPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [isActive, isPaused, currentStep, updateTargetPosition, currentStepIndex, isWaitingForElement]);

  // Update tooltip position when target changes
  useEffect(() => {
    if (targetRect) {
      // Small delay to allow tooltip to render
      requestAnimationFrame(updateTooltipPosition);
    }
  }, [targetRect, updateTooltipPosition]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      dispatch(completeGuideAndPersist());
    } else {
      dispatch(nextStep());
    }
  }, [dispatch, isLastStep]);

  const handleExit = useCallback(() => {
    dispatch(exitGuide());
  }, [dispatch]);

  // For highlightClick steps, listen for clicks on the actual target element
  useEffect(() => {
    if (!isActive || !currentStep?.highlightClick || !targetRect?.element) return;

    const element = targetRect.element;

    const handleElementClick = () => {
      // Auto-advance after the element is clicked
      setTimeout(() => {
        if (!isLastStep) {
          dispatch(nextStep());
        } else {
          dispatch(completeGuideAndPersist());
        }
      }, 300);
    };

    element.addEventListener('click', handleElementClick);
    return () => element.removeEventListener('click', handleElementClick);
  }, [isActive, currentStep?.highlightClick, targetRect?.element, dispatch, isLastStep]);

  // For allowInteraction steps with advanceOnTargetRemoval,
  // watch for the target element being removed from DOM and auto-advance
  useEffect(() => {
    if (!isActive || !currentStep?.advanceOnTargetRemoval || !targetRect?.element) return;

    const element = targetRect.element;

    removalObserverRef.current = new MutationObserver(() => {
      // Check if the element is still connected to the DOM
      if (!element.isConnected) {
        removalObserverRef.current?.disconnect();
        // Auto-advance after a short delay to let the UI settle
        setTimeout(() => {
          if (!isLastStep) {
            dispatch(nextStep());
          } else {
            dispatch(completeGuideAndPersist());
          }
        }, 200);
      }
    });

    removalObserverRef.current.observe(document.body, {
      childList: true,
      subtree: true
    });

    return () => {
      removalObserverRef.current?.disconnect();
    };
  }, [isActive, currentStep?.advanceOnTargetRemoval, targetRect?.element, dispatch, isLastStep]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isActive) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleExit();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleExit]);

  if (!isActive || isPaused || !guide || isWaitingForElement) {
    return null;
  }

  const spotlightBorderRadius = currentStep?.spotlightBorderRadius;

  // For interactive/clickable steps, cut a hole in the click-catcher
  // so clicks pass through to the actual target element underneath
  const clickCatcherStyle = needsClickThrough && targetRect
    ? { clipPath: buildClipPath(targetRect) }
    : undefined;

  return createPortal(
    <StyledWrapper $pulse={currentStep?.pulse} $spotlightBorderRadius={spotlightBorderRadius}>
      {/* Click catcher - always rendered to block clicks outside spotlight.
          stopPropagation prevents document-level handlers (e.g. click-outside
          detectors) from seeing these blocked clicks. */}
      <div
        className="onboarding-click-catcher"
        style={clickCatcherStyle}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Spotlight highlight - its box-shadow creates the dark overlay */}
      {targetRect && (
        <div
          className="onboarding-spotlight"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height
          }}
        />
      )}

      {/* Tooltip - stopPropagation prevents tooltip clicks from triggering
          document-level handlers like click-outside detectors */}
      <div
        ref={tooltipRef}
        className="onboarding-tooltip"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tooltip-header">
          <h4 className="tooltip-title">{currentStep?.title}</h4>
          <button className="tooltip-close" onClick={handleExit} aria-label="Skip guide">
            <IconX size={16} stroke={1.5} />
          </button>
        </div>

        <div className="tooltip-content">
          {currentStep?.content}
        </div>

        <div className="tooltip-footer">
          <div className="tooltip-progress">
            <span className="progress-text">
              {currentStepIndex + 1} / {totalSteps}
            </span>
            <div className="progress-dots">
              {Array.from({ length: Math.min(totalSteps, 10) }).map((_, index) => (
                <span
                  key={index}
                  className={`dot ${index === currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'completed' : ''}`}
                />
              ))}
            </div>
          </div>

          <div className="tooltip-actions">
            {currentStep?.highlightClick ? (
              <span className="action-hint">Click the highlighted area</span>
            ) : currentStep?.allowInteraction ? (
              <button className="btn-primary" onClick={handleNext}>
                Continue
              </button>
            ) : (
              <button className="btn-primary" onClick={handleNext}>
                {isLastStep ? 'Done' : 'Got it'}
              </button>
            )}
          </div>
        </div>

        {/* Arrow pointer */}
        <div className={`tooltip-arrow arrow-${arrowPosition}`} />
      </div>
    </StyledWrapper>,
    document.body
  );
};

export default OnboardingOverlay;
