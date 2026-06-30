import { rgba } from 'polished';
import { getBadgeStyle } from './NotificationDetail';

describe('getBadgeStyle', () => {
  const theme = { colors: { text: { purple: '#8e44ad' } } };

  it('uses a valid hex color for both text and tinted background', () => {
    const style = getBadgeStyle('#ff0000', theme);
    expect(style).toEqual({
      backgroundColor: rgba('#ff0000', 0.15),
      color: '#ff0000'
    });
  });

  it('accepts rgb color strings', () => {
    const style = getBadgeStyle('rgb(0, 128, 255)', theme);
    expect(style.color).toBe('rgb(0, 128, 255)');
    expect(style.backgroundColor).toBe(rgba('rgb(0, 128, 255)', 0.15));
  });

  it('accepts hsl color strings', () => {
    const style = getBadgeStyle('hsl(210, 100%, 50%)', theme);
    expect(style.color).toBe('hsl(210, 100%, 50%)');
    expect(style.backgroundColor).toBe(rgba('hsl(210, 100%, 50%)', 0.15));
  });

  it('falls back to the theme purple for an unparseable color', () => {
    const style = getBadgeStyle('not-a-color', theme);
    expect(style).toEqual({
      backgroundColor: rgba(theme.colors.text.purple, 0.15),
      color: theme.colors.text.purple
    });
  });

  it('falls back to the theme purple when color is undefined', () => {
    const style = getBadgeStyle(undefined, theme);
    expect(style.color).toBe(theme.colors.text.purple);
    expect(style.backgroundColor).toBe(rgba(theme.colors.text.purple, 0.15));
  });
});
