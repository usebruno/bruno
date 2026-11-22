import { Page } from '../../playwright';

type CollectionListPrefix = 'choose-folder' | 'recents' | 'my-computer';

export const buildCollectionListLocators = (page: Page, prefix: CollectionListPrefix) => {
  const rows = () => page.getByTestId(`${prefix}-row`);
  const row = (name: string) =>
    rows().filter({ has: page.getByTestId(`${prefix}-row-name`).getByText(name, { exact: true }) });

  return {
    list: () => page.getByTestId(`${prefix}-list`),
    rows,
    row,
    rowNames: () => page.getByTestId(`${prefix}-row-name`),
    rowPath: (name: string) => row(name).getByTestId(`${prefix}-row-path`),
    rowMeta: (name: string) => row(name).getByTestId(`${prefix}-row-meta`),
    rowCheckbox: (name: string) => row(name).getByRole('checkbox'),
    rowOpenButton: (name: string) => row(name).getByTestId(`${prefix}-row-open`),
    rowSwitchButton: (name: string) => row(name).getByTestId(`${prefix}-row-switch`),
    searchInput: () => page.getByTestId(`${prefix}-search`),
    searchClear: () => page.getByTestId(`${prefix}-search-clear`),
    noMatch: () => page.getByTestId(`${prefix}-no-match`),
    noMatchChooseFolderButton: () => page.getByTestId(`${prefix}-no-match-choose-folder`),
    selectAll: () => page.getByTestId(`${prefix}-select-all`),
    clearSelection: () => page.getByTestId(`${prefix}-clear-selection`),
    cancelButton: () => page.getByTestId(`${prefix}-cancel`),
    openSelectedButton: () => page.getByTestId(`${prefix}-open-selected`)
  };
};
