import light from './light/light';
import lightMonochrome from './light/light-monochrome';
import lightPastel from './light/light-pastel';
import catppuccinLatte from './light/catppuccin-latte';
import { gruvboxLightSoft, gruvboxLightMedium, gruvboxLightHard } from './light/gruvbox';
import vscodeLight from './light/vscode';
import dark from './dark/dark';
import darkMonochrome from './dark/dark-monochrome';
import darkPastel from './dark/dark-pastel';
import catppuccinFrappe from './dark/catppuccin-frappe';
import catppuccinMacchiato from './dark/catppuccin-macchiato';
import catppuccinMocha from './dark/catppuccin-mocha';
import { gruvboxDarkSoft, gruvboxDarkMedium, gruvboxDarkHard } from './dark/gruvbox';
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
  'gruvbox-light-soft': gruvboxLightSoft,
  'gruvbox-light-medium': gruvboxLightMedium,
  'gruvbox-light-hard': gruvboxLightHard,
  'gruvbox-dark-soft': gruvboxDarkSoft,
  'gruvbox-dark-medium': gruvboxDarkMedium,
  'gruvbox-dark-hard': gruvboxDarkHard,
  nord,
  'vscode-light': vscodeLight,
  'vscode-dark': vscodeDark
};

// Theme metadata for UI display
export const themeRegistry = {
  'light': {
    id: 'light',
    name: 'Light',
    mode: 'light'
  },
  'light-monochrome': {
    id: 'light-monochrome',
    name: 'Light Monochrome',
    mode: 'light'
  },
  'light-pastel': {
    id: 'light-pastel',
    name: 'Light Pastel',
    mode: 'light'
  },
  'catppuccin-latte': {
    id: 'catppuccin-latte',
    name: 'Catppuccin Latte',
    mode: 'light'
  },
  'gruvbox-light-soft': {
    id: 'gruvbox-light-soft',
    name: 'Gruvbox Light Soft',
    mode: 'light'
  },
  'gruvbox-light-medium': {
    id: 'gruvbox-light-medium',
    name: 'Gruvbox Light Medium',
    mode: 'light'
  },
  'gruvbox-light-hard': {
    id: 'gruvbox-light-hard',
    name: 'Gruvbox Light Hard',
    mode: 'light'
  },
  'dark': {
    id: 'dark',
    name: 'Dark',
    mode: 'dark'
  },
  'dark-monochrome': {
    id: 'dark-monochrome',
    name: 'Dark Monochrome',
    mode: 'dark'
  },
  'dark-pastel': {
    id: 'dark-pastel',
    name: 'Dark Pastel',
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
  'gruvbox-dark-soft': {
    id: 'gruvbox-dark-soft',
    name: 'Gruvbox Dark Soft',
    mode: 'dark'
  },
  'gruvbox-dark-medium': {
    id: 'gruvbox-dark-medium',
    name: 'Gruvbox Dark Medium',
    mode: 'dark'
  },
  'gruvbox-dark-hard': {
    id: 'gruvbox-dark-hard',
    name: 'Gruvbox Dark Hard',
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
