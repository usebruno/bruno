import { addTarget } from 'httpsnippet';
import { nativeEn, nativeRu } from './native';
import { connectorEn, connectorRu } from './connector';
import { opiEn, opiRu } from './opi';

addTarget({
  info: {
    key: '1c',
    title: '1C',
    extname: '.bsl',
    default: 'native-ru'
  },
  clientsById: {
    'native-ru': nativeRu,
    'native-en': nativeEn,
    'connector-ru': connectorRu,
    'connector-en': connectorEn,
    'opi-ru': opiRu,
    'opi-en': opiEn
  }
});
