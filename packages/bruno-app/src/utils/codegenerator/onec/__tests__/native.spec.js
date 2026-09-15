import { nativeEn, nativeRu } from '../native';
import { createRequest } from './createRequest';

describe('1C native HTTP snippet clients', () => {
  test('generates an HTTPS GET request without a body', () => {
    const result = nativeRu.convert(createRequest());

    expect(result).toBe(
      [
        'ЗащищенноеСоединение = Новый ЗащищенноеСоединениеOpenSSL;',
        'Соединение = Новый HTTPСоединение("example.com", 443, , , , 30, ЗащищенноеСоединение);',
        '',
        'HTTPЗапрос = Новый HTTPЗапрос("/");',
        '',
        'HTTPОтвет = Соединение.ВызватьHTTPМетод("GET", HTTPЗапрос);',
        '',
        'Сообщить(HTTPОтвет.КодСостояния);',
        'ТекстОтвета = HTTPОтвет.ПолучитьТелоКакСтроку();',
        'Сообщить(ТекстОтвета);'
      ].join('\n')
    );
  });

  test('generates a JSON POST request with headers and raw text body', () => {
    const result = nativeRu.convert(
      createRequest({
        method: 'POST',
        url: 'https://httpbin.org/post',
        fullUrl: 'https://httpbin.org/post',
        allHeaders: {
          'X-Header': 'value',
          'Content-Type': 'application/json'
        },
        postData: {
          mimeType: 'application/json',
          text: '{\n\t"title": "bruno"\n}',
          jsonObj: { title: 'bruno' }
        }
      })
    );

    expect(result).toBe(
      [
        'Заголовки = Новый Соответствие;',
        'Заголовки.Вставить("X-Header", "value");',
        'Заголовки.Вставить("Content-Type", "application/json");',
        '',
        'ЗащищенноеСоединение = Новый ЗащищенноеСоединениеOpenSSL;',
        'Соединение = Новый HTTPСоединение("httpbin.org", 443, , , , 30, ЗащищенноеСоединение);',
        '',
        'HTTPЗапрос = Новый HTTPЗапрос("/post", Заголовки);',
        '',
        'ДанныеСтрокой = "{',
        '|\t""title"": ""bruno""',
        '|}";',
        'HTTPЗапрос.УстановитьТелоИзСтроки(ДанныеСтрокой);',
        '',
        'HTTPОтвет = Соединение.ВызватьHTTPМетод("POST", HTTPЗапрос);',
        '',
        'Сообщить(HTTPОтвет.КодСостояния);',
        'ТекстОтвета = HTTPОтвет.ПолучитьТелоКакСтроку();',
        'Сообщить(ТекстОтвета);'
      ].join('\n')
    );
  });

  test('keeps nested JSON as a string and adds Content-Type when missing', () => {
    const result = nativeRu.convert(
      createRequest({
        method: 'POST',
        fullUrl: 'https://httpbin.org/post',
        postData: {
          mimeType: 'application/json',
          jsonObj: { user: { id: 1 }, tags: ['a', 'b'] }
        }
      })
    );

    expect(result).toContain('Заголовки.Вставить("Content-Type", "application/json");');
    expect(result).toContain('ДанныеСтрокой = "{');
    expect(result).toContain('|\t""user"": {');
    expect(result).toContain('|\t\t""id"": 1');
    expect(result).toContain('|\t""tags"": [');
    expect(result).toContain('HTTPЗапрос.УстановитьТелоИзСтроки(ДанныеСтрокой);');
    expect(result).not.toContain('Структура');
    expect(result).not.toContain('УстановитьТелоИзСтроки("{');
  });

  test('keeps a form-urlencoded body as text', () => {
    const result = nativeRu.convert(
      createRequest({
        method: 'POST',
        fullUrl: 'https://example.com/login',
        allHeaders: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        postData: {
          mimeType: 'application/x-www-form-urlencoded',
          text: 'user=bruno&active=true',
          paramsObj: { user: 'bruno', active: 'true' }
        }
      })
    );

    expect(result).toContain('HTTPЗапрос.УстановитьТелоИзСтроки("user=bruno&active=true");');
    expect(result).not.toContain('Структура');
  });

  test('keeps repeated form field names from the HAR text', () => {
    const result = nativeRu.convert(
      createRequest({
        method: 'POST',
        fullUrl: 'https://example.com/tags',
        allHeaders: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        postData: {
          mimeType: 'application/x-www-form-urlencoded',
          text: 'tag=1&tag=2&tag=3',
          paramsObj: { tag: '3' },
          params: [
            { name: 'tag', value: '1' },
            { name: 'tag', value: '2' },
            { name: 'tag', value: '3' }
          ]
        }
      })
    );

    expect(result).toContain('HTTPЗапрос.УстановитьТелоИзСтроки("tag=1&tag=2&tag=3");');
    expect(result).not.toContain('Структура');
  });

  test('uses the query string from fullUrl in the resource address', () => {
    const result = nativeRu.convert(
      createRequest({
        url: 'https://example.com/search',
        fullUrl: 'https://example.com/search?q=bruno&page=2'
      })
    );

    expect(result).toContain('HTTPЗапрос = Новый HTTPЗапрос("/search?q=bruno&page=2");');
  });

  test('omits the OpenSSL secure connection for HTTP', () => {
    const result = nativeRu.convert(
      createRequest({
        url: 'http://example.com/status',
        fullUrl: 'http://example.com/status'
      })
    );

    expect(result).toContain('Соединение = Новый HTTPСоединение("example.com", 80, , , , 30);');
    expect(result).not.toContain('ЗащищенноеСоединениеOpenSSL');
  });

  test('generates English platform keywords and names', () => {
    const result = nativeEn.convert(
      createRequest({
        fullUrl: 'https://example.com/items',
        allHeaders: { Accept: 'application/json' }
      })
    );

    expect(result).toContain('Headers = New Map;');
    expect(result).toContain('SecureConnection = New OpenSSLSecureConnection;');
    expect(result).toContain(
      'Connection = New HTTPConnection("example.com", 443, , , , 30, SecureConnection);'
    );
    expect(result).toContain('HTTPRequest = New HTTPRequest("/items", Headers);');
    expect(result).toContain('HTTPResponse = Connection.CallHTTPMethod("GET", HTTPRequest);');
  });

  test('builds multipart body with DataWriter like the Infostart sample', () => {
    const result = nativeRu.convert(
      createRequest({
        method: 'POST',
        url: 'http://localhost:3000',
        fullUrl: 'http://localhost:3000',
        allHeaders: {
          'Content-Type': 'multipart/form-data; boundary=----011000010111000001101001',
          'Authorization': 'Basic MToy'
        },
        postData: {
          mimeType: 'multipart/form-data',
          params: [
            { name: '1', value: '2' },
            { name: 'file', fileName: 'doc.pdf', contentType: 'application/pdf' }
          ]
        }
      })
    );

    expect(result).toContain('Разделитель = СтрЗаменить(Строка(Новый УникальныйИдентификатор), "-", "");');
    expect(result).toContain('Тело = Новый ПотокВПамяти;');
    expect(result).toContain('ЗаписьДанных = Новый ЗаписьДанных(Тело, , , Символы.ВК + Символы.ПС, "");');
    expect(result).toContain('ЗаписьДанных.ЗаписатьСтроку("Content-Disposition: form-data; name=""1""");');
    expect(result).toContain('ЗаписьДанных.ЗаписатьСтроку("2");');
    expect(result).toContain('ПолноеИмяФайла = "doc.pdf";');
    expect(result).toContain('ПоместитьФайл(АдресФайла, ПолноеИмяФайла, , Ложь, УникальныйИдентификатор);');
    expect(result).toContain('ДвоичныеДанныеФайла = ПолучитьИзВременногоХранилища(АдресФайла);');
    expect(result).toContain('ЗаписьДанных.Записать(ДвоичныеДанныеФайла);');
    expect(result).not.toContain('Новый ДвоичныеДанные(ПолноеИмяФайла)');
    expect(result).toContain('ЗаписьДанных.ЗаписатьСтроку("");');
    expect(result).toContain('ДанныеТела = Тело.ЗакрытьИПолучитьДвоичныеДанные();');
    expect(result).toContain('Заголовки.Вставить("Content-Type", "multipart/form-data; boundary=" + Разделитель);');
    expect(result).toContain('HTTPЗапрос.УстановитьТелоИзДвоичныхДанных(ДанныеТела);');
    expect(result).not.toContain('УстановитьТелоИзСтроки');
    expect(result).not.toContain('011000010111000001101001');
  });

  test('escapes quotes in multipart field names and content types', () => {
    const result = nativeRu.convert(
      createRequest({
        method: 'POST',
        fullUrl: 'http://localhost:3000',
        postData: {
          mimeType: 'multipart/form-data',
          params: [
            { name: 'foo"bar', value: '2' },
            { name: 'file', fileName: '/home/aleksandr/a"b.pdf', contentType: 'application/pdf";x' }
          ]
        }
      })
    );

    expect(result).toContain(
      'ЗаписьДанных.ЗаписатьСтроку("Content-Disposition: form-data; name=""foo""bar""");'
    );
    expect(result).toContain(
      'ЗаписьДанных.ЗаписатьСтроку("Content-Disposition: form-data; name=""file""; filename=""a""b.pdf""");'
    );
    expect(result).toContain('ЗаписьДанных.ЗаписатьСтроку("Content-Type: application/pdf"";x");');
  });

  test('treats CR-only request bodies as multiline 1C strings', () => {
    const result = nativeRu.convert(
      createRequest({
        method: 'POST',
        fullUrl: 'https://example.com/post',
        postData: {
          mimeType: 'text/plain',
          text: 'line1\rline2'
        }
      })
    );

    expect(result).toContain('ТекстТела = "line1\n|line2";');
    expect(result).toContain('HTTPЗапрос.УстановитьТелоИзСтроки(ТекстТела);');
  });

  test('uploads a binary file body from the client to the server', () => {
    const result = nativeRu.convert(
      createRequest({
        method: 'POST',
        fullUrl: 'https://example.com/upload',
        postData: {
          mimeType: 'image/png',
          text: '/tmp/a.png',
          params: [
            { name: 'upload', value: '/tmp/a.png', fileName: '/tmp/a.png', contentType: 'image/png' }
          ]
        }
      })
    );

    expect(result).toContain('&НаКлиенте');
    expect(result).toContain('Процедура ВыполнитьЗапрос()');
    expect(result).toContain('ПолноеИмяФайла = "/tmp/a.png";');
    expect(result).toContain('ПоместитьФайл(АдресФайла, ПолноеИмяФайла, , Ложь, УникальныйИдентификатор);');
    expect(result).toContain('ВыполнитьЗапросНаСервере(АдресФайла);');
    expect(result).toContain('&НаСервере');
    expect(result).toContain('ДвоичныеДанныеФайла = ПолучитьИзВременногоХранилища(АдресФайла);');
    expect(result).toContain('HTTPЗапрос.УстановитьТелоИзДвоичныхДанных(ДвоичныеДанныеФайла);');
    expect(result).toContain('Заголовки.Вставить("Content-Type", "image/png");');
    expect(result).not.toContain('УстановитьТелоИзСтроки("/tmp/a.png")');
  });

  test('escapes quotes in header values', () => {
    const result = nativeRu.convert(
      createRequest({
        allHeaders: {
          'X-Quoted': 'say "hello"'
        }
      })
    );

    expect(result).toContain('Заголовки.Вставить("X-Quoted", "say ""hello""");');
  });
});
