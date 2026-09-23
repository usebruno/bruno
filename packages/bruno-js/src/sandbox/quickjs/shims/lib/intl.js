/**
 * Installs the FormatJS `Intl` polyfill into a QuickJS context.
 *
 * QuickJS ships without ICU, so `Intl` is undefined and `toLocale*` ignore their
 * arguments. The polyfill bundle (see ../../../bundle-intl.js) defines `Intl`
 * and patches `Date`/`Number.prototype.toLocale*` from pure JS + CLDR data.
 *
 * Set BRUNO_SANDBOX_INTL=off to skip installation (useful for measuring the
 * polyfill's own cost).
 */

let bundle = null;
try {
  // execute `npm run sandbox:bundle-intl` if the below file doesn't exist
  bundle = require('../../../bundle-intl-rollup');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') {
    throw error;
  }
}

const isDisabled = () => ['0', 'false', 'off'].includes(String(process.env.BRUNO_SANDBOX_INTL).toLowerCase());

const isIntlPolyfillAvailable = () => Boolean(bundle) && !isDisabled();

const getIntlPolyfillManifest = () => bundle?.manifest ?? null;

// The polyfill cannot detect the machine's zone, so it is copied over from the host.
const hostTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
};

const addIntlPolyfillToContext = (vm) => {
  if (!isIntlPolyfillAvailable()) {
    return;
  }
  vm.evalCode(bundle.getBundledIntlCode());
  // The polyfill defines Intl.Collator but leaves QuickJS's code-point localeCompare in place.
  vm.evalCode(`
    if (typeof Intl.DateTimeFormat?.__setDefaultTimeZone === 'function') {
      Intl.DateTimeFormat.__setDefaultTimeZone(${JSON.stringify(hostTimeZone())});
    }
    if (typeof Intl.Collator === 'function') {
      String.prototype.localeCompare = function (that, locales, options) {
        return new Intl.Collator(locales, options).compare(String(this), String(that));
      };
    }
  `);
};

module.exports = {
  addIntlPolyfillToContext,
  isIntlPolyfillAvailable,
  getIntlPolyfillManifest
};
