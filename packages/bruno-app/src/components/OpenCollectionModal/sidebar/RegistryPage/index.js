import { IconDatabase } from '@tabler/icons';
import EarlyAccess from '../../components/EarlyAccess';

const POINTS = [
  'Publish a release or snapshot of any collection',
  'Testers, PMs and partners open it without git',
  'Runs on your premises, nothing leaves your network'
];

const RegistryPage = () => (
  <EarlyAccess
    feature="registry"
    icon={IconDatabase}
    title="Enterprise Private Registry"
    subtitle="Release collections like packages, gated by your SSO"
    points={POINTS}
  />
);

export default RegistryPage;
