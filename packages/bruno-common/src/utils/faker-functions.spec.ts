import { mockDataFunctions } from "./faker-functions";

describe("mockDataFunctions Regex Validation", () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  test("timestamp and isoTimestamp should return mocked time values", () => {
    const expectedTimestamp = '1704067200'; 
    const expectedIsoTimestamp = '2024-01-01T00:00:00.000Z';

    expect(mockDataFunctions.timestamp()).toBe(expectedTimestamp);
    expect(mockDataFunctions.isoTimestamp()).toBe(expectedIsoTimestamp);
  });

  test("all values should match their expected patterns", () => {
    const patterns: Record<string, RegExp> = {
      guid: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
      timestamp: /^\d{10}$/,
      isoTimestamp: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
      randomUUID: /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/,
      randomAlphaNumeric: /^[\w]$/,
      randomBoolean: /^(true|false)$/,
      randomInt: /^\d+$/,
      randomColor: /^[\w\s]+$/,
      randomHexColor: /^#[\da-f]{6}$/,
      randomAbbreviation: /^\w{2,6}$/,
      randomIP: /^([\da-f]{1,4}:){7}[\da-f]{1,4}$|^(\d{1,3}\.){3}\d{1,3}$/,
      randomIPV4: /^(\d{1,3}\.){3}\d{1,3}$/,
      randomIPV6: /^([\da-f]{1,4}:){7}[\da-f]{1,4}$/,
      randomMACAddress: /^([\da-f]{2}:){5}[\da-f]{2}$/,
      randomPassword: /^[\w\d]{8,}$/,
      randomLocale: /^[A-Z]{2}$/,
      randomUserAgent: /^[\w\/\.\s\(\)\+\-;:_,]+$/,
      randomProtocol: /^(http|https|ftp)s?$/,
      randomSemver: /^\d+\.\d+\.\d+$/,
      randomFirstName: /^[\s\S]+$/,
      randomLastName: /^[\s\S]+$/,
      randomFullName: /^[\s\S]+$/,
      randomNamePrefix: /^[\s\S]+$/,
      randomNameSuffix: /^[\s\S]+$/,
      randomJobArea: /^[\s\S]+$/,
      randomJobDescriptor: /^[\s\S]+$/,
      randomJobTitle: /^[\s\S]+$/,
      randomJobType: /^[\s\S]+$/,
      randomPhoneNumber: /^[\s\S]+$/,
      randomPhoneNumberExt: /^[\s\S]+$/,
      randomCity: /^[\s\S]+$/,
      randomStreetName: /^[\s\S]+$/,
      randomStreetAddress: /^[\s\S]+$/,
      randomCountry: /^[\s\S]+$/,
      randomCountryCode: /^[\s\S]+$/,
      randomLatitude: /^[\s\S]+$/,
      randomLongitude: /^[\s\S]+$/,
      randomAvatarImage: /^[\s\S]+$/,
      randomImageUrl: /^[\s\S]+$/,
      randomAbstractImage: /^[\s\S]+$/,
      randomAnimalsImage: /^[\s\S]+$/,
      randomBusinessImage: /^[\s\S]+$/,
      randomCatsImage: /^[\s\S]+$/,
      randomCityImage: /^[\s\S]+$/,
      randomFoodImage: /^[\s\S]+$/,
      randomNightlifeImage: /^[\s\S]+$/,
      randomFashionImage: /^[\s\S]+$/,
      randomPeopleImage: /^[\s\S]+$/,
      randomNatureImage: /^[\s\S]+$/,
      randomSportsImage: /^[\s\S]+$/,
      randomTransportImage: /^[\s\S]+$/,
      randomImageDataUri: /^[\s\S]+$/,
      randomBankAccount: /^[\s\S]+$/,
      randomBankAccountName: /^[\s\S]+$/,
      randomCreditCardMask: /^[\s\S]+$/,
      randomBankAccountBic: /^[\s\S]+$/,
      randomBankAccountIban: /^[\s\S]+$/,
      randomTransactionType: /^[\s\S]+$/,
      randomCurrencyCode: /^[\s\S]+$/,
      randomCurrencyName: /^[\s\S]+$/,
      randomCurrencySymbol: /^[\s\S]+$/,
      randomBitcoin: /^[\s\S]+$/,
      randomCompanyName: /^[\s\S]+$/,
      randomCompanySuffix: /^[\s\S]+$/,
      randomBs: /^[\s\S]+$/,
      randomBsAdjective: /^[\s\S]+$/,
      randomBsBuzz: /^[\s\S]+$/,
      randomBsNoun: /^[\s\S]+$/,
      randomCatchPhrase: /^[\s\S]+$/,
      randomCatchPhraseAdjective: /^[\s\S]+$/,
      randomCatchPhraseDescriptor: /^[\s\S]+$/,
      randomCatchPhraseNoun: /^[\s\S]+$/,
      randomDatabaseColumn: /^[\s\S]+$/,
      randomDatabaseType: /^[\s\S]+$/,
      randomDatabaseCollation: /^[\s\S]+$/,
      randomDatabaseEngine: /^[\s\S]+$/,
      randomDateFuture: /^[\s\S]+$/,
      randomDatePast: /^[\s\S]+$/,
      randomDateRecent: /^[\s\S]+$/,
      randomWeekday: /^[\s\S]+$/,
      randomMonth: /^[\s\S]+$/,
      randomDomainName: /^[\s\S]+$/,
      randomDomainSuffix: /^[\s\S]+$/,
      randomDomainWord: /^[\s\S]+$/,
      randomEmail: /^[\w_.\-]+@[\w]+\.[a-z]+$/,
      randomExampleEmail: /^[\w\.-]+@example\.[a-z]+$/,
      randomUserName: /^[\w.\-]+$/,
      randomUrl: /^https:\/\/[\w\-]+\.[a-z]+\/?$/,
      randomFileName: /^[\w\_]+\.[\w\d]+$/,
      randomFileType: /^[\w]+$/,
      randomFileExt: /^[\w\d]+$/,
      randomCommonFileName: /^[\w\_]+\.[\w\d]+$/,
      randomCommonFileType: /^[\w]+$/,
      randomCommonFileExt: /^[\w\d]+$/,
      randomFilePath: /^[\s\S]+$/,
      randomDirectoryPath: /^\/[-\w\+\/]+$/,
      randomMimeType: /^[\w]+\/[\w\d\-\+\.]+$/,
      randomPrice: /^\d+\.\d{2}$/,
      randomProduct: /^[\s\S]+$/,
      randomProductAdjective: /^[\s\S]+$/,
      randomProductMaterial: /^[\s\S]+$/,
      randomProductName: /^[\s\S]+$/,
      randomDepartment: /^[\s\S]+$/,
      randomNoun: /^[\s\S]+$/,
      randomVerb: /^[\s\S]+$/,
      randomIngverb: /^[\s\S]+$/,
      randomAdjective: /^[\s\S]+$/,
      randomWord: /^[\s\S]+$/,
      randomWords: /^[\s\S]+$/,
      randomPhrase: /^[\s\S]+$/,
      randomLoremWord: /^[\s\S]+$/,
      randomLoremWords: /^[\s\S]+$/,
      randomLoremSentence: /^[\s\S]+$/,
      randomLoremSentences: /^[\s\S]+$/,
      randomLoremParagraph: /^[\s\S]+$/,
      randomLoremParagraphs: /^[\s\S]+$/,
      randomLoremText: /^[\s\S]+$/,
      randomLoremSlug: /^[\s\S]+$/,
      randomLoremLines: /^[\s\S]+$/,
    };

    const errors: string[] = [];

    Object.entries(mockDataFunctions).forEach(([key, func]) => {
      const pattern = patterns[key];
      const value = String(func());
      if (!value.match(pattern)) {
        errors.push(`Pattern mismatch for ${key}: expected ${pattern}, received ${value}`);
      }
    });

    if (errors.length > 0) {
      throw new Error(errors.join("\n"));
    }
  });
});

describe("Time-based tests", () => {
  beforeAll(() => {
    // Set up fake timers
    jest.useFakeTimers();
    // Set a specific point in time
    jest.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
  });

  afterAll(() => {
    // Clean up
    jest.useRealTimers();
  });

  test("should handle time-based operations", () => {
    // Your time-based tests here
    const now = new Date();
    expect(now.toISOString()).toBe('2024-01-01T00:00:00.000Z');
  });
});
