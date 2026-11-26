import { IconBrandSafari } from '@tabler/icons';
import EarlyAccess from '../../components/EarlyAccess';

const POINTS = [
  'Indexed automatically from public GitHub repos',
  'Browse by API, company or category',
  'Preview a collection, then add it to your workspace'
];

const ApiCatalogPage = () => (
  <EarlyAccess
    feature="catalog"
    icon={IconBrandSafari}
    title="Bruno API Catalog"
    subtitle="Discover every public Bruno API collections"
    points={POINTS}
    waitlistUrl="https://link.usebruno.com/catalog-waitlist"
  />
);

export default ApiCatalogPage;
