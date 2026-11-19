import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';
import { makeCollection, makeRequest } from '../../common/postman-collection';

const UNPARSABLE_SCRIPT = ['pm.environment.set(\'token\', \'abc\');', 'if (true) {'];

const preRequestEvent = (exec) => ({ listen: 'prerequest', script: { type: 'text/javascript', exec } });

describe('script translation issues', () => {
  let warnSpy;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('reports a request script the AST translator rejects as a degraded import', async () => {
    const request = { ...makeRequest('Login'), event: [preRequestEvent(UNPARSABLE_SCRIPT)] };

    const { collection, issues } = await postmanToBruno(makeCollection([request]));

    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({ path: 'Login', severity: 'warning' });
    expect(issues[0].message).toMatch(/^Script translation fell back to regex replacement: /);
    expect(issues[0].message).not.toContain('\n');
    expect(collection.items[0].request.script.req).toContain('bru.setEnvVar(\'token\', \'abc\');');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('still reports failures without logging them when logTranslationFailures is false', async () => {
    const request = { ...makeRequest('Login'), event: [preRequestEvent(UNPARSABLE_SCRIPT)] };

    const { issues } = await postmanToBruno(makeCollection([request]), { logTranslationFailures: false });

    expect(issues).toHaveLength(1);
    expect(warnSpy).not.toHaveBeenCalledWith('Error in postman translation:', expect.anything());
  });

  it('reports folder and collection scripts with their own paths', async () => {
    const folder = {
      name: 'Auth',
      item: [makeRequest('Login')],
      event: [preRequestEvent(UNPARSABLE_SCRIPT)]
    };

    const { issues } = await postmanToBruno(makeCollection([folder], { event: [preRequestEvent(UNPARSABLE_SCRIPT)] }));

    expect(issues.map((issue) => issue.path)).toEqual(['Collection', 'Auth']);
  });

  it('reports nothing for scripts that translate cleanly', async () => {
    const request = { ...makeRequest('Login'), event: [preRequestEvent(['pm.environment.set(\'token\', \'abc\');'])] };

    const { issues } = await postmanToBruno(makeCollection([request]));

    expect(issues).toEqual([]);
  });

  it('reports nothing when scripts are preserved', async () => {
    const request = { ...makeRequest('Login'), event: [preRequestEvent(UNPARSABLE_SCRIPT)] };

    const { collection, issues } = await postmanToBruno(makeCollection([request]), { preserveScripts: true });

    expect(issues).toEqual([]);
    expect(collection.items[0].request.script.req).toBe(UNPARSABLE_SCRIPT.join('\n'));
  });
});
