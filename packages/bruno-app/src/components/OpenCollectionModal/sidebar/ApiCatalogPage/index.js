import { IconBrandSafari } from '@tabler/icons';
import EarlyAccess from '../../components/EarlyAccess';

const POINTS = [
  'List your API’s collection straight from its public repo',
  'Search collections by API, company or topic',
  'They open it in Bruno in one click and get your updates'
];

const ApiCatalogPage = () => (
  <EarlyAccess
    feature="catalog"
    icon={IconBrandSafari}
    title="Bruno API Catalog"
    subtitle="The public home for Bruno collections"
    points={POINTS}
  />
);

export default ApiCatalogPage;
