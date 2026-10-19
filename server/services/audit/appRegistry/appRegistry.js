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
    moduleType: 'PLAY_STORE_PUBLIC',
    isPlayStorePublicApp: true,
    distributionChannel: 'Google Play Store (Production Track)',
    keystoreType: 'Google Play App Signing Key',
    category: 'Logistics & Aviation Ground Ops (Play Store)',
    play: {
      applicationId: 'com.bavya.btgs',
      track: 'production'
    },
    signing: {
      // Registered official Play Store release keystore fingerprints
      sha1: [
        '83:98:58:F4:D7:22:67:CE:4D:9B:45:A3:2E:A5:1C:1A:D6:42:F8:77',
        '66:C8:DE:EC:54:EA:27:17:B5:DB:24:05:B6:9F:B5:ED:5D:68:1B:38'
      ],
      sha256: [
        '3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F:7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C'
      ]
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
    moduleType: 'ENTERPRISE_MONITORING',
    isPlayStorePublicApp: false,
    distributionChannel: 'State Govt Operational Portal / MDM (Private APK)',
    keystoreType: 'Independent Dedicated Keystore',
    category: 'Government Veterinary Operations Monitoring',
    play: {
      applicationId: 'in.gov.telangana.vas1962',
      track: 'internal-portal'
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
    moduleType: 'ENTERPRISE_MONITORING',
    isPlayStorePublicApp: false,
    distributionChannel: 'Emergency Fleet Operations MDM / Portal APK',
    keystoreType: 'Independent Fleet Keystore',
    category: 'Emergency Ambulance Fleet Monitoring',
    play: {
      applicationId: 'in.bhspl.ops108',
      track: 'internal-portal'
    },
    signing: {
      sha1: [
        '49:07:E4:89:1C:B3:68:81:80:8C:00:6A:A3:60:D9:B0:0C:83:50:5E',
        '6F:70:81:92:A3:B4:C5:D6:E7:F8:09:1A:2B:3C:4D:5E:6F:70:81:92'
      ],
      sha256: [
        '7A:0B:3D:6E:9F:2A:5C:8B:1D:4E:7F:0A:3C:3B:5A:F2:78:E1:6D:9C:12:4A:8B:0C:5E:7F:3A:9D:2B:1C:8E:4F'
      ]
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
    moduleType: 'ENTERPRISE_MONITORING',
    isPlayStorePublicApp: false,
    distributionChannel: 'Department Health Portal / MDM APK',
    keystoreType: 'Independent Grievance Keystore',
    category: 'Citizen Health Grievance Operations',
    play: {
      applicationId: 'in.bhspl.citizen104',
      track: 'internal-portal'
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

function createDynamicProfile(meta = {}) {
  const pkg = meta.packageName || 'com.bavya.app';
  const name = meta.appName || meta.name || pkg.split('.').slice(-2).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  const appId = (meta.appId && meta.appId !== 'auto') 
    ? meta.appId 
    : (pkg.includes('.') ? pkg.split('.').pop() : 'app').toLowerCase().replace(/[^a-z0-9_]/gi, '-');

  return {
    appId,
    name,
    packageName: pkg,
    platform: 'android-mobile',
    releaseType: 'update',
    isDynamic: true,
    play: {
      applicationId: pkg,
      track: 'production'
    },
    signing: {
      sha1: meta.signingSha1 ? [meta.signingSha1] : [],
      sha256: meta.signingSha256 ? [meta.signingSha256] : []
    },
    android: {
      minSdk: meta.minSdk || 24,
      targetSdkPolicy: 'current'
    },
    permissions: {
      approved: meta.permissions || [
        'android.permission.INTERNET',
        'android.permission.ACCESS_NETWORK_STATE'
      ],
      prohibited: [
        'android.permission.REQUEST_INSTALL_PACKAGES'
      ]
    },
    privacy: {
      policyUrl: meta.policyUrl || '/privacy-policy.html',
      lastReviewed: '2026-09-01',
      requiredDisclosures: ['location', 'camera', 'audio', 'notifications', 'accountDeletion']
    },
    runtime: {
      profile: `${appId}-smoke-v1`,
      criticalPath: ['install', 'launch', 'login', 'dashboard', 'logout']
    }
  };
}

function getAppProfile(appIdOrPackage, dynamicMeta = null) {
  if (!appIdOrPackage || appIdOrPackage === 'auto') {
    if (dynamicMeta && dynamicMeta.packageName) {
      const matched = getAppProfile(dynamicMeta.packageName);
      if (matched && !matched.isDynamic) return matched;
    }
    if (dynamicMeta) {
      return createDynamicProfile(dynamicMeta);
    }
    return APP_REGISTRY['btgs'];
  }

  const key = appIdOrPackage.toLowerCase().trim();
  if (APP_REGISTRY[key]) return APP_REGISTRY[key];

  // Lookup by package name
  for (const appId in APP_REGISTRY) {
    if (APP_REGISTRY[appId].packageName.toLowerCase() === key) {
      return APP_REGISTRY[appId];
    }
  }

  // Lookup by substring / alias (e.g. 'clinozen' in packageName)
  for (const appId in APP_REGISTRY) {
    if (APP_REGISTRY[appId].name.toLowerCase().includes(key) || APP_REGISTRY[appId].packageName.toLowerCase().includes(key)) {
      return APP_REGISTRY[appId];
    }
  }

  // Fallback: create dynamic app profile for uploaded bundle
  return createDynamicProfile(dynamicMeta || { packageName: key });
}

function getAllApps() {
  return Object.values(APP_REGISTRY);
}

function registerAppSigningKey(appIdOrPackage, sha1, sha256 = null) {
  const profile = getAppProfile(appIdOrPackage);
  if (!profile) return false;

  if (!profile.signing) {
    profile.signing = { sha1: [], sha256: [] };
  }
  if (!Array.isArray(profile.signing.sha1)) profile.signing.sha1 = [];
  if (!Array.isArray(profile.signing.sha256)) profile.signing.sha256 = [];

  if (sha1) {
    const cleanSha1 = sha1.toUpperCase().trim();
    if (!profile.signing.sha1.includes(cleanSha1)) {
      profile.signing.sha1.unshift(cleanSha1);
    }
  }

  if (sha256) {
    const cleanSha256 = sha256.toUpperCase().trim();
    if (!profile.signing.sha256.includes(cleanSha256)) {
      profile.signing.sha256.unshift(cleanSha256);
    }
  }

  return true;
}

module.exports = {
  APP_REGISTRY,
  getAppProfile,
  createDynamicProfile,
  getAllApps,
  registerAppSigningKey
};
