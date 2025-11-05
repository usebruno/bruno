const { filterNotificationsByVersion } = require('./notifications');

describe('filterNotificationsByVersion - basic', () => {
  it('should filter notifications by version', () => {
    const notifications = [{ minVersion: '1.0.0', maxVersion: '1.1.0' }];
    const currentVersion = '1.0.5';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual([{ minVersion: '1.0.0', maxVersion: '1.1.0' }]);
  });

  it('should gracefully handle no notifications', () => {
    const notifications = [];
    const currentVersion = '1.0.5';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual([]);
  });

  it('should gracefully handle notifications are undefined', () => {
    const notifications = undefined;
    const currentVersion = '1.0.5';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual([]);
  });

  it('should gracefully handle scenario when no current version is provided', () => {
    const notifications = [{ minVersion: '1.0.0', maxVersion: '1.1.0' }];
    const filteredNotifications = filterNotificationsByVersion(notifications);
    expect(filteredNotifications).toEqual(notifications);
  });

  it('should gracefully handle scenario minVersion is undefined', () => {
    const notifications = [{ minVersion: undefined, maxVersion: '1.1.0' }];
    const currentVersion = '1.0.5';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual(notifications);
  });

  it('should gracefully handle scenario maxVersion is undefined', () => {
    const notifications = [{ minVersion: '1.0.0', maxVersion: undefined }];
    const currentVersion = '1.0.5';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual(notifications);
  });

  it('should gracefully handle scenario minVersion and maxVersion are undefined', () => {
    const notifications = [{ minVersion: undefined, maxVersion: undefined }];
    const currentVersion = '1.0.5';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual(notifications);
  });
});

describe('filterNotificationsByVersion - semver', () => {
  it('should filter out notifications outside version range', () => {
    const notifications = [
      { minVersion: '1.0.0', maxVersion: '1.1.0' },  // should be included
      { minVersion: '2.0.0', maxVersion: '2.1.0' },  // should be filtered out
      { minVersion: '0.5.0', maxVersion: '0.9.0' }   // should be filtered out
    ];
    const currentVersion = '1.0.5';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual([
      { minVersion: '1.0.0', maxVersion: '1.1.0' }
    ]);
  });

  it('should handle mixed valid and invalid version ranges', () => {
    const notifications = [
      { minVersion: '1.0.0', maxVersion: '2.0.0' },  // should be included
      { minVersion: '3.0.0', maxVersion: '4.0.0' },  // should be filtered out
      { minVersion: '1.5.0', maxVersion: '1.8.0' },  // should be included
      { minVersion: '0.1.0', maxVersion: '0.5.0' }   // should be filtered out
    ];
    const currentVersion = '1.6.0';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual([
      { minVersion: '1.0.0', maxVersion: '2.0.0' },
      { minVersion: '1.5.0', maxVersion: '1.8.0' }
    ]);
  });

  it('should handle edge cases of version ranges', () => {
    const notifications = [
      { minVersion: '1.0.0', maxVersion: '1.0.0' },  // should be included
      { minVersion: '1.0.1', maxVersion: '2.0.0' },  // should be filtered out
      { minVersion: '0.9.9', maxVersion: '1.0.0' }   // should be included
    ];
    const currentVersion = '1.0.0';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual([
      { minVersion: '1.0.0', maxVersion: '1.0.0' },
      { minVersion: '0.9.9', maxVersion: '1.0.0' }
    ]);
  });
});

describe('filterNotificationsByVersion - undefined version bounds', () => {
  it('should include notifications when minVersion is undefined and current version is below maxVersion', () => {
    const notifications = [
      { minVersion: undefined, maxVersion: '2.0.0' }
    ];
    const currentVersion = '1.5.0';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual(notifications);
  });

  it('should exclude notifications when minVersion is undefined and current version is above maxVersion', () => {
    const notifications = [
      { minVersion: undefined, maxVersion: '2.0.0' }
    ];
    const currentVersion = '2.1.0';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual([]);
  });

  it('should include notifications when maxVersion is undefined and current version is above minVersion', () => {
    const notifications = [
      { minVersion: '1.0.0', maxVersion: undefined }
    ];
    const currentVersion = '2.0.0';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual(notifications);
  });

  it('should exclude notifications when maxVersion is undefined and current version is below minVersion', () => {
    const notifications = [
      { minVersion: '1.0.0', maxVersion: undefined }
    ];
    const currentVersion = '0.9.0';
    const filteredNotifications = filterNotificationsByVersion(notifications, currentVersion);
    expect(filteredNotifications).toEqual([]);
  });
});