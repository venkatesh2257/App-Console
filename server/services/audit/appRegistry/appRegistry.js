/**
 * Organization Application Registry
 * First-class database of registered applications with known package names,
 * approved signing keystore fingerprints, declared permissions, policy overrides, and smoke profiles.
 */

const APP_REGISTRY = {
  'btgs': {
    appId: 'btgs',
    name: 'Travelite Ground Staff (BTGS)',
    packageName: 'com.bavya.btgs',
    platform: 'android-mobile',
    releaseType: 'update',
    play: {
      applicationId: 'com.bavya.btgs',
      track: 'production'
    },
    signing: {
      // Registered official release keystore fingerprints
      sha1: ['1A:2B:3C:4D:5E:6F:70:81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D'],
      sha256: ['3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C']
    },
    android: {
      minSdk: 24,
      targetSdkPolicy: 'current'
    },
    permissions: {
      approved: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION',
        'android.permission.WAKE_LOCK'
      ],
      prohibited: [
        'android.permission.REQUEST_INSTALL_PACKAGES',
        'android.permission.READ_CALL_LOG',
        'android.permission.READ_SMS'
      ]
    },
    privacy: {
      policyUrl: 'https://ap104grievance.apems.in/privacy-policy.html',
      lastReviewed: '2026-08-15',
      requiredDisclosures: ['location', 'backgroundLocation', 'camera', 'audio', 'notifications', 'accountDeletion']
    },
    runtime: {
      profile: 'btgs-smoke-v1',
      criticalPath: ['install', 'launch', 'login', 'dashboard', 'location_tracking', 'booking_dispatch', 'logout']
    }
  },

  'bh1962': {
    appId: 'bh1962',
    name: 'VAS 1962 Veterinary Operations',
    packageName: 'in.gov.telangana.vas1962',
    platform: 'android-mobile',
    releaseType: 'update',
    play: {
      applicationId: 'in.gov.telangana.vas1962',
      track: 'production'
    },
    signing: {
      sha1: ['4D:5E:6F:70:81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70'],
      sha256: ['5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A']
    },
    android: {
      minSdk: 24,
      targetSdkPolicy: 'current'
    },
    permissions: {
      approved: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.CAMERA',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION'
      ],
      prohibited: [
        'android.permission.REQUEST_INSTALL_PACKAGES'
      ]
    },
    privacy: {
      policyUrl: 'https://ap104grievance.apems.in/privacy-policy.html',
      lastReviewed: '2026-08-10',
      requiredDisclosures: ['location', 'camera', 'notifications', 'accountDeletion']
    },
    runtime: {
      profile: 'bh1962-smoke-v1',
      criticalPath: ['install', 'launch', 'login', 'dashboard', 'case_assignment', 'beneficiary_record', 'logout']
    }
  },

  'ops108': {
    appId: 'ops108',
    name: '108 Emergency Ambulance Ops',
    packageName: 'in.bhspl.ops108',
    platform: 'android-mobile',
    releaseType: 'update',
    play: {
      applicationId: 'in.bhspl.ops108',
      track: 'production'
    },
    signing: {
      sha1: ['6F:70:81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70:81:92'],
      sha256: ['7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F']
    },
    android: {
      minSdk: 24,
      targetSdkPolicy: 'current'
    },
    permissions: {
      approved: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_BACKGROUND_LOCATION',
        'android.permission.RECORD_AUDIO',
        'android.permission.CAMERA',
        'android.permission.POST_NOTIFICATIONS',
        'android.permission.FOREGROUND_SERVICE',
        'android.permission.FOREGROUND_SERVICE_LOCATION'
      ],
      prohibited: [
        'android.permission.REQUEST_INSTALL_PACKAGES'
      ]
    },
    privacy: {
      policyUrl: 'https://ap104grievance.apems.in/privacy-policy.html',
      lastReviewed: '2026-08-20',
      requiredDisclosures: ['location', 'backgroundLocation', 'audio', 'camera', 'notifications', 'accountDeletion']
    },
    runtime: {
      profile: 'ops108-smoke-v1',
      criticalPath: ['install', 'launch', 'driver_login', 'ambulance_status', 'emergency_dispatch', 'navigation', 'case_close']
    }
  },

  'citizen104': {
    appId: 'citizen104',
    name: '104 Health Grievance System',
    packageName: 'in.bhspl.citizen104',
    platform: 'android-mobile',
    releaseType: 'update',
    play: {
      applicationId: 'in.bhspl.citizen104',
      track: 'production'
    },
    signing: {
      sha1: ['81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70:81:92:A3:B4'],
      sha256: ['9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A']
    },
    android: {
      minSdk: 24,
      targetSdkPolicy: 'current'
    },
    permissions: {
      approved: [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE',
        'android.permission.ACCESS_FINE_LOCATION',
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.CAMERA',
        'android.permission.POST_NOTIFICATIONS'
      ],
      prohibited: [
        'android.permission.REQUEST_INSTALL_PACKAGES'
      ]
    },
    privacy: {
      policyUrl: 'https://ap104grievance.apems.in/privacy-policy.html',
      lastReviewed: '2026-08-25',
      requiredDisclosures: ['location', 'camera', 'notifications', 'accountDeletion']
    },
    runtime: {
      profile: 'citizen104-smoke-v1',
      criticalPath: ['install', 'launch', 'citizen_login', 'grievance_form', 'upload_attachment', 'track_ticket', 'logout']
    }
  }
};

function getAppProfile(appIdOrPackage) {
  if (!appIdOrPackage) return null;
  const key = appIdOrPackage.toLowerCase().trim();
  if (APP_REGISTRY[key]) return APP_REGISTRY[key];

  // Lookup by package name
  for (const appId in APP_REGISTRY) {
    if (APP_REGISTRY[appId].packageName.toLowerCase() === key) {
      return APP_REGISTRY[appId];
    }
  }
  return null;
}

function getAllApps() {
  return Object.values(APP_REGISTRY);
}

module.exports = {
  APP_REGISTRY,
  getAppProfile,
  getAllApps
};
