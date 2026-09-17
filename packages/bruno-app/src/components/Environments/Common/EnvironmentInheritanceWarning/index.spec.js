import '@testing-library/jest-dom';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import themes from 'themes/index';
import EnvironmentInheritanceWarning from './index';

const buildEnvironment = ({ name, extendsFrom }) => ({
  uid: `uid-${name}`,
  name,
  variables: [],
  extends: extendsFrom
});

const renderWarning = (environments, targetName) =>
  render(
    <ThemeProvider theme={themes.light}>
      <EnvironmentInheritanceWarning
        environment={environments.find((env) => env.name === targetName)}
        environments={environments}
      />
    </ThemeProvider>
  );

describe('EnvironmentInheritanceWarning', () => {
  it('renders nothing when the whole chain resolves', () => {
    const base = buildEnvironment({ name: 'base' });
    const dev = buildEnvironment({ name: 'dev', extendsFrom: 'base' });

    const { container } = renderWarning([base, dev], 'dev');

    expect(container).toBeEmptyDOMElement();
  });

  it('names the parent that resolves to nothing', () => {
    const dev = buildEnvironment({ name: 'dev', extendsFrom: 'base' });

    renderWarning([dev], 'dev');

    expect(screen.getByTestId('env-missing-inherited-environment')).toHaveTextContent(
      'Referenced parent environment not found: base'
    );
    expect(screen.queryByTestId('env-cyclic-inherited-environment')).not.toBeInTheDocument();
  });

  it('draws the path of a cyclic chain, closed back onto its first name', () => {
    const base = buildEnvironment({ name: 'base', extendsFrom: 'dev' });
    const dev = buildEnvironment({ name: 'dev', extendsFrom: 'base' });

    renderWarning([base, dev], 'dev');

    expect(screen.getByTestId('env-cyclic-inherited-environment')).toHaveTextContent(
      'Circular inheritance: dev → base → dev'
    );
    expect(screen.queryByTestId('env-missing-inherited-environment')).not.toBeInTheDocument();
  });

  it('draws only the loop, leaving out the environment on screen when it sits outside', () => {
    const staging = buildEnvironment({ name: 'staging', extendsFrom: 'base' });
    const base = buildEnvironment({ name: 'base', extendsFrom: 'staging' });
    const dev = buildEnvironment({ name: 'dev', extendsFrom: 'staging' });

    renderWarning([base, staging, dev], 'dev');

    expect(screen.getByTestId('env-cyclic-inherited-environment')).toHaveTextContent(
      'Circular inheritance: staging → base → staging'
    );
  });
});
