import React from 'react';
import classnames from 'classnames';
import StyledWrapper from './StyledWrapper';

const GAPS = { sm: '0.75rem', md: '1rem' };

/**
 * FieldList - stacks fields (usually FormField) vertically with one consistent spacing.
 * Presentational only: no state or behaviour.
 *
 * Owns the space *between* items; FormField owns the spacing *inside* an item. Nest a list to group
 * related fields more tightly (e.g. a checkbox and the fields it controls).
 *
 * @param {'sm'|'md'} props.gap - Space between items: 'sm' 12px, 'md' 16px (default)
 * @param {boolean} props.dividers - Draw a faint line between items; each item then gets the gap as
 *   padding above and below its content instead, so the line sits in the middle
 * @param {string} props.className - Extra class, e.g. for the page's own max-width
 */
const FieldList = ({ gap = 'md', dividers = false, className, children, 'data-testid': dataTestId }) => {
  return (
    <StyledWrapper
      className={classnames('field-list', { 'field-list--dividers': dividers }, className)}
      $gap={GAPS[gap] ?? GAPS.md}
      data-testid={dataTestId}
    >
      {children}
    </StyledWrapper>
  );
};

export default FieldList;
