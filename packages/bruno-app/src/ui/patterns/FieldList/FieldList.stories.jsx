import React, { useState } from 'react';
import styled from 'styled-components';
import { IconChevronDown } from '@tabler/icons';
import FieldList from './index';
import FormField from '../FormField';
import Checkbox from '../../Checkbox';
import SegmentedControl from '../../SegmentedControl';
import MenuDropdown from '../../MenuDropdown';

export default {
  title: 'Patterns/FieldList',
  component: FieldList,
  tags: ['autodocs'],
  argTypes: {
    gap: { control: 'radio', options: ['sm', 'md', 'lg'], description: 'Space between items: \'sm\' 12px, \'md\' 16px, \'lg\' 22px' },
    dividers: { control: 'boolean', description: 'Faint line between items' }
  }
};

const DemoInput = styled.input`
  height: 34px;
  padding: 0 10px;
  border-radius: ${(props) => props.theme.border.radius.sm};
  border: 1px solid ${(props) => props.theme.input.border};
  background-color: ${(props) => props.theme.input.bg};
  color: ${(props) => props.theme.text};
  outline: none;
`;

const DemoTrigger = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 96px;
  height: 34px;
  padding: 0 10px;
  border-radius: ${(props) => props.theme.border.radius.sm};
  border: 1px solid ${(props) => props.theme.input.border};
  background-color: ${(props) => props.theme.input.bg};
  color: ${(props) => props.theme.text};
`;

const PROTOCOLS = [
  { id: 'http', label: 'HTTP' },
  { id: 'https', label: 'HTTPS' },
  { id: 'socks5', label: 'SOCKS5' }
];

/** Inline field list (like Request Settings): input, SegmentedControl, Checkbox and MenuDropdown rows. */
const InlineDemo = ({ gap, dividers }) => {
  const [maxRedirects, setMaxRedirects] = useState('5');
  const [encode, setEncode] = useState('on');
  const [follow, setFollow] = useState(true);
  const [protocol, setProtocol] = useState('http');
  return (
    <FieldList gap={gap} dividers={dividers} className="max-w-[600px]">
      <FormField layout="inline" label="Max Redirects" description="Set a limit for the number of redirects to follow" htmlFor="list-max">
        <DemoInput id="list-max" value={maxRedirects} onChange={(e) => setMaxRedirects(e.target.value)} style={{ width: 96 }} />
      </FormField>
      <FormField layout="inline" label="URL Encoding" description="Automatically encode query parameters in the URL" labelId="list-encode">
        <SegmentedControl
          ariaLabelledBy="list-encode"
          name="list-encode"
          value={encode}
          onChange={setEncode}
          size="sm"
          items={[{ value: 'on', label: 'On' }, { value: 'off', label: 'Off' }]}
        />
      </FormField>
      <FormField layout="inline" label="Automatically Follow Redirects" description="Follow HTTP redirects automatically" htmlFor="list-follow">
        <Checkbox id="list-follow" checked={follow} onChange={(e) => setFollow(e.target.checked)} />
      </FormField>
      <FormField layout="inline" label="Protocol" description="Protocol used to talk to the proxy" labelId="list-protocol">
        <MenuDropdown
          items={PROTOCOLS.map((item) => ({ ...item, onClick: () => setProtocol(item.id) }))}
          selectedItemId={protocol}
          appendTo={() => document.body}
          sameWidth
        >
          <DemoTrigger type="button" aria-labelledby="list-protocol">
            <span>{PROTOCOLS.find((item) => item.id === protocol)?.label}</span>
            <IconChevronDown size={14} strokeWidth={2} />
          </DemoTrigger>
        </MenuDropdown>
      </FormField>
    </FieldList>
  );
};

/** Stacked form (like the proxy pages), with a nested 'sm' list for the checkbox and the fields it controls. */
const StackedDemo = ({ gap, dividers }) => {
  const [mode, setMode] = useState('custom');
  const [protocol, setProtocol] = useState('http');
  const [auth, setAuth] = useState(true);
  return (
    <FieldList gap={gap} dividers={dividers} className="max-w-[500px]">
      <FormField label="Proxy mode" labelId="stacked-mode">
        <SegmentedControl
          ariaLabelledBy="stacked-mode"
          name="stacked-mode"
          value={mode}
          onChange={setMode}
          items={[{ value: 'inherit', label: 'Inherit' }, { value: 'custom', label: 'Custom' }, { value: 'off', label: 'Off' }]}
        />
      </FormField>
      <FormField label="Protocol" labelId="stacked-protocol">
        <MenuDropdown
          items={PROTOCOLS.map((item) => ({ ...item, onClick: () => setProtocol(item.id) }))}
          selectedItemId={protocol}
          appendTo={() => document.body}
          sameWidth
        >
          <DemoTrigger type="button" aria-labelledby="stacked-protocol" style={{ width: 200 }}>
            <span>{PROTOCOLS.find((item) => item.id === protocol)?.label}</span>
            <IconChevronDown size={14} strokeWidth={2} />
          </DemoTrigger>
        </MenuDropdown>
      </FormField>
      <FieldList gap="sm">
        <FormField layout="leading" label="Proxy authentication" htmlFor="stacked-auth">
          <Checkbox id="stacked-auth" checked={auth} onChange={(e) => setAuth(e.target.checked)} />
        </FormField>
        <FormField label="Username" htmlFor="stacked-user">
          <DemoInput id="stacked-user" defaultValue="proxy-user" style={{ width: '100%' }} />
        </FormField>
      </FieldList>
      <FormField label="Proxy Bypass" description="Separate hosts with commas. Wildcards are supported." htmlFor="stacked-bypass">
        <DemoInput id="stacked-bypass" defaultValue="localhost,127.0.0.1" style={{ width: '100%' }} />
      </FormField>
    </FieldList>
  );
};

export const InlineWithDividers = {
  args: { gap: 'sm', dividers: true },
  render: (args) => <InlineDemo {...args} />
};

export const Stacked = {
  args: { gap: 'md', dividers: false },
  render: (args) => <StackedDemo {...args} />
};
