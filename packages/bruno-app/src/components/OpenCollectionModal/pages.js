import {
  IconBrandSafari,
  IconClock,
  IconDatabase,
  IconDeviceLaptop,
  IconDownload,
  IconFolder
} from '@tabler/icons';
import ChooseFolderPage from './ChooseFolderPage';
import ImportPage from './ImportPage';
import RecentsPage from './RecentsPage';
import MyComputerPage from './MyComputerPage';
import RegistryPage from './RegistryPage';
import ApiCatalogPage from './ApiCatalogPage';

/**
 * Pages of the Open collection modal, in menu order.
 *
 * @typedef {Object} OpenCollectionPage
 * @property {string} id - Stable id, stored as the current page and used in test ids.
 * @property {string} label - Menu item text.
 * @property {string} title - Page header title.
 * @property {string} description - Page header description.
 * @property {React.ComponentType} icon - Tabler icon shown in the menu.
 * @property {'sources'} [group] - Pages in the group are listed under the Sources heading.
 * @property {React.ComponentType} component - Page body. It takes no props.
 */

/** @type {OpenCollectionPage[]} */
export const OPEN_COLLECTION_PAGES = [
  {
    id: 'choose-folder',
    label: 'Choose folder…',
    title: 'Choose folder',
    description: 'Collections from any folder you pick or drop here',
    icon: IconFolder,
    component: ChooseFolderPage
  },
  {
    id: 'import',
    label: 'Import file or URL',
    title: 'Import',
    description: 'Collections from Postman, Insomnia, OpenAPI, WSDL or Bruno export files',
    icon: IconDownload,
    component: ImportPage
  },
  {
    id: 'recents',
    label: 'Recents',
    title: 'Recents',
    description: 'Collections you opened recently, including ones you closed',
    icon: IconClock,
    component: RecentsPage
  },
  {
    id: 'my-computer',
    label: 'My computer',
    title: 'My computer',
    description: 'Collections Bruno found on your computer',
    icon: IconDeviceLaptop,
    group: 'sources',
    component: MyComputerPage
  },
  {
    id: 'registry',
    label: 'Registry',
    title: 'Registry',
    description: 'Collections published to your team’s private registry',
    icon: IconDatabase,
    group: 'sources',
    component: RegistryPage
  },
  {
    id: 'api-catalog',
    label: 'API Catalog',
    title: 'API Catalog',
    description: 'Collections from public GitHub repos, indexed by Bruno',
    icon: IconBrandSafari,
    group: 'sources',
    component: ApiCatalogPage
  }
];
