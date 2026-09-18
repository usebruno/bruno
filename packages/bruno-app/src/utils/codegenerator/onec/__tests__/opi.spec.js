import { opiEn, opiRu } from '../opi';
import { createRequest } from './createRequest';

describe('OPI HTTPSnippet clients', () => {
  test('generates URL parameters for a GET request', () => {
    const result = opiRu.convert(createRequest({
      method: 'GET',
      fullUrl: 'https://httpbin.org/get?page=2&active=true',
      queryObj: { page: '2', active: 'true' }
    }));

    expect(result).toContain('ПараметрыURL.Вставить("page", "2");');
    expect(result).toContain('.Инициализировать("https://httpbin.org/get")');
    expect(result).toContain('.УстановитьПараметрыURL(ПараметрыURL)');
  });

  test('sends a JSON body as a raw string', () => {
    const result = opiRu.convert(createRequest({
      method: 'POST',
      fullUrl: 'https://httpbin.org/post',
      headersObj: { 'Content-Type': 'application/json' },
      postData: {
        mimeType: 'application/json',
        jsonObj: { title: 'bruno' },
        text: '{"title":"bruno"}'
      }
    }));

    expect(result).toContain('ДанныеСтрокой = "{');
    expect(result).toContain('|\t""title"": ""bruno""');
    expect(result).toContain('.УстановитьСтроковоеТело(ДанныеСтрокой)');
    expect(result).toContain('.ДобавитьЗаголовок("Content-Type", "application/json")');
    expect(result).toContain('.ОбработатьЗапрос("POST");');
    expect(result).not.toContain('УстановитьJsonТело');
    expect(result).not.toContain('Новый Структура');
  });

  test('keeps nested JSON and arrays as a string', () => {
    const nested = '{"user":{"id":1},"tags":["a","b"]}';
    const result = opiRu.convert(createRequest({
      method: 'POST',
      fullUrl: 'https://httpbin.org/post',
      postData: {
        mimeType: 'application/json',
        jsonObj: { user: { id: 1 }, tags: ['a', 'b'] },
        text: nested
      }
    }));

    expect(result).toContain('ДанныеСтрокой = "{');
    expect(result).toContain('|\t""user"": {');
    expect(result).toContain('|\t\t""id"": 1');
    expect(result).toContain('.УстановитьСтроковоеТело(ДанныеСтрокой)');
    expect(result).toContain('.ДобавитьЗаголовок("Content-Type", "application/json")');
    expect(result).not.toContain('Неопределено');
  });

  test('sends unique form fields as a structure', () => {
    const result = opiRu.convert(createRequest({
      method: 'POST',
      fullUrl: 'https://httpbin.org/post',
      postData: {
        mimeType: 'application/x-www-form-urlencoded',
        paramsObj: { title: 'bruno' },
        params: [{ name: 'title', value: 'bruno' }]
      }
    }));

    expect(result).toContain('Данные = Новый Структура;');
    expect(result).toContain('Данные.Вставить("title", "bruno");');
    expect(result).toContain('.УстановитьFormТело(Данные)');
  });

  test('sends repeated form fields as a raw urlencoded string', () => {
    const result = opiRu.convert(createRequest({
      method: 'POST',
      fullUrl: 'https://httpbin.org/post',
      headersObj: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
    }));

    expect(result).toContain('Данные = "tag=1&tag=2&tag=3";');
    expect(result).toContain('.УстановитьСтроковоеТело(Данные)');
    expect(result).toContain('.ДобавитьЗаголовок("Content-Type", "application/x-www-form-urlencoded")');
    expect(result).not.toContain('УстановитьFormТело');
    expect(result).not.toContain('Данные = Новый Структура');
  });

  test('generates a text body and returns a string', () => {
    const result = opiRu.convert(createRequest({
      method: 'POST',
      fullUrl: 'https://httpbin.org/post',
      postData: {
        mimeType: 'text/plain',
        text: 'hello'
      }
    }));

    expect(result).toContain('.УстановитьСтроковоеТело("hello")');
    expect(result).toContain('ТекстОтвета = Результат.ВернутьОтветКакСтроку();');
  });

  test('adds a custom header', () => {
    const result = opiRu.convert(createRequest({
      method: 'GET',
      fullUrl: 'https://httpbin.org/get',
      allHeaders: { 'X-Header': 'value' }
    }));

    expect(result).toContain('.ДобавитьЗаголовок("X-Header", "value")');
  });

  test('uses English OPI fluent API keywords', () => {
    const result = opiEn.convert(createRequest({
      method: 'PATCH',
      fullUrl: 'https://httpbin.org/patch'
    }));

    expect(result).toContain('Result = OPI_HTTPRequests.NewRequest()');
    expect(result).toContain('.Initialize("https://httpbin.org/patch")');
    expect(result).toContain('.ProcessRequest("PATCH")');
  });

  test('builds multipart body with a UUID boundary instead of the HAR delimiter', () => {
    const result = opiRu.convert(createRequest({
      method: 'POST',
      fullUrl: 'https://httpbin.org/post',
      allHeaders: {
        'Content-Type': 'multipart/form-data; boundary=----011000010111000001101001'
      },
      postData: {
        mimeType: 'multipart/form-data',
        params: [
          { name: '1', value: '2' },
          { name: 'file', fileName: 'doc.pdf', contentType: 'application/pdf' }
        ]
      }
    }));

    expect(result).toContain('Разделитель = СтрЗаменить(Строка(Новый УникальныйИдентификатор), "-", "");');
    expect(result).toContain('.УстановитьДвоичноеТело(ДанныеТела)');
    expect(result).toContain('.ДобавитьЗаголовок("Content-Type", "multipart/form-data; boundary=" + Разделитель)');
    expect(result).not.toContain('011000010111000001101001');
    expect(result).toContain('ПоместитьФайл(АдресФайла, ПолноеИмяФайла, , Ложь, УникальныйИдентификатор);');
    expect(result).toContain('ДвоичныеДанныеФайла = ПолучитьИзВременногоХранилища(АдресФайла);');
    expect(result).not.toContain('УстановитьДвоичноеТело("doc.pdf")');
    expect(result).not.toContain('несколько файлов уходят одним двоичным multipart-телом');
  });

  test('comments that several multipart files share one OPI binary body', () => {
    const result = opiRu.convert(createRequest({
      method: 'POST',
      fullUrl: 'https://httpbin.org/post',
      postData: {
        mimeType: 'multipart/form-data',
        params: [
          { name: 'file1', fileName: 'a.pdf' },
          { name: 'file2', fileName: 'b.pdf' }
        ]
      }
    }));

    expect(result).toContain(
      '// OPI: несколько файлов уходят одним двоичным multipart-телом, отдельного метода на каждый файл нет.'
    );
    expect(result).toContain('.УстановитьДвоичноеТело(ДанныеТела)');
    expect(result).toContain('ПоместитьФайл(АдресФайла1, ПолноеИмяФайла1, , Ложь, УникальныйИдентификатор);');
    expect(result).toContain('ПоместитьФайл(АдресФайла2, ПолноеИмяФайла2, , Ложь, УникальныйИдентификатор);');
  });

  test('uses bearer authorization method when possible', () => {
    const result = opiEn.convert(createRequest({
      method: 'GET',
      fullUrl: 'https://httpbin.org/bearer',
      headersObj: { Authorization: 'Bearer secret-token' }
    }));

    expect(result).toContain('.AddBearerAuthorization("secret-token")');
    expect(result).not.toContain('.AddHeader("Authorization"');
  });
});
