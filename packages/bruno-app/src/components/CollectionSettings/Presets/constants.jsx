import React from 'react';
import { IconWorld, IconBolt, IconCirclesRelation, IconPlugConnected } from '@tabler/icons';
import { PRESET_REQUEST_TYPES } from 'utils/common/constants';

export const requestTypeItems = [
  {
    'value': PRESET_REQUEST_TYPES.HTTP,
    'label': 'HTTP',
    'icon': <IconWorld size={15} strokeWidth={1.5} />,
    'data-testid': 'presets-request-type-http'
  },
  {
    'value': PRESET_REQUEST_TYPES.GRAPHQL,
    'label': 'GraphQL',
    'icon': <IconBolt size={15} strokeWidth={1.5} />,
    'data-testid': 'presets-request-type-graphql'
  },
  {
    'value': PRESET_REQUEST_TYPES.GRPC,
    'label': 'gRPC',
    'icon': <IconCirclesRelation size={15} strokeWidth={1.5} />,
    'data-testid': 'presets-request-type-grpc'
  },
  {
    'value': PRESET_REQUEST_TYPES.WS,
    'label': 'WebSocket',
    'icon': <IconPlugConnected size={15} strokeWidth={1.5} />,
    'data-testid': 'presets-request-type-ws'
  }
];
