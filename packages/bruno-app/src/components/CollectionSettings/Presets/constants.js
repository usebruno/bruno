import { PRESET_REQUEST_TYPES } from 'utils/common/constants';

export const requestTypeItems = [
  {
    'value': PRESET_REQUEST_TYPES.HTTP,
    'label': 'HTTP',
    'data-testid': 'presets-request-type-http'
  },
  {
    'value': PRESET_REQUEST_TYPES.GRAPHQL,
    'label': 'GraphQL',
    'data-testid': 'presets-request-type-graphql'
  },
  {
    'value': PRESET_REQUEST_TYPES.GRPC,
    'label': 'gRPC',
    'data-testid': 'presets-request-type-grpc'
  },
  {
    'value': PRESET_REQUEST_TYPES.WS,
    'label': 'WebSocket',
    'data-testid': 'presets-request-type-ws'
  }
];
