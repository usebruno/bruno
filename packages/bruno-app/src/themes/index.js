import light from './light/light';
import lightMonochrome from './light/light-monochrome';
import lightPastel from './light/light-pastel';
import catppuccinLatte from './light/catppuccin-latte';
import vscodeLight from './light/vscode';
import dark from './dark/dark';
import darkMonochrome from './dark/dark-monochrome';
import darkPastel from './dark/dark-pastel';
import catppuccinFrappe from './dark/catppuccin-frappe';
import catppuccinMacchiato from './dark/catppuccin-macchiato';
import catppuccinMocha from './dark/catppuccin-mocha';
import nord from './dark/nord';
import vscodeDark from './dark/vscode';

const themes = {
  light,
  dark,
  'light-monochrome': lightMonochrome,
  'light-pastel': lightPastel,
  'dark-monochrome': darkMonochrome,
  'dark-pastel': darkPastel,
  'catppuccin-latte': catppuccinLatte,
  'catppuccin-frappe': catppuccinFrappe,
  'catppuccin-macchiato': catppuccinMacchiato,
  'catppuccin-mocha': catppuccinMocha,
  nord,
  'vscode-light': vscodeLight,
  'vscode-dark': vscodeDark
};

// Theme metadata for UI display
export const themeRegistry = {
  'light': {
    id: 'light',
    name: 'Bruno Light',
    mode: 'light'
  },
  'light-monochrome': {
    id: 'light-monochrome',
    name: 'Light Monochrome',
    mode: 'light'
  },
  'light-pastel': {
    id: 'light-pastel',
    name: 'Bruno Light Pastel',
    mode: 'light'
  },
  'catppuccin-latte': {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    mode: 'light'
  },
  'dark': {
    id: 'dark',
    name: 'Bruno Dark',
    mode: 'dark'
  },
  'dark-monochrome': {
    id: 'dark-monochrome',
    name: 'Bruno Dark Monochrome',
    mode: 'dark'
  },
  'dark-pastel': {
    id: 'dark-pastel',
    name: 'Bruno Dark Pastel',
    mode: 'dark'
  },
  'catppuccin-frappe': {
    id: 'catppuccin-frappe',
    name: 'Catppuccin Frappé',
    mode: 'dark'
  },
  'catppuccin-macchiato': {
    id: 'catppuccin-macchiato',
    name: 'Catppuccin Macchiato',
    mode: 'dark'
  },
  'catppuccin-mocha': {
    id: 'catppuccin-mocha',
    name: 'Catppuccin Mocha',
    mode: 'dark'
  },
  'nord': {
    id: 'nord',
    name: 'Nord',
    mode: 'dark'
  },
  'vscode-light': {
    id: 'vscode-light',
    name: 'VS Code Light',
    mode: 'light'
  },
  'vscode-dark': {
    id: 'vscode-dark',
    name: 'VS Code Dark',
    mode: 'dark'
  }
};

export const getLightThemes = () => Object.values(themeRegistry).filter((t) => t.mode === 'light');
export const getDarkThemes = () => Object.values(themeRegistry).filter((t) => t.mode === 'dark');

export default themes;
