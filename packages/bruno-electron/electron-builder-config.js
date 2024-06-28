require('dotenv').config({ path: process.env.DOTENV_PATH });

// TAG_NAME is set inside the CI-Pipeline
const isNightly = process.env.RELEASE_TAG_NAME !== undefined;
// Add Nightly-Suffix to the version for nightly builds
const artifactName =
  '${name}_${version}' + (isNightly ? `-${process.env.RELEASE_TAG_NAME}` : '') + '_${arch}_${os}.${ext}';

const config = {
  appId: `com.usebruno${isNightly ? '-nightly' : ''}.app`,
  productName: 'Bruno' + (isNightly ? ' Nightly' : ''),
  electronVersion: '21.1.1',
  directories: {
    buildResources: 'resources',
    output: 'out'
  },
  files: ['**/*'],
  afterSign: 'notarize.js',
  mac: {
    artifactName,
    category: 'public.app-category.developer-tools',
    target: [
      {
        target: 'dmg',
        arch: ['x64', 'arm64']
      },
      {
        target: 'zip',
        arch: ['x64', 'arm64']
      }
    ],
    icon: 'resources/icons/mac/icon.icns',
    hardenedRuntime: true,
    identity: 'Anoop MD (W7LPPWA48L)',
    entitlements: 'resources/entitlements.mac.plist',
    entitlementsInherit: 'resources/entitlements.mac.plist'
  },
  linux: {
    artifactName,
    icon: 'resources/icons/png',
    target: ['AppImage', 'deb', 'snap', 'rpm']
  },
  win: {
    artifactName,
    icon: 'resources/icons/png',
    certificateFile: process.env.WIN_CERT_FILEPATH ? `${process.env.WIN_CERT_FILEPATH}` : undefined,
    certificatePassword: process.env.WIN_CERT_PASSWORD ? `${process.env.WIN_CERT_PASSWORD}` : undefined
  }
};

module.exports = config;
