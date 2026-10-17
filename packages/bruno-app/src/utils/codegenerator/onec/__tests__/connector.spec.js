import { connectorEn, connectorRu } from '../connector';
import { createRequest } from './createRequest';

const request = (overrides = {}) => createRequest({
  url: 'https://httpbin.org/get',
  fullUrl: 'https://httpbin.org/get',
  ...overrides
});

describe('1C Connector HTTPSnippet clients', () => {
  test('generates GET without headers', () => {
    expect(connectorRu.convert(request())).toBe(
      [
        'Результат = КоннекторHTTP.Get("https://httpbin.org/get");',
        '',
        'Сообщить(Результат.КодСостояния);',
        'ТекстОтвета = КоннекторHTTP.КакТекст(Результат);',
        'Сообщить(ТекстОтвета);'
      ].join('\n')
    );
  });

  test('generates GET with query parameters', () => {
    const snippet = connectorRu.convert(request({
      fullUrl: 'https://httpbin.org/get?search=bruno',
      queryObj: { search: 'bruno' }
    }));

    expect(snippet).toContain('ПараметрыЗапроса = Новый Структура;');
    expect(snippet).toContain('ПараметрыЗапроса.Вставить("search", "bruno");');
    expect(snippet).toContain(
      'КоннекторHTTP.Get("https://httpbin.org/get", ПараметрыЗапроса)'
    );
  });

  test('generates JSON POST with data and headers', () => {
    const snippet = connectorRu.convert(request({
      method: 'POST',
      url: 'https://httpbin.org/post',
      fullUrl: 'https://httpbin.org/post',
      allHeaders: {
        'Content-Type': 'application/json',
        'X-Header': 'value'
      },
      postData: {
        mimeType: 'application/json',
        text: '{"title":"bruno"}',
        jsonObj: { title: 'bruno' }
      }
    }));

    expect(snippet).toContain('Заголовки.Вставить("X-Header", "value");');
    expect(snippet).toContain('Заголовки.Вставить("Content-Type", "application/json");');
    expect(snippet).toContain('ДанныеСтрокой = "{');
    expect(snippet).toContain('|\t""title"": ""bruno""');
    expect(snippet).toContain(
      'Результат = КоннекторHTTP.Post("https://httpbin.org/post", ДанныеСтрокой, ДополнительныеПараметры);'
    );
    expect(snippet).toContain('Сообщить(Результат.КодСостояния);');
    expect(snippet).toContain('ТекстОтвета = КоннекторHTTP.КакТекст(Результат);');
    expect(snippet).not.toContain('PostJson');
  });

  test('keeps nested JSON as a string and adds Content-Type when missing', () => {
    const snippet = connectorRu.convert(request({
      method: 'POST',
      url: 'https://httpbin.org/post',
      fullUrl: 'https://httpbin.org/post',
      postData: {
        mimeType: 'application/json',
        jsonObj: { user: { id: 1 }, tags: ['a', 'b'] }
      }
    }));

    expect(snippet).toContain('Заголовки.Вставить("Content-Type", "application/json");');
    expect(snippet).toContain('ДанныеСтрокой = "{');
    expect(snippet).toContain('|\t""user"": {');
    expect(snippet).toContain('|\t\t""id"": 1');
    expect(snippet).toContain(
      'Результат = КоннекторHTTP.Post("https://httpbin.org/post", ДанныеСтрокой, ДополнительныеПараметры);'
    );
    expect(snippet).not.toContain('PostJson');
    expect(snippet).not.toContain('Данные = Новый Структура');
  });

  test('sends repeated form fields as a raw urlencoded string', () => {
    const snippet = connectorRu.convert(request({
      method: 'POST',
      url: 'https://httpbin.org/post',
      fullUrl: 'https://httpbin.org/post',
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
    }));

    expect(snippet).toContain('Данные = "tag=1&tag=2&tag=3";');
    expect(snippet).toContain('Заголовки.Вставить("Content-Type", "application/x-www-form-urlencoded");');
    expect(snippet).not.toContain('Данные = Новый Структура');
    expect(snippet).not.toContain('Данные.Вставить("tag", "3")');
  });

  test('generates form-urlencoded POST with structure data', () => {
    const snippet = connectorRu.convert(request({
      method: 'POST',
      url: 'https://httpbin.org/post',
      fullUrl: 'https://httpbin.org/post',
      postData: {
        mimeType: 'application/x-www-form-urlencoded',
        paramsObj: { title: 'bruno' }
      }
    }));

    expect(snippet).toContain('Данные = Новый Структура;');
    expect(snippet).toContain('Данные.Вставить("title", "bruno");');
    expect(snippet).toContain(
      'Результат = КоннекторHTTP.Post("https://httpbin.org/post", Данные);'
    );
    expect(snippet).toContain('КоннекторHTTP.КакТекст(Результат)');
  });

  test('uses English module and field names', () => {
    const snippet = connectorEn.convert(request({
      allHeaders: { 'X-Header': 'value' }
    }));

    expect(snippet).toContain('Headers = New Map;');
    expect(snippet).toContain('AdditionalParameters = New Structure;');
    expect(snippet).toContain('AdditionalParameters.Insert("Headers", Headers);');
    expect(snippet).toContain(
      'Result = HTTPConnector.Get("https://httpbin.org/get", Undefined, AdditionalParameters);'
    );
  });

  test('puts POST query parameters into additional parameters and extracts the body', () => {
    const snippet = connectorRu.convert(request({
      method: 'POST',
      url: 'http://localhost:3000?q=q1',
      fullUrl: 'http://localhost:3000?q=q1',
      queryObj: { q: 'q1' },
      allHeaders: {
        'Content-Type': 'multipart/form-data; boundary=----011000010111000001101001'
      },
      postData: {
        mimeType: 'multipart/form-data',
        params: [
          { name: '1', value: '2' }
        ]
      }
    }));

    expect(snippet).toContain('Разделитель = СтрЗаменить(Строка(Новый УникальныйИдентификатор), "-", "");');
    expect(snippet).toContain('Заголовки.Вставить("Content-Type", "multipart/form-data; boundary=" + Разделитель);');
    expect(snippet).toContain('ПараметрыЗапроса = Новый Структура;');
    expect(snippet).toContain('ПараметрыЗапроса.Вставить("q", "q1");');
    expect(snippet).toContain('ДополнительныеПараметры.Вставить("Заголовки", Заголовки);');
    expect(snippet).toContain('ДополнительныеПараметры.Вставить("ПараметрыЗапроса", ПараметрыЗапроса);');
    expect(snippet).toContain(
      'Результат = КоннекторHTTP.Post("http://localhost:3000", ДанныеТела, ДополнительныеПараметры);'
    );
    expect(snippet).not.toContain('Post("http://localhost:3000?q=q1"');
    expect(snippet).not.toContain('011000010111000001101001');
    expect(snippet).not.toContain('// multipart body is not expanded');
  });

  test('uploads a binary file body from the client to the server', () => {
    const snippet = connectorRu.convert(request({
      method: 'POST',
      url: 'https://example.com/upload',
      fullUrl: 'https://example.com/upload',
      postData: {
        mimeType: 'application/pdf',
        text: 'C:\\docs\\a.pdf',
        params: [
          { name: 'file', value: 'C:\\docs\\a.pdf', fileName: 'C:\\docs\\a.pdf', contentType: 'application/pdf' }
        ]
      }
    }));

    expect(snippet).toContain('ПоместитьФайл(АдресФайла, ПолноеИмяФайла, , Ложь, УникальныйИдентификатор);');
    expect(snippet).toContain('ДвоичныеДанныеФайла = ПолучитьИзВременногоХранилища(АдресФайла);');
    expect(snippet).toContain('КоннекторHTTP.Post("https://example.com/upload", ДвоичныеДанныеФайла');
    expect(snippet).not.toContain('Данные = "C:\\docs\\a.pdf"');
  });

  test('generates Options() for OPTIONS requests', () => {
    const ru = connectorRu.convert(request({
      method: 'OPTIONS',
      url: 'https://httpbin.org/anything',
      fullUrl: 'https://httpbin.org/anything'
    }));

    expect(ru).toContain('КоннекторHTTP.Options("https://httpbin.org/anything")');
    expect(ru).not.toContain('Post(');
    expect(ru).not.toContain('ВызватьHTTPМетод');
  });

  test('comments that CallHTTPMethod must be exported for unknown verbs', () => {
    const ru = connectorRu.convert(request({
      method: 'TRACE',
      url: 'https://httpbin.org/anything',
      fullUrl: 'https://httpbin.org/anything'
    }));
    const en = connectorEn.convert(request({
      method: 'TRACE',
      url: 'https://httpbin.org/anything',
      fullUrl: 'https://httpbin.org/anything'
    }));

    expect(ru).toContain(
      '// Сделайте экспортной КоннекторHTTP.ВызватьHTTPМетод и вызовите её для метода TRACE.'
    );
    expect(ru).toContain(
      'КоннекторHTTP.ВызватьHTTPМетод(Неопределено, "TRACE", "https://httpbin.org/anything", Неопределено)'
    );
    expect(en).toContain(
      '// Export HTTPConnector.CallHTTPMethod and call it for the TRACE method.'
    );
    expect(en).toContain(
      'HTTPConnector.CallHTTPMethod(Undefined, "TRACE", "https://httpbin.org/anything", Undefined)'
    );
  });

  test('keeps Authorization header', () => {
    const snippet = connectorRu.convert(request({
      allHeaders: { Authorization: 'Bearer secret' }
    }));

    expect(snippet).toContain('Заголовки.Вставить("Authorization", "Bearer secret");');
  });
});
