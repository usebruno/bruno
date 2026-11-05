import { Page } from '../../../../playwright';
import { buildRunnerLocators } from '../runner';

const displayedDurationMs = (text: string) => {
  const value = text.trim();
  return value.endsWith('ms') ? Number(value.slice(0, -2)) : Math.round(parseFloat(value) * 1000);
};

/** Opens each finished request and returns the sum of the displayed response times. */
export const getTotalRequestsDuration = async (page: Page, requestCount: number) => {
  const runner = buildRunnerLocators(page);
  let totalMs = 0;

  for (let i = 0; i < requestCount; i += 1) {
    await runner.resultStatus().nth(i).click();
    // The pane shows 0ms until the stored response loads.
    await runner.responseTime().filter({ hasNotText: '0ms' }).waitFor();
    totalMs += displayedDurationMs(await runner.responseTime().innerText());
  }

  return totalMs;
};

/** Clears a finished run so the next test sees the runner setup screen. */
export const resetCollectionRunnerResults = async (page: Page) => {
  const reset = buildRunnerLocators(page).resetButton();
  await reset.click();
};
