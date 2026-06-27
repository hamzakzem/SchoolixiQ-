import { runAuthLogin } from '../scenarios/auth-login.js';
import { runDashboardOverview } from '../scenarios/dashboard-overview.js';
import { runStudentsRead } from '../scenarios/students-read.js';
import { runStudentCreate } from '../scenarios/student-create.js';
import { runAttendanceWrite } from '../scenarios/attendance-write.js';
import { runHomework } from '../scenarios/homework.js';
import { runGrades } from '../scenarios/grades.js';
import { runTuitionRead } from '../scenarios/tuition-read.js';
import { runMarketplace } from '../scenarios/marketplace.js';
import { runChat } from '../scenarios/chat.js';
import { runNotifications } from '../scenarios/notifications.js';
import { runParentDashboard } from '../scenarios/parent-dashboard.js';
import { runTeacherDashboard } from '../scenarios/teacher-dashboard.js';
import { runSuperAdminDashboard } from '../scenarios/superadmin-dashboard.js';
import { runLandingPage } from '../scenarios/landing-page.js';
import { getConfig, getCredentials, getSchools } from './config.js';

export function buildContext(vu) {
  const credentials = getCredentials();
  const schools = getSchools();
  return { vu, credentials, schools, token: null, session: null };
}

export function runMixedWorkload(vu) {
  const ctx = buildContext(vu);
  const session = runAuthLogin(ctx);
  if (!session) return;

  ctx.token = session.idToken;
  ctx.session = session;

  runLandingPage(ctx);
  runDashboardOverview(ctx);
  runStudentsRead(ctx);
  runStudentCreate(ctx);
  runAttendanceWrite(ctx);
  runHomework(ctx);
  runGrades(ctx);
  runTuitionRead(ctx);
  runMarketplace(ctx);
  runChat(ctx);
  runNotifications(ctx);
  runParentDashboard(ctx);
  runTeacherDashboard(ctx);

  if (vu % 20 === 0) {
    runSuperAdminDashboard(ctx);
  }
}

export function validateConfigOrThrow() {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error('K6_FIREBASE_API_KEY is required');
  }
  if (!config.testRunId) {
    throw new Error('K6_TEST_RUN_ID is required');
  }
  if (!config.credentialsFile) {
    throw new Error('K6_CREDENTIALS_FILE is required — run seed first');
  }
}
