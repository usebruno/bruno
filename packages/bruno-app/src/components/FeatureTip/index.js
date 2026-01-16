import React, { useState, useEffect } from 'react';
import { IconX, IconBulb } from '@tabler/icons';
import useLocalStorage from 'hooks/useLocalStorage';
import StyledWrapper from './StyledWrapper';

/**
 * FeatureTip - A simple, dismissable tip dialogue for onboarding users
 *
 * @param {string} tipId - Unique identifier for the tip (used for localStorage)
 * @param {string} title - Title of the tip
 * @param {string} description - Description/content of the tip
 * @param {string} learnMoreUrl - Optional URL for "Learn more" link
 * @param {React.ReactNode} children - The element to attach the tip to
 * @param {string} placement - Placement of the tip: 'top' | 'bottom' | 'left' | 'right'
 * @param {boolean} disabled - If true, the tip won't be shown even if not dismissed
 * @param {string} dependsOn - Optional tipId that must be dismissed before this tip shows
 */
const FeatureTip = ({
  tipId,
  title,
  description,
  learnMoreUrl,
  children,
  placement = 'bottom',
  disabled = false,
  dependsOn = null
}) => {
  const [isDismissed, setIsDismissed] = useLocalStorage(`bruno.featureTip.${tipId}`, false);
  const [isDependencyDismissed, setIsDependencyDismissed] = useState(!dependsOn);

  // Check if dependency tip has been dismissed
  useEffect(() => {
    if (!dependsOn) {
      setIsDependencyDismissed(true);
      return;
    }

    const checkDependency = () => {
      try {
        const stored = localStorage.getItem(`bruno.featureTip.${dependsOn}`);
        if (stored !== null) {
          const parsed = JSON.parse(stored);
          setIsDependencyDismissed(parsed === true);
        } else {
          setIsDependencyDismissed(false);
        }
      } catch {
        setIsDependencyDismissed(false);
      }
    };

    // Check immediately
    checkDependency();

    // Listen for storage changes (when the dependency tip is dismissed)
    const handleStorageChange = (e) => {
      if (e.key === `bruno.featureTip.${dependsOn}`) {
        checkDependency();
      }
    };

    // Also poll periodically in case storage event doesn't fire (same tab)
    const interval = setInterval(checkDependency, 500);

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [dependsOn]);

  const handleDismiss = (e) => {
    e.stopPropagation();
    setIsDismissed(true);
  };

  // Don't show if: already dismissed, explicitly disabled, or dependency not yet dismissed
  console.log(`FeatureTip [${tipId}]: isDismissed=${isDismissed}, disabled=${disabled}, isDependencyDismissed=${isDependencyDismissed}`);
  if (isDismissed || disabled || !isDependencyDismissed) {
    return children;
  }

  return (
    <StyledWrapper className={`feature-tip-container placement-${placement}`}>
      {children}
      <div className="feature-tip-popover">
        <div className="tip-arrow" />
        <div className="tip-content">
          <div className="tip-header">
            <IconBulb size={16} className="tip-icon" />
            <span className="tip-title">{title}</span>
            <button className="tip-close" onClick={handleDismiss} aria-label="Dismiss tip">
              <IconX size={14} />
            </button>
          </div>
          <p className="tip-description">{description}</p>
          <div className="tip-actions">
            {learnMoreUrl && (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="tip-learn-more"
              >
                Learn more
              </a>
            )}
            <button className="tip-dismiss-btn" onClick={handleDismiss}>
              Got it
            </button>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default FeatureTip;
