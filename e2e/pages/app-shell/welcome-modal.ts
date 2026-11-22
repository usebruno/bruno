import { test, Page } from '../../playwright';

export const buildWelcomeModalLocators = (page: Page) => {
  const root = () => page.getByTestId('welcome-modal');
  const actionButton = (title: string) => root().getByRole('button').filter({ has: page.getByText(title, { exact: true }) });

  return {
    root,
    heading: (text: string) => root().getByRole('heading', { name: text, exact: true }),
    getStartedButton: () => root().getByRole('button', { name: 'Get Started', exact: true }),
    nextButton: () => root().getByRole('button', { name: 'Next', exact: true }),
    importCollectionCard: () => actionButton('Import Collection'),
    openExistingCollectionButton: () => actionButton('Open existing collection')
  };
};

export const goToWelcomeModalActions = async (page: Page) => {
  await test.step('Go to the "Ready to go!" step of the welcome modal', async () => {
    const welcomeModal = buildWelcomeModalLocators(page);
    await welcomeModal.getStartedButton().click();
    await welcomeModal.nextButton().click();
    await welcomeModal.nextButton().click();
    await welcomeModal.heading('Ready to go!').waitFor({ state: 'visible' });
  });
};
