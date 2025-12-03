/**
 * Lint Error Tooltip for CodeMirror
 * Shows lint errors in a popover when hovering over line numbers
 */

let activeTooltip = null;

/**
 * Get lint errors for a specific line from the editor's lint state
 * @param {CodeMirror} editor - The CodeMirror editor instance
 * @param {number} lineNumber - The 0-indexed line number
 * @returns {Array} Array of lint error annotations
 */
function getLintErrorsForLine(editor, lineNumber) {
  if (!editor) return [];

  const errors = [];
  const lintState = editor.state.lint;

  if (lintState && lintState.marked) {
    lintState.marked.forEach((mark) => {
      if (mark.__annotation) {
        // Use annotation's from position directly (mark.find() can return null if lines array is empty)
        const annotationLine = mark.__annotation.from?.line;

        if (annotationLine === lineNumber) {
          // Avoid duplicate messages
          if (!errors.find((e) => e.message === mark.__annotation.message)) {
            errors.push(mark.__annotation);
          }
        }
      }
    });
  }

  return errors;
}

/**
 * Show the lint error tooltip next to the target element
 * @param {Array} errors - Array of lint error annotations
 * @param {HTMLElement} targetElement - The element to position the tooltip near
 * @param {HTMLElement} container - The container to append the tooltip to
 */
function showLintTooltip(errors, targetElement, container) {
  hideLintTooltip();

  const tooltip = document.createElement('div');
  tooltip.className = 'lint-error-tooltip';

  errors.forEach((error, index) => {
    const errorDiv = document.createElement('div');
    errorDiv.className = `lint-tooltip-message ${error.severity || 'error'}`;
    errorDiv.textContent = error.message;
    tooltip.appendChild(errorDiv);
  });

  container.appendChild(tooltip);
  activeTooltip = tooltip;

  // Position the tooltip
  const rect = targetElement.getBoundingClientRect();
  tooltip.style.left = `${rect.right + 8}px`;
  tooltip.style.top = `${rect.top + (rect.height / 2)}px`;
  tooltip.style.transform = 'translateY(-50%)';
}

/**
 * Hide and remove the active lint error tooltip
 */
function hideLintTooltip() {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

/**
 * Setup lint error tooltip functionality for a CodeMirror editor
 * Shows lint errors when hovering over line numbers
 *
 * @param {CodeMirror} editor - The CodeMirror editor instance
 * @returns {Function} Cleanup function to remove event listeners
 */
export function setupLintErrorTooltip(editor) {
  const wrapper = editor.getWrapperElement();
  // Get the StyledWrapper container (parent of CodeMirror wrapper)
  const container = wrapper.closest('.graphiql-container') || wrapper.parentElement;

  const handleMouseOver = (e) => {
    const target = e.target;

    // Check if hovering over a line number element
    if (target.classList.contains('CodeMirror-linenumber')) {
      const lineNumber = parseInt(target.textContent, 10) - 1; // 0-indexed

      if (isNaN(lineNumber) || lineNumber < 0) {
        hideLintTooltip();
        return;
      }

      const lintErrors = getLintErrorsForLine(editor, lineNumber);

      if (lintErrors.length > 0) {
        showLintTooltip(lintErrors, target, container);
      } else {
        hideLintTooltip();
      }
    } else if (!target.closest('.lint-error-tooltip')) {
      hideLintTooltip();
    }
  };

  const handleMouseOut = (e) => {
    const relatedTarget = e.relatedTarget;
    // Don't hide if moving to another line number or the tooltip
    if (relatedTarget
      && (relatedTarget.classList?.contains('CodeMirror-linenumber')
        || relatedTarget.closest?.('.lint-error-tooltip'))) {
      return;
    }
    hideLintTooltip();
  };

  const handleScroll = () => {
    hideLintTooltip();
  };

  // Add event listeners
  wrapper.addEventListener('mouseover', handleMouseOver);
  wrapper.addEventListener('mouseout', handleMouseOut);
  editor.on('scroll', handleScroll);

  // Return cleanup function
  return () => {
    wrapper.removeEventListener('mouseover', handleMouseOver);
    wrapper.removeEventListener('mouseout', handleMouseOut);
    editor.off('scroll', handleScroll);
    hideLintTooltip();
  };
}
