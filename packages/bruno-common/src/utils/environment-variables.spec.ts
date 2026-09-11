import { toVariablesMap } from './environment-variables';

type VariableProps = {
  name?: string;
  value?: unknown;
  enabled?: boolean;
  secret?: boolean;
};

const variable = (props: VariableProps) => ({ enabled: true, secret: false, ...props });

const secret = (props: Omit<VariableProps, 'secret'>) => variable({ ...props, secret: true });

describe('toVariablesMap', () => {
  it('returns an empty map when there are no variables', () => {
    expect(toVariablesMap()).toEqual({});
  });

  it('maps enabled variables by name', () => {
    const variables = [variable({ name: 'scheme', value: 'https' }), variable({ name: 'host', value: 'dev-host' })];

    expect(toVariablesMap(variables)).toEqual({ scheme: 'https', host: 'dev-host' });
  });

  it('skips disabled variables', () => {
    const variables = [variable({ name: 'host', value: 'dev-host', enabled: false })];

    expect(toVariablesMap(variables)).toEqual({});
  });

  it('skips variables without a name', () => {
    const variables = [variable({ value: 'orphan' })];

    expect(toVariablesMap(variables)).toEqual({});
  });

  it('lets a later variable override an earlier one of the same name', () => {
    const variables = [variable({ name: 'host', value: 'base-host' }), variable({ name: 'host', value: 'dev-host' })];

    expect(toVariablesMap(variables)).toEqual({ host: 'dev-host' });
  });

  it('lets a secret win over a plain variable of the same name declared after it', () => {
    const variables = [secret({ name: 'token', value: 'secret-token' }), variable({ name: 'token', value: 'plain-token' })];

    expect(toVariablesMap(variables)).toEqual({ token: 'secret-token' });
  });

  it('lets a secret win over a plain variable of the same name declared before it', () => {
    const variables = [variable({ name: 'token', value: 'plain-token' }), secret({ name: 'token', value: 'secret-token' })];

    expect(toVariablesMap(variables)).toEqual({ token: 'secret-token' });
  });

  it('ignores a disabled secret so the plain variable of the same name stands', () => {
    const variables = [
      variable({ name: 'token', value: 'plain-token' }),
      secret({ name: 'token', value: 'secret-token', enabled: false })
    ];

    expect(toVariablesMap(variables)).toEqual({ token: 'plain-token' });
  });
});
