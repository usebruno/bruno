import React from 'react';
import { IconApi, IconBrandGraphql, IconCode, IconPlugConnected } from '@tabler/icons';
import { PRESET_REQUEST_TYPES } from 'utils/common/constants';

export const requestTypeItems = [
  {
    'value': PRESET_REQUEST_TYPES.HTTP,
    'label': 'HTTP',
    'icon': <IconApi size={18} strokeWidth={1.5} />,
    'data-testid': 'presets-request-type-http'
  },
  {
    'value': PRESET_REQUEST_TYPES.GRAPHQL,
    'label': 'GraphQL',
    'icon': <IconBrandGraphql size={16} strokeWidth={1.5} />,
    'data-testid': 'presets-request-type-graphql'
  },
  {
    'value': PRESET_REQUEST_TYPES.GRPC,
    'label': 'gRPC',
    'icon': <IconCode size={16} strokeWidth={1.5} />,
    'data-testid': 'presets-request-type-grpc'
  },
  {
    'value': PRESET_REQUEST_TYPES.WS,
    'label': 'WebSocket',
    'icon': <IconPlugConnected size={16} strokeWidth={1.5} />,
    'data-testid': 'presets-request-type-ws'
  }
];
