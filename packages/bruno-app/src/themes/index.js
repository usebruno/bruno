import light from './light';
import dark from './dark';
import buildCustomTheme from './customThemeBuilder';

// Import preset themes - Dark
import githubDarkPreset from './presets/github-dark.json';
import nordPreset from './presets/nord.json';
import draculaPreset from './presets/dracula.json';

// Import preset themes - Light
import githubLightPreset from './presets/github-light.json';
import solarizedLightPreset from './presets/solarized-light.json';
import oneLightPreset from './presets/one-light.json';

// Build custom themes from presets
const githubDark = buildCustomTheme(githubDarkPreset.colors);
const nord = buildCustomTheme(nordPreset.colors);
const dracula = buildCustomTheme(draculaPreset.colors);

const githubLight = buildCustomTheme(githubLightPreset.colors);
const solarizedLight = buildCustomTheme(solarizedLightPreset.colors);
const oneLight = buildCustomTheme(oneLightPreset.colors);

export default {
  light,
  dark,
  'github-dark': githubDark,
  'github-light': githubLight,
  nord,
  dracula,
  'solarized-light': solarizedLight,
  'one-light': oneLight
};

export { buildCustomTheme };
