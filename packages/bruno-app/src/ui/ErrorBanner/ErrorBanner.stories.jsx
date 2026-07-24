import React from 'react';
import ErrorBanner from './index';

export default {
  title: 'Components/ErrorBanner',
  component: ErrorBanner,
  parameters: {
    layout: 'padded'
  },
  tags: ['autodocs'],
  argTypes: {
    errors: {
      control: 'object',
      description: 'Array of { title, message } objects to display'
    },
    onClose: {
      description: 'Optional handler; when provided a dismiss (X) button is shown'
    }
  }
};

export const Default = {
  args: {
    errors: [{ title: 'Request failed', message: 'Could not connect to the server (ECONNREFUSED).' }]
  }
};

export const Multiple = {
  args: {
    errors: [
      { title: 'Invalid URL', message: 'The request URL is missing a protocol.' },
      { title: 'Missing header', message: 'Content-Type is required for this request.' }
    ]
  }
};

export const Dismissible = {
  args: {
    errors: [{ title: 'Something went wrong', message: 'Click the X to dismiss this banner.' }],
    onClose: () => {}
  }
};
