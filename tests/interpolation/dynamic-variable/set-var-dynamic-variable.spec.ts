import { test, expect } from '../../../playwright';
import { closeAllCollections, openCollectionAndAcceptSandbox, sendRequest } from '../../utils/page';
import { buildCommonLocators } from '../../utils/page/locators';

test.describe.serial('Dynamic Variable Interpolation', () => {
  test.afterEach(async ({ pageWithUserData: page }) => {
    await closeAllCollections(page);
  });

  test('Verifying if the bru.setVar method interpolates random generator functions properly', async ({ pageWithUserData: page }) => {
    const locators = buildCommonLocators(page);

    // Open collection and accept sandbox mode
    await openCollectionAndAcceptSandbox(page, 'dynamic-variable-interpolation', 'safe');

    // Navigate to the request
    await locators.sidebar.request('set-var-dynamic-variable').click();

    // Send the request
    await sendRequest(page, 200);

    // Verify response contains the title field and that it's not the literal interpolation string
    const responsePane = page.locator('.response-pane');

    // Check that the response contains a title field
    await expect(responsePane).toContainText('"title":');

    // Get the response body text to extract the actual title value
    const responseBodyText = await responsePane.innerText();

    // Extract the title value from the JSON response
    const titleMatch = responseBodyText.match(/"title":\s*"([^"]+)"/) ?? [];
    expect(titleMatch).toBeTruthy();

    const actualTitle = titleMatch[1];

    // Verify that the title is not the literal interpolation string
    // This ensures that the randomFirstName function was properly interpolated
    expect(actualTitle).not.toEqual('{{$randomFirstName}}');

    // Additional verification: ensure the title is a string and not empty
    expect(actualTitle).toBeDefined();
    expect(typeof actualTitle).toBe('string');
    expect(actualTitle.length).toBeGreaterThan(0);
  });
});
