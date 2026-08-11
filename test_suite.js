const { initSchema, query } = require('./server/config/db');
const { seedDatabaseIfEmpty } = require('./server/services/seedDataService');
const projectController = require('./server/controllers/projectController');
const versionController = require('./server/controllers/versionController');
const telemetryController = require('./server/controllers/telemetryController');
const crashController = require('./server/controllers/crashController');
const reportsController = require('./server/controllers/reportsController');

function createMockReqRes(reqData = {}) {
  let responseData = null;
  let statusCode = 200;
  return {
    req: {
      query: reqData.query || {},
      body: reqData.body || {},
      params: reqData.params || {},
      headers: reqData.headers || {},
      socket: { remoteAddress: '127.0.0.1' }
    },
    res: {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; },
      send(data) { responseData = data; return this; },
      setHeader() {}
    },
    getResult: () => ({ statusCode, responseData })
  };
}

async function runMultiAppTests() {
  console.log('🧪 Starting Enterprise Multi-App Developer Console Test Suite...\n');

  await initSchema();
  await seedDatabaseIfEmpty();

  // Test 1: Project Catalog (Multi-App Support)
  {
    const { req, res, getResult } = createMockReqRes();
    await projectController.getAllProjects(req, res);
    const { statusCode, responseData } = getResult();
    
    console.log('1️⃣ Test Multi-App Project Registry:');
    console.log('   Total Registered Apps:', responseData.data.length);
    console.log('   Sample Apps:', responseData.data.map(p => p.app_name).join(' | '));
    if (statusCode === 200 && responseData.data.length >= 4) {
      console.log('   ✅ PASS: Multi-app projects catalog initialized successfully.');
    } else {
      console.error('   ❌ FAIL: Failed to list projects.');
      process.exit(1);
    }
  }

  // Test 2: Per-App Version Check (VAS 1962 App)
  {
    const { req, res, getResult } = createMockReqRes({
      query: { app_id: 'in.gov.telangana.vas1962', version: '1.0.0', platform: 'Android' }
    });
    await versionController.checkVersion(req, res);
    const { statusCode, responseData } = getResult();

    console.log('\n2️⃣ Test Version Check for VAS 1962 (v1.0.0):');
    console.log('   App Name:', responseData.data.app_name);
    console.log('   Is Force Update:', responseData.data.is_force_update);
    console.log('   Update Type:', responseData.data.update_type);
    if (responseData.data.is_force_update === true && responseData.data.update_type === 'MANDATORY_FORCE_UPDATE') {
      console.log('   ✅ PASS: VAS 1962 version gatekeeper successfully enforced.');
    } else {
      console.error('   ❌ FAIL: Version check failed.');
      process.exit(1);
    }
  }

  // Test 3: Per-App Version Check (ERC Attendance App)
  {
    const { req, res, getResult } = createMockReqRes({
      query: { app_id: 'in.gov.attendance.erc', version: '1.0.0', platform: 'Android' }
    });
    await versionController.checkVersion(req, res);
    const { statusCode, responseData } = getResult();

    console.log('\n3️⃣ Test Version Check for ERC Attendance (v1.0.0):');
    console.log('   App Name:', responseData.data.app_name);
    console.log('   Is Force Update:', responseData.data.is_force_update);
    if (statusCode === 200 && responseData.data.app_id === 'in.gov.attendance.erc') {
      console.log('   ✅ PASS: ERC Attendance correctly resolved and checked.');
    } else {
      console.error('   ❌ FAIL: Failed ERC check.');
      process.exit(1);
    }
  }

  // Test 4: New App Registration & API Key Generation
  {
    const { req, res, getResult } = createMockReqRes({
      body: {
        app_id: 'in.gov.health. telemedicine',
        app_name: 'eSanjeevani Telemedicine',
        category: 'Healthcare',
        platform: 'Cross-Platform'
      }
    });
    await projectController.createProject(req, res);
    const { statusCode, responseData } = getResult();

    console.log('\n4️⃣ Test New App Registration:');
    console.log('   Generated API Key:', responseData.data.api_key);
    if (statusCode === 201 && responseData.data.api_key.startsWith('app_key_')) {
      console.log('   ✅ PASS: New project registered and API Key generated.');
    } else {
      console.error('   ❌ FAIL: App registration failed.');
      process.exit(1);
    }
  }

  // Test 5: Multi-App Overview KPIs
  {
    const { req, res, getResult } = createMockReqRes({ query: { projectId: 'all' } });
    await reportsController.getOverviewKPIs(req, res);
    const { statusCode, responseData } = getResult();

    console.log('\n5️⃣ Test Global Overview Across All Apps:');
    console.log('   Total Installs Across All Apps:', responseData.data.kpis.total_installations);
    console.log('   Total Managed Apps:', responseData.data.kpis.total_apps_count);
    if (statusCode === 200 && responseData.data.kpis.total_apps_count >= 5) {
      console.log('   ✅ PASS: Global multi-app KPIs aggregated successfully.');
    } else {
      console.error('   ❌ FAIL: Overview aggregation failed.');
      process.exit(1);
    }
  }

  console.log('\n🎉 ALL 5 MULTI-APP ENTERPRISE TEST SUITES PASSED!\n');
  process.exit(0);
}

runMultiAppTests().catch(err => {
  console.error('💥 Test suite error:', err);
  process.exit(1);
});
