import {
  IntroductionRender,
  PrimaryColorsRender,
  BackgroundLayersRender,
  TextColorsRender,
  BordersAndOverlaysRender
} from './Overview';

export default {
  title: 'Design System/Overview',
  parameters: {
    layout: 'padded'
  }
};

export const Introduction = {
  render: IntroductionRender
};

export const PrimaryColors = {
  render: PrimaryColorsRender
};

export const BackgroundLayers = {
  render: BackgroundLayersRender
};

export const TextColors = {
  render: TextColorsRender
};

export const BordersAndOverlays = {
  render: BordersAndOverlaysRender
};
