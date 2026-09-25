import { nativeRu } from '../native';
import { connectorRu } from '../connector';
import { opiRu } from '../opi';
import { assignStringBody, prettyJsonBodyText } from '../bsl';
import { createRequest } from './createRequest';

describe('1C JSON string body is identical across clients', () => {
  const request = createRequest({
    method: 'POST',
    fullUrl: 'https://httpbin.org/post',
    postData: {
      mimeType: 'application/json',
      jsonObj: { user: { id: 1 }, tags: ['a', 'b'] },
      text: '{"user":{"id":1},"tags":["a","b"]}'
    }
  });

  test('uses ДанныеСтрокой and the same | escaped multiline literal', () => {
    const assignment = assignStringBody(prettyJsonBodyText(request.postData), 'ru').join('\n');

    expect(assignment).toBe(
      [
        'ДанныеСтрокой = "{',
        '|\t""user"": {',
        '|\t\t""id"": 1',
        '|\t},',
        '|\t""tags"": [',
        '|\t\t""a"",',
        '|\t\t""b""',
        '|\t]',
        '|}";'
      ].join('\n')
    );

    expect(nativeRu.convert(request)).toContain(assignment);
    expect(connectorRu.convert(request)).toContain(assignment);
    expect(opiRu.convert(request)).toContain(assignment);

    expect(nativeRu.convert(request)).toContain('HTTPЗапрос.УстановитьТелоИзСтроки(ДанныеСтрокой);');
    expect(connectorRu.convert(request)).toContain('КоннекторHTTP.Post("https://httpbin.org/post", ДанныеСтрокой');
    expect(opiRu.convert(request)).toContain('.УстановитьСтроковоеТело(ДанныеСтрокой)');
  });
});
