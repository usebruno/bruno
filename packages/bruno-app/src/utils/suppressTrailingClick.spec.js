const { describe, it, expect, jest } = require('@jest/globals');
import { suppressTrailingClickOnce } from './suppressTrailingClick';

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('suppressTrailingClickOnce', () => {
  it('swallows only the next click', async () => {
    await nextTick();
    const onClick = jest.fn();
    document.body.addEventListener('click', onClick);

    suppressTrailingClickOnce();
    document.body.click();
    document.body.click();

    expect(onClick).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('click', onClick);
  });

  it('stops suppressing after a tick when no click followed', async () => {
    await nextTick();
    const onClick = jest.fn();
    document.body.addEventListener('click', onClick);

    suppressTrailingClickOnce();
    await nextTick();
    document.body.click();

    expect(onClick).toHaveBeenCalledTimes(1);
    document.body.removeEventListener('click', onClick);
  });
});
