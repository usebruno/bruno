/**
 * Input sizes, used by Input (and MaskedInput, which is built on it) only.
 *
 * Approximate heights, at a 1.43 line height (2 * vertical padding + line + 2px border):
 * xs: ~22px - compact inputs for dense/inline contexts
 * sm: ~27px - in between, for toolbars and denser forms
 * md: ~33px - default form input
 */
export const INPUT_SIZES = {
  xs: {
    padding: '0.125rem 0.375rem',
    fontSize: 'xs',
    borderRadius: 'sm'
  },
  sm: {
    padding: '0.25rem 0.5rem',
    fontSize: 'sm',
    borderRadius: 'sm'
  },
  md: {
    padding: '0.4375rem 0.625rem',
    fontSize: 'sm',
    borderRadius: 'sm'
  }
};
