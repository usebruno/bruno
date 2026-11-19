import {
  IconBrandSafari,
  IconClock,
  IconDatabase,
  IconDeviceLaptop,
  IconDownload,
  IconFolder
} from '@tabler/icons';
import { DEFAULT_OPEN_COLLECTION_PAGE, OPEN_COLLECTION_PAGE, OPEN_COLLECTION_SUB_PAGE } from 'utils/common/constants';
import ChooseFolderPage from './ChooseFolderPage';
import ImportPage from './ImportPage';
import RecentsPage from './RecentsPage';
import MyComputerPage from './MyComputerPage';
import MyComputerSubtitle from './MyComputerPage/MyComputerSubtitle';
import LocationsPage from './LocationsPage';
import RegistryPage from './RegistryPage';
import ApiCatalogPage from './ApiCatalogPage';

/**
 * Pages of the Open collection modal, in menu order.
 *
 * @typedef {Object} OpenCollectionPage
 * @property {string} id - Stable id, stored as the current page and used in test ids.
 * @property {string} label - Menu item text.
 * @property {string} title - Page header title.
 * @property {string} [description] - Page header description.
 * @property {React.ComponentType} [subtitle] - Shown in the page header instead of the description. It takes no props.
 * @property {React.ComponentType} icon - Tabler icon shown in the menu.
 * @property {string} [shortcut] - Keybinding action whose shortcut the menu item shows.
 * @property {'sources'} [group] - Pages in the group are listed under the Sources heading.
 * @property {React.ComponentType} component - Page body. It takes no props.
 */

/** @type {OpenCollectionPage[]} */
export const OPEN_COLLECTION_PAGES = [
  {
    id: OPEN_COLLECTION_PAGE.CHOOSE_FOLDER,
    label: 'Choose folder…',
    title: 'Choose folder',
    description: 'Pick one or more collection folders to open them in the current workspace.',
    icon: IconFolder,
    shortcut: 'openCollection',
    component: ChooseFolderPage
  },
  {
    id: OPEN_COLLECTION_PAGE.IMPORT,
    label: 'Import file or URL',
    title: 'Import',
    description: 'From Postman, Insomnia, OpenAPI, WSDL or a Bruno export file',
    icon: IconDownload,
    component: ImportPage
  },
  {
    id: OPEN_COLLECTION_PAGE.RECENTS,
    label: 'Recents',
    title: 'Recents',
    description: 'Collections you opened recently, including ones you closed',
    icon: IconClock,
    component: RecentsPage
  },
  {
    id: OPEN_COLLECTION_PAGE.MY_COMPUTER,
    label: 'My computer',
    title: 'My computer',
    subtitle: MyComputerSubtitle,
    icon: IconDeviceLaptop,
    group: 'sources',
    component: MyComputerPage
  },
  {
    id: OPEN_COLLECTION_PAGE.REGISTRY,
    label: 'Registry',
    title: 'Registry',
    description: 'Collections published to your team’s private registry',
    icon: IconDatabase,
    group: 'sources',
    component: RegistryPage
  },
  {
    id: OPEN_COLLECTION_PAGE.API_CATALOG,
    label: 'API Catalog',
    title: 'API Catalog',
    description: 'Every public Bruno collection indexed from GitHub',
    icon: IconBrandSafari,
    group: 'sources',
    component: ApiCatalogPage
  }
];

/**
 * Pages opened from a menu page. The menu does not list them and keeps their parent marked.
 *
 * @typedef {Object} OpenCollectionSubPage
 * @property {string} id - Stable id, stored as the current page and used in test ids.
 * @property {string} parent - Id of the menu page it belongs to. Back returns there.
 * @property {string} title - Page header title.
 * @property {React.ComponentType} component - Page body. It takes no props.
 */

/** @type {OpenCollectionSubPage[]} */
const OPEN_COLLECTION_SUB_PAGES = [
  {
    id: OPEN_COLLECTION_SUB_PAGE.LOCATIONS,
    parent: OPEN_COLLECTION_PAGE.MY_COMPUTER,
    title: 'Locations',
    component: LocationsPage
  }
];

const findPage = (pageId) => [...OPEN_COLLECTION_PAGES, ...OPEN_COLLECTION_SUB_PAGES].find(({ id }) => id === pageId);

export const findOpenCollectionPage = (pageId) => findPage(pageId) || findPage(DEFAULT_OPEN_COLLECTION_PAGE);
