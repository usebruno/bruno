import React from 'react';
import Accordion from './index';

export default {
  title: 'Components/Accordion',
  component: Accordion,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A single-open accordion. Compose with `Accordion.Item` (each given an '
          + '`index`), `Accordion.Header`, and `Accordion.Content`. Only one item is '
          + 'open at a time; `defaultIndex` sets the initially open item.'
      }
    }
  },
  tags: ['autodocs'],
  argTypes: {
    defaultIndex: {
      control: 'number',
      description: 'Index of the item open on first render (omit for all closed)'
    }
  }
};

const Sections = () => (
  <>
    <Accordion.Item index={0}>
      <Accordion.Header>What is Bruno?</Accordion.Header>
      <Accordion.Content>Bruno is an open-source, offline-first API client.</Accordion.Content>
    </Accordion.Item>
    <Accordion.Item index={1}>
      <Accordion.Header>Where are collections stored?</Accordion.Header>
      <Accordion.Content>As plain-text .bru files in a folder on your filesystem.</Accordion.Content>
    </Accordion.Item>
    <Accordion.Item index={2}>
      <Accordion.Header>Does it need an account?</Accordion.Header>
      <Accordion.Content>No — it runs fully offline, no sign-in required.</Accordion.Content>
    </Accordion.Item>
  </>
);

export const Default = {
  render: (args) => (
    <div style={{ maxWidth: 520 }}>
      <Accordion {...args}>
        <Sections />
      </Accordion>
    </div>
  ),
  args: {
    defaultIndex: 0
  }
};

export const AllClosed = {
  render: () => (
    <div style={{ maxWidth: 520 }}>
      <Accordion>
        <Sections />
      </Accordion>
    </div>
  )
};
