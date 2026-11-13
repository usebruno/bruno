import React, { useState } from 'react';
import styled from 'styled-components';
import { IconChevronDown } from '@tabler/icons';
import FormField from './index';
import Checkbox from '../../Checkbox';
import SegmentedControl from '../../SegmentedControl';
import MenuDropdown from '../../MenuDropdown';

export default {
  title: 'Patterns/FormField',
  component: FormField,
  tags: ['autodocs'],
  argTypes: {
    layout: {
      control: 'radio',
      options: ['stacked', 'inline', 'leading'],
      description: '\'stacked\': label above the control. \'inline\': label left, control right. \'leading\': control left, label right (checkboxes, radios).'
    }
  }
};

// Demo-only controls styled from the theme, the way settings pages style their inputs.
const DemoInput = styled.input`
  height: 34px;
  padding: 0 10px;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.input.border};
  background-color: ${(props) => props.theme.input.bg};
  color: ${(props) => props.theme.text};
  outline: none;

  &:focus {
    border-color: ${(props) => props.theme.input.focusBorder};
  }
`;

const DemoTrigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 160px;
  height: 34px;
  padding: 0 10px;
  border-radius: 4px;
  border: 1px solid ${(props) => props.theme.input.border};
  background-color: ${(props) => props.theme.input.bg};
  color: ${(props) => props.theme.text};
  cursor: pointer;
`;

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: ${(props) => (props.$layout === 'inline' ? '720px' : '560px')};
`;

const PROTOCOLS = [
  { id: 'http', label: 'HTTP' },
  { id: 'https', label: 'HTTPS' },
  { id: 'socks4', label: 'SOCKS4' },
  { id: 'socks5', label: 'SOCKS5' }
];

/** One form with all four kinds of control: input, SegmentedControl, Checkbox, MenuDropdown. */
const DemoForm = ({ layout, withErrors = false }) => {
  const [port, setPort] = useState(withErrors ? '99999' : '8080');
  const [mode, setMode] = useState('custom');
  const [protocol, setProtocol] = useState('http');
  const [auth, setAuth] = useState(true);
  const inline = layout === 'inline';
  const ids = (name) => `story-${layout}-${withErrors ? 'err-' : ''}${name}`;

  return (
    <List $layout={layout}>
      <FormField
        layout={layout}
        label="Port"
        description="Port of the proxy server."
        htmlFor={ids('port')}
        error={withErrors ? 'Specify port between 1 and 65535' : undefined}
      >
        <DemoInput
          id={ids('port')}
          value={port}
          onChange={(e) => setPort(e.target.value)}
          style={{ width: inline ? 128 : '100%' }}
        />
      </FormField>

      <FormField
        layout={layout}
        label="Proxy mode"
        description="Inherit from preferences, use a custom proxy, or turn it off."
        labelId={ids('mode-label')}
      >
        <SegmentedControl
          ariaLabelledBy={ids('mode-label')}
          name={ids('mode')}
          value={mode}
          onChange={setMode}
          size="md"
          items={[
            { value: 'inherit', label: 'Inherit' },
            { value: 'custom', label: 'Custom' },
            { value: 'off', label: 'Off' }
          ]}
        />
      </FormField>

      <FormField
        layout={layout}
        label="Protocol"
        description="Protocol used to talk to the proxy."
        labelId={ids('protocol-label')}
        error={withErrors ? 'SOCKS4 does not support authentication' : undefined}
      >
        <MenuDropdown
          items={PROTOCOLS.map((item) => ({ ...item, onClick: () => setProtocol(item.id) }))}
          selectedItemId={protocol}
          placement="bottom-start"
          appendTo={() => document.body}
          sameWidth
        >
          <DemoTrigger type="button" aria-labelledby={ids('protocol-label')}>
            <span>{PROTOCOLS.find((item) => item.id === protocol)?.label}</span>
            <IconChevronDown size={14} strokeWidth={2} />
          </DemoTrigger>
        </MenuDropdown>
      </FormField>

      {/* Checkboxes sit before their label in a stacked form, and on the right in an inline list */}
      <FormField
        layout={inline ? 'inline' : 'leading'}
        label="Proxy authentication"
        description="Send a username and password to the proxy."
        htmlFor={ids('auth')}
      >
        <Checkbox
          id={ids('auth')}
          checked={auth}
          onChange={(e) => setAuth(e.target.checked)}
        />
      </FormField>
    </List>
  );
};

const LeadingDemo = () => {
  const [auth, setAuth] = useState(true);
  const [keepDefaults, setKeepDefaults] = useState(false);
  const [mode, setMode] = useState('custom');
  const [protocol, setProtocol] = useState('http');
  return (
    <List $layout="stacked">
      <FormField
        layout="leading"
        label="Proxy authentication"
        description="Send a username and password to the proxy."
        htmlFor="story-leading-auth"
      >
        <Checkbox id="story-leading-auth" checked={auth} onChange={(e) => setAuth(e.target.checked)} />
      </FormField>
      <FormField
        layout="leading"
        label="Keep default CA certificates"
        description="Trust the system certificates as well as your custom one."
        htmlFor="story-leading-keep"
        error={keepDefaults ? undefined : 'Some requests may fail without the default certificates'}
      >
        <Checkbox id="story-leading-keep" checked={keepDefaults} onChange={(e) => setKeepDefaults(e.target.checked)} />
      </FormField>
      <FormField layout="stacked" label="Proxy mode" labelId="story-leading-mode-label">
        <SegmentedControl
          ariaLabelledBy="story-leading-mode-label"
          name="story-leading-mode"
          value={mode}
          onChange={setMode}
          items={[
            { value: 'inherit', label: 'Inherit' },
            { value: 'custom', label: 'Custom' },
            { value: 'off', label: 'Off' }
          ]}
        />
      </FormField>
      <FormField layout="stacked" label="Protocol" labelId="story-leading-protocol-label">
        <MenuDropdown
          items={PROTOCOLS.map((item) => ({ ...item, onClick: () => setProtocol(item.id) }))}
          selectedItemId={protocol}
          placement="bottom-start"
          appendTo={() => document.body}
          sameWidth
        >
          <DemoTrigger type="button" aria-labelledby="story-leading-protocol-label">
            <span>{PROTOCOLS.find((item) => item.id === protocol)?.label}</span>
            <IconChevronDown size={14} strokeWidth={2} />
          </DemoTrigger>
        </MenuDropdown>
      </FormField>
      <FormField layout="stacked" label="Hostname" htmlFor="story-leading-host">
        <DemoInput id="story-leading-host" defaultValue="localhost" style={{ width: '100%' }} />
      </FormField>
    </List>
  );
};

/** Label and description above the control. For inputs and pickers that need the width. */
export const Stacked = {
  args: { layout: 'stacked' },
  render: (args) => <DemoForm {...args} />
};

/** Label and description left, control right-aligned. For compact controls in a list. */
export const Inline = {
  args: { layout: 'inline' },
  render: (args) => <DemoForm {...args} />
};

/** Control left, label right: checkboxes and radios, with the description under the label text. */
export const Leading = {
  render: () => <LeadingDemo />
};

/** Errors render under the control (across the full row in the inline layout). Switch `layout` to compare. */
export const WithErrors = {
  args: { layout: 'stacked' },
  render: (args) => <DemoForm {...args} withErrors />
};
