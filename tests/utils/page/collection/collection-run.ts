import { Page } from '../../../../playwright';
import { buildRunnerLocators } from '../runner';

export const buildCollectionRunLocators = (page: Page) => ({
  responseHeader: () => page.getByRole('button', { name: 'Close response view' }).locator('..')
});

const displayedDurationMs = (text: string) => {
  const value = text.trim();
  return value.endsWith('ms') ? Number(value.slice(0, -2)) : Math.round(parseFloat(value) * 1000);
};

/** Opens each finished request and returns its displayed response time, in run order. */
export const getTotalRequestsDuration = async (page: Page, requestCount: number) => {
  const runner = buildRunnerLocators(page);
  const times: number[] = [];

  for (let i = 0; i < requestCount; i += 1) {
    await runner.resultStatus().nth(i).click();
    times.push(displayedDurationMs(await runner.responseTime().innerText()));
  }

  return times;
};

/** Clears a finished run so the next test sees the runner setup screen. */
export const resetCollectionRunnerResults = async (page: Page) => {
  const reset = buildRunnerLocators(page).resetButton();
  if (await reset.count() === 1) {
    await reset.click();
  }
};
