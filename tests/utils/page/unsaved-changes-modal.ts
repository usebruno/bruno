import { Page } from '../../../playwright';
import { buildCommonLocators } from './locators';

export const buildUnsavedChangesModalLocators = (page: Page) => {
  const root = () => buildCommonLocators(page).modal.byTitle('Unsaved changes');

  return {
    root,
    button: (name: 'Save' | 'Save All' | 'Don\'t Save' | 'Cancel') => root().getByRole('button', { name, exact: true }),
    item: (label: string) => root().getByRole('listitem').filter({ hasText: label }),
    inspectTabButton: (label: string) => root().getByRole('listitem').filter({ hasText: label }).getByRole('button', { name: 'Inspect tab' })
  };
};
