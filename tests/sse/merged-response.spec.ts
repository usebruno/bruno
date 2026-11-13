import { createServer, ServerResponse } from 'node:http';
import { AddressInfo } from 'node:net';
import { test as base, expect } from '../../playwright';
import { openRequest, sendRequest, buildCommonLocators } from '../utils/page';
import { setSseRequestUrl } from '../utils/page/sse';

const event = (text: string, reasoning?: string) => `data: ${JSON.stringify({
  choices: [{ delta: { content: text, reasoning_content: reasoning } }], payload: { text }
})}\n\n`;

const test = base.extend<{ sseServer: { url: string; finish: (text?: string) => void; receivedAnswer: () => string | null } }>({
  sseServer: async ({}, use) => {
    const streams = new Set<ServerResponse>();
    let receivedAnswer: string | null = null;
    const server = createServer((req, res) => {
      const url = new URL(req.url!, 'http://localhost');
      if (url.pathname === '/echo') {
        receivedAnswer = url.searchParams.get('answer');
        res.end(receivedAnswer);
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/event-stream' });
      streams.add(res);
      res.on('close', () => streams.delete(res));
      const first = Buffer.from(event('你好', '思考过程'));
      const split = first.indexOf(Buffer.from('你好')) + 1;
      res.write(first.subarray(0, split));
      setImmediate(() => { if (!res.destroyed) res.write(first.subarray(split)); });
    });
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    try {
      await use({
        url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
        finish: (text = '世界🌏') => { for (const res of streams) res.end(event(text) + 'data: [DONE]\n\n'); },
        receivedAnswer: () => receivedAnswer
      });
    } finally {
      for (const res of streams) res.destroy();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }
});

test('merges live SSE text, extracts JSONPath variables, and uses the result in a later request', async ({ pageWithUserData: page, sseServer }) => {
  const sse = buildCommonLocators(page).sse;
  await test.step('Merge a live stream and retain access to raw data', async () => {
    await openRequest(page, 'sse-test', 'sse-stream-request');
    await setSseRequestUrl(page, `${sseServer.url}/stream`);
    await sendRequest(page, 200);
    await expect(sse.variable('content')).toHaveText('你好');
    await expect(sse.variable('reasoning')).toHaveText('思考过程');

    await sse.view('Events').click();
    await expect(sse.rawMessage().filter({ hasText: 'payload' }).first()).toBeVisible();
    await sse.view('Merged').click();
  });

  await test.step('Extract and save a custom JSONPath variable', async () => {
    await sse.mode().selectOption('custom');
    await sse.name(1).fill('answer');
    await sse.path(1).fill('$.payload.text');
    await sse.saveVariables().check();
    sseServer.finish();
    await expect(sse.variable('answer')).toHaveText('你好世界🌏');
    await expect(sse.status()).not.toContainText('STREAMING');
  });

  await test.step('Resend without stale content and finish on another response tab', async () => {
    await sendRequest(page, 200);
    await expect(sse.status()).toContainText('STREAMING');
    await expect(sse.variable('answer')).toHaveText('你好');
    await sse.headersTab().click();
    sseServer.finish('，第二次');
    await expect(sse.status()).not.toContainText('STREAMING');
  });

  await test.step('Use the merged runtime variable in the next request', async () => {
    await openRequest(page, 'sse-test', 'ping-request');
    await setSseRequestUrl(page, `${sseServer.url}/echo?answer={{answer}}`);
    await sendRequest(page, 200);
    await expect.poll(sseServer.receivedAnswer).toBe('你好，第二次');
  });
});
