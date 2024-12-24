import { v4 as uuidv4 } from 'uuid';
import { faker } from '@faker-js/faker';

export function generateGuid() {
  return uuidv4();
}

export function generateTimestamp() {
  // Current UNIX timestamp in seconds
  return Math.floor(Date.now() / 1000).toString();
}

export function generateIsoTimestamp() {
  return new Date().toISOString();
}

export function generateRandomUUID() {
  return uuidv4();
}

export function generateRandomAlphaNumeric() {
  // Random alphanumeric character: 0-9, a-z
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  return chars.charAt(Math.floor(Math.random() * chars.length));
}

export function generateRandomBoolean() {
  return Math.random() < 0.5 ? 'true' : 'false';
}

export function generateRandomInt() {
  return Math.floor(Math.random() * 1001).toString(); // between 0 and 1000
}

const colors = ['red', 'fuchsia', 'grey', 'blue', 'green', 'yellow', 'cyan', 'magenta'];
export function generateRandomColor() {
  return colors[Math.floor(Math.random() * colors.length)];
}

export function generateRandomHexColor() {
  // Random hex color like #a1b2c3
  const r = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  const g = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  const b = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

const abbreviations = ['SQL', 'PCI', 'JSON', 'HTTP', 'HTML', 'CSS', 'API', 'TCP'];
export function generateRandomAbbreviation() {
  return abbreviations[Math.floor(Math.random() * abbreviations.length)];
}

// Internet and IP addresses (using faker)
export function generateRandomIP() {
  return faker.internet.ip();
}

export function generateRandomIPV6() {
  return faker.internet.ipv6();
}

export function generateRandomMACAddress() {
  return faker.internet.mac();
}

export function generateRandomPassword() {
  return faker.internet.password(15);
}

export function generateRandomLocale() {
  // Faker supports locales but doesn't directly give a random two-letter code,
  // We'll pick from a subset of ISO 639-1 language codes
  const locales = ['en', 'fr', 'de', 'es', 'it', 'nl', 'ru', 'ja', 'zh', 'ar', 'sr', 'si', 'ny'];
  return locales[Math.floor(Math.random() * locales.length)];
}

export function generateRandomUserAgent() {
  return faker.internet.userAgent();
}

const protocols = ['http', 'https'];
export function generateRandomProtocol() {
  return protocols[Math.floor(Math.random() * protocols.length)];
}

export function generateRandomSemver() {
  return `${faker.datatype.number({min: 0, max:10})}.${faker.datatype.number({min: 0, max:10})}.${faker.datatype.number({min: 0, max:10})}`;
}

// Names (faker provides many functions)
export function generateRandomFirstName() {
  return faker.name.firstName();
}

export function generateRandomLastName() {
  return faker.name.lastName();
}

export function generateRandomFullName() {
  return faker.name.findName();
}

export function generateRandomNamePrefix() {
  return faker.name.prefix();
}

export function generateRandomNameSuffix() {
  return faker.name.suffix();
}

// Profession
export function generateRandomJobArea() {
  return faker.name.jobArea();
}

export function generateRandomJobDescriptor() {
  return faker.name.jobDescriptor();
}

export function generateRandomJobTitle() {
  return faker.name.jobTitle();
}

export function generateRandomJobType() {
  return faker.name.jobType();
}

// Phone, address, and location
export function generateRandomPhoneNumber() {
  // faker.phone.phoneNumber() returns a random phone format
  return faker.phone.number('###-###-####');
}

export function generateRandomPhoneNumberExt() {
  // Extended format with 4 groups of 3 digits (12 digits total)
  return faker.phone.number('##-###-###-####');
}

export function generateRandomCity() {
  return faker.address.city();
}

export function generateRandomStreetName() {
  return faker.address.street();
}

export function generateRandomStreetAddress() {
  return faker.address.streetAddress();
}

export function generateRandomCountry() {
  return faker.address.country();
}

export function generateRandomCountryCode() {
  return faker.address.countryCode('alpha-2');
}

export function generateRandomLatitude() {
  return faker.address.latitude().toString();
}

export function generateRandomLongitude() {
  return faker.address.longitude().toString();
}

// Images (Using lorempixel placeholder images)
function randomImage(width = 640, height = 480, category = '') {
  const baseUrl = 'http://lorempixel.com';
  return category
    ? `${baseUrl}/${width}/${height}/${category}`
    : `${baseUrl}/${width}/${height}`;
}
export function generateRandomAvatarImage() {
  return faker.image.avatar();
}
export function generateRandomImageUrl() {
  return randomImage();
}
export function generateRandomAbstractImage() {
  return randomImage(640, 480, 'abstract');
}
export function generateRandomAnimalsImage() {
  return randomImage(640, 480, 'animals');
}
export function generateRandomBusinessImage() {
  return randomImage(640, 480, 'business');
}
export function generateRandomCatsImage() {
  return randomImage(640, 480, 'cats');
}
export function generateRandomCityImage() {
  return randomImage(640, 480, 'city');
}
export function generateRandomFoodImage() {
  return randomImage(640, 480, 'food');
}
export function generateRandomNightlifeImage() {
  return randomImage(640, 480, 'nightlife');
}
export function generateRandomFashionImage() {
  return randomImage(640, 480, 'fashion');
}
export function generateRandomPeopleImage() {
  return randomImage(640, 480, 'people');
}
export function generateRandomNatureImage() {
  return randomImage(640, 480, 'nature');
}
export function generateRandomSportsImage() {
  return randomImage(640, 480, 'sports');
}
export function generateRandomTransportImage() {
  return randomImage(640, 480, 'transport');
}
export function generateRandomImageDataUri() {
  return faker.image.dataUri(640, 480);
}

// Finance
export function generateRandomBankAccount() {
  return faker.finance.account();
}

export function generateRandomBankAccountName() {
  return faker.finance.accountName();
}

export function generateRandomCreditCardMask() {
  return faker.finance.mask();
}

export function generateRandomBankAccountBic() {
  return faker.finance.bic();
}

export function generateRandomBankAccountIban() {
  return faker.finance.iban();
}

export function generateRandomTransactionType() {
  return faker.finance.transactionType();
}

export function generateRandomCurrencyCode() {
  return faker.finance.currencyCode();
}

export function generateRandomCurrencyName() {
  return faker.finance.currencyName();
}

export function generateRandomCurrencySymbol() {
  return faker.finance.currencySymbol();
}

export function generateRandomBitcoin() {
  return faker.finance.bitcoinAddress();
}

// Business
export function generateRandomCompanyName() {
  return faker.company.name();
}

export function generateRandomCompanySuffix() {
  // Just pick a suffix
  const suffixes = ['Inc', 'LLC', 'Group', 'Corp', 'Ltd'];
  return suffixes[Math.floor(Math.random() * suffixes.length)];
}

export function generateRandomBs() {
  return faker.company.bs();
}

export function generateRandomBsAdjective() {
  return faker.company.bsAdjective();
}

export function generateRandomBsBuzz() {
  return faker.company.bsBuzz();
}

export function generateRandomBsNoun() {
  return faker.company.bsNoun();
}

// Catchphrases
export function generateRandomCatchPhrase() {
  return faker.company.catchPhrase();
}

export function generateRandomCatchPhraseAdjective() {
  return faker.company.catchPhraseAdjective();
}

export function generateRandomCatchPhraseDescriptor() {
  return faker.company.catchPhraseDescriptor();
}

export function generateRandomCatchPhraseNoun() {
  return faker.company.catchPhraseNoun();
}

// Databases
export function generateRandomDatabaseColumn() {
  return faker.database.column();
}

export function generateRandomDatabaseType() {
  return faker.database.type();
}

export function generateRandomDatabaseCollation() {
  return faker.database.collation();
}

export function generateRandomDatabaseEngine() {
  return faker.database.engine();
}

// Dates
export function generateRandomDateFuture() {
  return faker.date.future().toString();
}

export function generateRandomDatePast() {
  return faker.date.past().toString();
}

export function generateRandomDateRecent() {
  return faker.date.recent().toString();
}

export function generateRandomWeekday() {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[Math.floor(Math.random() * days.length)];
}

export function generateRandomMonth() {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[Math.floor(Math.random() * months.length)];
}

// Domains, emails, and usernames
export function generateRandomDomainName() {
  return faker.internet.domainName();
}

export function generateRandomDomainSuffix() {
  return faker.internet.domainSuffix();
}

export function generateRandomDomainWord() {
  return faker.internet.domainWord();
}

export function generateRandomEmail() {
  return faker.internet.email();
}

export function generateRandomExampleEmail() {
  const domain = ['example.com', 'example.net', 'example.org'];
  return `${faker.internet.userName()}@${domain[Math.floor(Math.random() * domain.length)]}`;
}

export function generateRandomUserName() {
  return faker.internet.userName();
}

export function generateRandomUrl() {
  return faker.internet.url();
}

// Files and directories
export function generateRandomFileName() {
  return faker.system.fileName();
}

export function generateRandomFileType() {
  return faker.system.fileType();
}

export function generateRandomFileExt() {
  return faker.system.fileExt();
}

export function generateRandomCommonFileName() {
  return faker.system.commonFileName();
}

export function generateRandomCommonFileType() {
  return faker.system.commonFileType();
}

export function generateRandomCommonFileExt() {
  return faker.system.commonFileExt();
}

export function generateRandomFilePath() {
  return faker.system.filePath();
}

export function generateRandomDirectoryPath() {
  return faker.system.directoryPath();
}

export function generateRandomMimeType() {
  return faker.system.mimeType();
}

// Stores
export function generateRandomPrice() {
  return faker.commerce.price();
}

export function generateRandomProduct() {
  return faker.commerce.product();
}

export function generateRandomProductAdjective() {
  return faker.commerce.productAdjective();
}

export function generateRandomProductMaterial() {
  return faker.commerce.productMaterial();
}

export function generateRandomProductName() {
  return faker.commerce.productName();
}

export function generateRandomDepartment() {
  return faker.commerce.department();
}

// Grammar
export function generateRandomNoun() {
  // Using faker.word.noun() from faker v8+.
  return faker.word.noun();
}

export function generateRandomVerb() {
  return faker.word.verb();
}

export function generateRandomIngverb() {
  // This is custom, pick a random verb and add 'ing'
  const verb = faker.word.verb();
  return verb.endsWith('e') ? verb.slice(0, -1) + 'ing' : verb + 'ing';
}

export function generateRandomAdjective() {
  return faker.word.adjective();
}

export function generateRandomWord() {
  return faker.word.sample();
}

export function generateRandomWords() {
  return faker.lorem.words();
}

export function generateRandomPhrase() {
  // faker doesn't have direct "phrase", but we can use sentence
  return faker.lorem.sentence();
}

// Lorem ipsum
export function generateRandomLoremWord() {
  return faker.lorem.word();
}

export function generateRandomLoremWords() {
  return faker.lorem.words();
}

export function generateRandomLoremSentence() {
  return faker.lorem.sentence();
}

export function generateRandomLoremSentences() {
  return faker.lorem.sentences();
}

export function generateRandomLoremParagraph() {
  return faker.lorem.paragraph();
}

export function generateRandomLoremParagraphs() {
  return faker.lorem.paragraphs();
}

export function generateRandomLoremText() {
  return faker.lorem.text();
}

export function generateRandomLoremSlug() {
  return faker.lorem.slug();
}

export function generateRandomLoremLines() {
  return faker.lorem.lines();
}


// Map placeholders to functions:
export const placeholderFunctions = {
  '$guid': generateGuid,
  '$timestamp': generateTimestamp,
  '$isoTimestamp': generateIsoTimestamp,
  '$randomUUID': generateRandomUUID,
  '$randomAlphaNumeric': generateRandomAlphaNumeric,
  '$randomBoolean': generateRandomBoolean,
  '$randomInt': generateRandomInt,
  '$randomColor': generateRandomColor,
  '$randomHexColor': generateRandomHexColor,
  '$randomAbbreviation': generateRandomAbbreviation,
  '$randomIP': generateRandomIP,
  '$randomIPV6': generateRandomIPV6,
  '$randomMACAddress': generateRandomMACAddress,
  '$randomPassword': generateRandomPassword,
  '$randomLocale': generateRandomLocale,
  '$randomUserAgent': generateRandomUserAgent,
  '$randomProtocol': generateRandomProtocol,
  '$randomSemver': generateRandomSemver,
  '$randomFirstName': generateRandomFirstName,
  '$randomLastName': generateRandomLastName,
  '$randomFullName': generateRandomFullName,
  '$randomNamePrefix': generateRandomNamePrefix,
  '$randomNameSuffix': generateRandomNameSuffix,
  '$randomJobArea': generateRandomJobArea,
  '$randomJobDescriptor': generateRandomJobDescriptor,
  '$randomJobTitle': generateRandomJobTitle,
  '$randomJobType': generateRandomJobType,
  '$randomPhoneNumber': generateRandomPhoneNumber,
  '$randomPhoneNumberExt': generateRandomPhoneNumberExt,
  '$randomCity': generateRandomCity,
  '$randomStreetName': generateRandomStreetName,
  '$randomStreetAddress': generateRandomStreetAddress,
  '$randomCountry': generateRandomCountry,
  '$randomCountryCode': generateRandomCountryCode,
  '$randomLatitude': generateRandomLatitude,
  '$randomLongitude': generateRandomLongitude,
  '$randomAvatarImage': generateRandomAvatarImage,
  '$randomImageUrl': generateRandomImageUrl,
  '$randomAbstractImage': generateRandomAbstractImage,
  '$randomAnimalsImage': generateRandomAnimalsImage,
  '$randomBusinessImage': generateRandomBusinessImage,
  '$randomCatsImage': generateRandomCatsImage,
  '$randomCityImage': generateRandomCityImage,
  '$randomFoodImage': generateRandomFoodImage,
  '$randomNightlifeImage': generateRandomNightlifeImage,
  '$randomFashionImage': generateRandomFashionImage,
  '$randomPeopleImage': generateRandomPeopleImage,
  '$randomNatureImage': generateRandomNatureImage,
  '$randomSportsImage': generateRandomSportsImage,
  '$randomTransportImage': generateRandomTransportImage,
  '$randomImageDataUri': generateRandomImageDataUri,
  '$randomBankAccount': generateRandomBankAccount,
  '$randomBankAccountName': generateRandomBankAccountName,
  '$randomCreditCardMask': generateRandomCreditCardMask,
  '$randomBankAccountBic': generateRandomBankAccountBic,
  '$randomBankAccountIban': generateRandomBankAccountIban,
  '$randomTransactionType': generateRandomTransactionType,
  '$randomCurrencyCode': generateRandomCurrencyCode,
  '$randomCurrencyName': generateRandomCurrencyName,
  '$randomCurrencySymbol': generateRandomCurrencySymbol,
  '$randomBitcoin': generateRandomBitcoin,
  '$randomCompanyName': generateRandomCompanyName,
  '$randomCompanySuffix': generateRandomCompanySuffix,
  '$randomBs': generateRandomBs,
  '$randomBsAdjective': generateRandomBsAdjective,
  '$randomBsBuzz': generateRandomBsBuzz,
  '$randomBsNoun': generateRandomBsNoun,
  '$randomCatchPhrase': generateRandomCatchPhrase,
  '$randomCatchPhraseAdjective': generateRandomCatchPhraseAdjective,
  '$randomCatchPhraseDescriptor': generateRandomCatchPhraseDescriptor,
  '$randomCatchPhraseNoun': generateRandomCatchPhraseNoun,
  '$randomDatabaseColumn': generateRandomDatabaseColumn,
  '$randomDatabaseType': generateRandomDatabaseType,
  '$randomDatabaseCollation': generateRandomDatabaseCollation,
  '$randomDatabaseEngine': generateRandomDatabaseEngine,
  '$randomDateFuture': generateRandomDateFuture,
  '$randomDatePast': generateRandomDatePast,
  '$randomDateRecent': generateRandomDateRecent,
  '$randomWeekday': generateRandomWeekday,
  '$randomMonth': generateRandomMonth,
  '$randomDomainName': generateRandomDomainName,
  '$randomDomainSuffix': generateRandomDomainSuffix,
  '$randomDomainWord': generateRandomDomainWord,
  '$randomEmail': generateRandomEmail,
  '$randomExampleEmail': generateRandomExampleEmail,
  '$randomUserName': generateRandomUserName,
  '$randomUrl': generateRandomUrl,
  '$randomFileName': generateRandomFileName,
  '$randomFileType': generateRandomFileType,
  '$randomFileExt': generateRandomFileExt,
  '$randomCommonFileName': generateRandomCommonFileName,
  '$randomCommonFileType': generateRandomCommonFileType,
  '$randomCommonFileExt': generateRandomCommonFileExt,
  '$randomFilePath': generateRandomFilePath,
  '$randomDirectoryPath': generateRandomDirectoryPath,
  '$randomMimeType': generateRandomMimeType,
  '$randomPrice': generateRandomPrice,
  '$randomProduct': generateRandomProduct,
  '$randomProductAdjective': generateRandomProductAdjective,
  '$randomProductMaterial': generateRandomProductMaterial,
  '$randomProductName': generateRandomProductName,
  '$randomDepartment': generateRandomDepartment,
  '$randomNoun': generateRandomNoun,
  '$randomVerb': generateRandomVerb,
  '$randomIngverb': generateRandomIngverb,
  '$randomAdjective': generateRandomAdjective,
  '$randomWord': generateRandomWord,
  '$randomWords': generateRandomWords,
  '$randomPhrase': generateRandomPhrase,
  '$randomLoremWord': generateRandomLoremWord,
  '$randomLoremWords': generateRandomLoremWords,
  '$randomLoremSentence': generateRandomLoremSentence,
  '$randomLoremSentences': generateRandomLoremSentences,
  '$randomLoremParagraph': generateRandomLoremParagraph,
  '$randomLoremParagraphs': generateRandomLoremParagraphs,
  '$randomLoremText': generateRandomLoremText,
  '$randomLoremSlug': generateRandomLoremSlug,
  '$randomLoremLines': generateRandomLoremLines
};

/**
 * replacePlaceholders
 * Replaces all known placeholders in the given text with their randomly generated values.
 * @param {string} text
 * @returns {string}
 */
export function replacePlaceholders(text) {
  if (typeof text !== 'string') return text;

  // For each placeholder, replace all occurrences in the text
  for (const placeholder in placeholderFunctions) {
    const fn = placeholderFunctions[placeholder];
    // Use global regex with escape for special chars
    const regex = new RegExp(placeholder.replace('$', '\\$'), 'g');
    text = text.replace(regex, () => fn());
  }

  return text;
}
