# Storybook

Storybook is our workbench and living documentation for the `bruno-app` UI — primarily the design-system primitives under `src/ui`. Use it to build a component in isolation, see every state at once, and check how it looks across Bruno's themes.

## Running

From the repo root:

```bash
npm run storybook --workspace=packages/bruno-app        # dev server on http://localhost:6006
npm run build-storybook --workspace=packages/bruno-app  # static build -> storybook-static/
```

Config lives in this folder: `main.js` (framework, addons, stories glob, webpack aliases) and `preview.jsx` (global decorators, the theme toolbar).

## Where stories live

Stories are co-located next to the component they document and picked up by the glob in `main.js`:

```
src/**/*.stories.@(js|jsx|mjs|ts|tsx)
```

So `src/ui/Button/index.js` is documented by `src/ui/Button/Button.stories.jsx`. `main.js` mirrors the app's path aliases (`ui`, `components`, `themes`, `providers`, `utils`, …), so imports like `import Button from 'ui/Button'` work inside stories.

## Writing a story

Standard CSF. Give the component a `Components/<Name>` title and tag it `autodocs` so it gets a Docs page:

```jsx
import Button from './index';

export default {
  title: 'Components/Button',
  component: Button,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  argTypes: {
    variant: { control: 'select', options: ['filled', 'outline', 'ghost'] }
  }
};

export const Default = { args: { children: 'Button' } };
```

Theming is automatic — `preview.jsx` wraps every story in the styled-components `ThemeProvider` (and the app's `ThemeContext`), so components read `props.theme` and `useTheme()` normally. Don't add your own theme provider.

## Theme switching

The toolbar has a **Theme** picker listing all of Bruno's registered themes (from `themes/index.js` `themeRegistry`). Selecting one re-renders the current story with that theme's real tokens and sets the preview's light/dark mode.

Note: components styled via styled-components `props.theme` (nearly all of `src/ui`) get full per-theme accuracy. Anything relying on raw `var(--color-*)` CSS variables only toggles light vs dark, since those variables aren't per-theme.

## Conventions & gotchas

These are worth following so components render correctly on the **Docs** page, where every story renders inline in one shared document (unlike Canvas, which isolates each story in an iframe).

**Keep the Docs description clean.** Storybook uses a component's leading JSDoc as the Docs description and does not strip `@param` tags, so a rich JSDoc block dumps as a run-on paragraph. Set an explicit description in the story instead of trimming the component's source comments:

```js
parameters: {
  docs: { description: { component: 'One clean paragraph. See the props table below.' } }
}
```

**Don't hardcode `name` on radio-based groups.** `RadioGroup`/`SegmentGroup` auto-generate a unique `name` per instance. On the Docs page the primary story renders twice and all stories share the DOM, so a hardcoded `name` makes separate instances collide into one native radio group (selecting in one unchecks another). Omit `name` unless you specifically want a shared native group.

**Give overlay components room.** Dropdowns, menus, and modals open a popover that gets clipped by the short, `overflow`-hidden inline Docs preview. Render those stories in an iframe with a height:

```js
parameters: { docs: { story: { inline: false, height: '360px' } } }
```

**Always give group components an accessible name.** Components like `RadioGroup`/`SegmentGroup` warn in development if they render without `label`, `ariaLabel`, or `ariaLabelledBy` — pass one in stories and real usage.

**Demo wrappers, not component chrome.** If a story needs a sized/bordered container to demonstrate behavior (e.g. width for overflow), keep it clearly a demo wrapper so it isn't mistaken for the component's own styling.

## Docs addon

Autodocs (the Docs tab) requires `@storybook/addon-docs`, registered in `main.js` and pinned to the **same version** as the `storybook` core package — a version mismatch throws `docsParameter.renderer is not a function`. Run `npx storybook doctor` to check for mismatched Storybook packages.

## Adding a new primitive

1. Build the component under `src/ui/<Name>/` (`index.js` + `StyledWrapper.js`), following the existing conventions: `$`-prefixed transient style props, theme tokens, a `dataTestId`, forwarded refs, and forwarded `...rest`.
2. Add `<Name>.stories.jsx` next to it with a `Components/<Name>` title, `autodocs`, `argTypes`, a clean `docs.description.component`, and a story per meaningful state.
3. Add `<Name>.spec.jsx` (React Testing Library) for behavior and accessibility.
