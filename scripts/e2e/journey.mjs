import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';
import { requireIsolatedEnvironment } from './isolation.mjs';

const { baseUrl } = requireIsolatedEnvironment();
const fixture = JSON.parse(readFileSync(process.env.ACADEMY_E2E_FIXTURE, 'utf8'));
const results = [];
let phase = 'startup';
let lastAction = { kind: 'startup' };
const sessions = { admin: 'academy-e2e-admin', student: 'academy-e2e-student', other: 'academy-e2e-other', peer: 'academy-e2e-peer' };
const allSessions = new Set(Object.values(sessions));
let activationSession = 0;
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assertTrue = (condition, label) => { if (!condition) throw new Error(label); };
function browserFailureCategory(value) {
  if (/execution context.*destroyed|cannot find context|navigation|detached frame|target.*navigat/i.test(value)) return 'navigation';
  if (/timeout|timed out/i.test(value)) return 'timeout';
  if (/locator|element.*not found|no element|strict mode/i.test(value)) return 'locator';
  if (/syntaxerror|referenceerror|typeerror|evaluation error/i.test(value)) return 'javascript';
  return 'unknown';
}
class BrowserOperationError extends Error {
  constructor(category) { super('Browser operation failed; private details suppressed.'); this.category = category; }
}

// Never forward CLI stdout/stderr on failure: these can contain invitation or
// signed Storage URLs. Only allowlisted, constant phase names reach artifacts.
async function browser(actor, args, stdin) {
  // agent-browser 0.27.2's CDP click does not scroll semantic targets into
  // view: an offscreen button can report success while clicking the HTML root.
  // Resolve only the roles used here, scroll the real control, then retain a
  // genuine pointer/keyboard action (never invoke element.click()/submit()).
  if (args[0] === 'find' && args[1] === 'role' && ['click', 'focus'].includes(args[3])) {
    const name = args[args.indexOf('--name') + 1];
    const exact = args.includes('--exact');
    let selector;
    await eventually(async () => {
      selector = await evaluate(actor, `(()=>{const role=${JSON.stringify(args[2])};const name=${JSON.stringify(name)};const elements=[...document.querySelectorAll(role==='button'?'button,[role=button]':'[role='+role+']')];const element=elements.find(el=>{const text=(el.getAttribute('aria-label')??el.textContent??'').replace(/\\s+/g,' ').trim();return el.getClientRects().length&&!el.matches(':disabled')&&(${exact ? 'text===name' : 'text.includes(name)'});});if(!element)return null;document.querySelector('[data-e2e-action]')?.removeAttribute('data-e2e-action');element.setAttribute('data-e2e-action','current');element.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});return '[data-e2e-action=current]';})()`);
      return Boolean(selector);
    }, 'Semantic interaction target did not become visible and enabled.');
    args = [args[3], selector];
  } else if (args[0] === 'click') {
    await browser(actor, ['scrollintoview', args[1]]);
  }
  lastAction = { kind: 'browser', actor, operation: args[0], ...(args[0] === 'find' ? { locator: args[1] } : {}) };
  const child = execFile('agent-browser', ['--session', sessions[actor], '--json', ...args], { timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  if (stdin !== undefined) child.stdin.end(stdin);
  let output;
  let privateError = '';
  child.stderr.on('data', (chunk) => { privateError = (privateError + chunk).slice(-32768); });
  try {
    output = await new Promise((resolve, reject) => {
      let value = '';
      child.stdout.on('data', (chunk) => { value += chunk; });
      child.once('error', reject);
      child.once('close', (code) => code === 0 ? resolve(value) : reject(new BrowserOperationError(browserFailureCategory(privateError + value))));
    });
  } catch (cause) {
    const category = cause instanceof BrowserOperationError ? cause.category : browserFailureCategory(privateError);
    lastAction = { ...lastAction, failure: category };
    throw new BrowserOperationError(category);
  }
  let parsed;
  try { parsed = JSON.parse(output.trim()); } catch {
    lastAction = { ...lastAction, failure: 'protocol', emptyOutput: output.trim().length === 0 };
    throw new BrowserOperationError('protocol');
  }
  if (!parsed.success) {
    const category = browserFailureCategory(JSON.stringify(parsed.error ?? ''));
    lastAction = { ...lastAction, failure: category };
    throw new BrowserOperationError(category);
  }
  if (!parsed.data || typeof parsed.data !== 'object') {
    lastAction = { ...lastAction, failure: 'protocol', missingData: true };
    throw new BrowserOperationError('protocol');
  }
  return parsed.data;
}
async function evaluate(actor, code) {
  return (await browser(actor, ['eval', '--stdin'], code)).result;
}
async function api(actor, path, method = 'GET', body) {
  assertTrue(path.startsWith('/api/') && !path.startsWith('//'), 'Only internal API paths are allowed.');
  const result = await evaluate(actor, `(async()=>{const response=await fetch(${JSON.stringify(path)},{method:${JSON.stringify(method)},credentials:'same-origin',headers:{'content-type':'application/json','idempotency-key':${JSON.stringify(randomUUID())}},${body === undefined ? '' : `body:${JSON.stringify(JSON.stringify(body))},`}signal:AbortSignal.timeout(20000)});const body=await response.json();return {status:response.status,body};})()`);
  const codes = ['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR', 'CONFLICT', 'RATE_LIMITED', 'INTERNAL_ERROR'];
  lastAction = { kind: 'api', actor, method, endpoint: path.split('?')[0].replace(/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}/giu, ':id'), status: result?.status ?? null, code: codes.includes(result?.body?.error?.code) ? result.body.error.code : null };
  return result;
}
async function success(actor, path, method, body) {
  const result = await api(actor, path, method, body);
  assertTrue(result.status >= 200 && result.status < 300 && result.body.ok === true, 'Real API operation did not succeed.');
  return result.body.data;
}
async function eventually(check, label) {
  for (let attempt = 0; attempt < 40; attempt++) {
    try { if (await check()) return; } catch (cause) {
      // A real Auth redirect can replace the page between polls. Retry only
      // that transient browser condition; API/validation/assertion failures
      // remain immediate failures, never converted to a successful oracle.
      if (!(cause instanceof BrowserOperationError) || cause.category !== 'navigation') throw cause;
    }
    await delay(500);
  }
  throw new Error(label);
}
async function checkpoint(name, run) {
  phase = name;
  await run();
  results.push({ name, status: 'passed' });
  console.log(`PASS: ${name}`);
}
async function login(actor, credentials) {
  await browser(actor, ['open', `${baseUrl}/login`]);
  // Next can serve the form before React hydrates. Confirm the existing focus
  // interaction updates React state before filling controlled inputs; otherwise
  // a pre-hydration native submit produces a misleading Auth failure.
  await eventually(async () => {
    await browser(actor, ['press', 'Tab']);
    await browser(actor, ['find', 'label', 'E-mail', 'click', '--exact']);
    return evaluate(actor, `Boolean(document.querySelector('section[data-stage="1"]'))`);
  }, 'Login did not become interactive.');
  await evaluate(actor, `(()=>{const form=document.querySelector('form');form?.addEventListener('submit',()=>{form.dataset.e2eSubmitted='true';},{once:true});})()`);
  await browser(actor, ['find', 'label', 'E-mail', 'fill', credentials.email, '--exact']);
  await browser(actor, ['find', 'label', 'Senha', 'fill', credentials.password, '--exact']);
  await browser(actor, ['find', 'role', 'button', 'click', '--name', 'Entrar no estúdio', '--exact']);
  try {
    await eventually(async () => (await api(actor, '/api/me')).status === 200, 'Real Auth login did not establish an application session.');
  } catch {
    const failed = lastAction;
    const authUi = await evaluate(actor, `(()=>{const text=document.querySelector('[role=alert]')?.textContent??'';const form=document.querySelector('form');return {loginPage:location.pathname==='/login',hasAuthCookie:/sb-[^=;]*auth-token/.test(document.cookie),emailFilled:Boolean(document.querySelector('input[type=email]')?.value),passwordFilled:Boolean(document.querySelector('input[autocomplete=current-password]')?.value),formValid:form?.checkValidity()??false,submitObserved:form?.dataset.e2eSubmitted==='true',pending:document.querySelector('button[type=submit]')?.getAttribute('aria-busy')==='true',requests:performance.getEntriesByType('resource').flatMap(entry=>{const path=new URL(entry.name).pathname;return ['/api/demo/session','/auth/v1/token'].includes(path)?[{endpoint:path,status:entry.responseStatus??null}]:[];}),alertKind:!text?'none':/credencial|invalid.*login|senha.*incorret/i.test(text)?'credentials':/fetch|network|conexão/i.test(text)?'network':/configura|Zod|environment/i.test(text)?'configuration':'other'};})()`);
    lastAction = { ...failed, authUi };
    throw new Error('Real UI login failed; only boolean diagnostics retained.');
  }
}
async function activate(invitation, email) {
  let step = 'validate-link';
  try {
  const link = new URL(invitation.activationLink);
  assert.equal(link.origin, baseUrl, 'Invitation escaped isolated application origin.');
  assertTrue(link.pathname.startsWith('/c/'), 'Invitation must use individual confirmation page.');
  step = 'verify-inert-preview';
  const preview = await fetch(link.href, { headers: { 'user-agent': 'WhatsApp/2.0 Academy-isolated-test' }, redirect: 'manual', signal: AbortSignal.timeout(60000) });
  assert.equal(preview.status, 200, 'Invitation preview must remain an inert confirmation page.');
  const confirmationHtml = await preview.text();
  assertTrue(confirmationHtml.includes('Continuar ativação') && !confirmationHtml.includes('/auth/v1/verify?'), 'Confirmation preview must show the action without exposing the provider token.');
  // Never reopen the IPC identity of a just-closed native daemon. Each pupil
  // gets a fresh browser session, preserving genuine cookie isolation.
  if (activationSession > 0) await browser('student', ['close']);
  sessions.student = `academy-e2e-student-${++activationSession}`;
  allSessions.add(sessions.student);
  step = 'open-confirmation';
  await browser('student', ['open', link.href]);
  step = 'wait-confirmation';
  await browser('student', ['wait', '#invitation-title']);
  step = 'click-confirmation';
  await browser('student', ['find', 'role', 'button', 'click', '--name', 'Continuar ativação']);
  step = 'wait-session-email';
    await eventually(async () => evaluate('student', `document.querySelector('input[readonly][type=email]')?.value===${JSON.stringify(email)}`), 'Invitation email did not populate from real Auth session.');
  step = 'fill-password';
  await browser('student', ['find', 'label', 'Nova senha', 'fill', fixture.password, '--exact']);
  await browser('student', ['find', 'label', 'Confirmar senha', 'fill', fixture.password, '--exact']);
  await browser('student', ['find', 'role', 'button', 'click', '--name', 'Ativar meu acesso', '--exact']);
  step = 'wait-active-enrollment';
  await eventually(async () => (await api('student', '/api/student/journey')).status === 200, 'Invitation activation did not activate the enrollment.');
  } catch (cause) {
    const failed = lastAction;
    const activationUi = await evaluate('student', `(()=>{const text=document.querySelector('[role=alert]')?.textContent??'';const hash=new URLSearchParams(location.hash.slice(1));return {protocol:location.protocol,ready:document.readyState,hasTitle:Boolean(document.getElementById('invitation-title')),page:location.pathname==='/ativar'?'activation':location.pathname.startsWith('/c/')?'confirmation':location.pathname==='/login'?'login':location.pathname==='/auth/v1/verify'?'provider':'other',confirmationButton:[...document.querySelectorAll('button')].some(el=>/Continuar ativação/.test(el.textContent??'')),emailPresent:Boolean(document.querySelector('input[readonly][type=email]')),emailFilled:Boolean(document.querySelector('input[readonly][type=email]')?.value),hasHashError:hash.has('error'),invalidLink:new URLSearchParams(location.search).get('error')==='invalid_link',alertKind:!text?'none':/inválido|expirou/i.test(text)?'invalid_invitation':/link seguro/i.test(text)?'missing_session':/fetch|network/i.test(text)?'network':'other'};})()`).catch((error) => ({ unavailable: true, category: error instanceof BrowserOperationError ? error.category : error instanceof TypeError ? 'type' : 'other' }));
    lastAction = { ...failed, activationStep: step, activationUi };
    throw cause;
  }
}
function invitationPayload(email, placement) {
  return { email, displayName: 'Estudante E2E Fictício', birthDate: '2010-01-15', guardian: { name: 'Responsável E2E Fictício', relationship: 'responsável', email: 'guardian@academy.test' }, consent: { termVersion: 'E2E-local-only', signedAt: new Date().toISOString().slice(0, 10), physicalCopyArchived: true }, enrollment: { curriculumId: fixture.curriculum.id, ...placement } };
}
async function invite(placement) {
  const email = `student.${randomUUID()}@academy.test`;
  const invitation = await success('admin', '/api/admin/students/invite', 'POST', invitationPayload(email, placement));
  assertTrue(Boolean(invitation.studentId && invitation.enrollmentId && invitation.activationLink), 'Invitation contract was incomplete.');
  await activate(invitation, email);
  return { ...invitation, email };
}
async function denied(actor, path, method = 'GET', body) {
  const response = await api(actor, path, method, body);
  assertTrue([401, 403, 404, 409].includes(response.status) && response.body.ok === false, 'Protected operation unexpectedly returned success or an internal error.');
  assertTrue(!JSON.stringify(response.body).includes('signedDownloadUrl'), 'Denied file response leaked a signed URL.');
}
const image = await sharp({ create: { width: 16, height: 16, channels: 3, background: 'orange' } }).png().toBuffer();
async function upload(assignmentId) {
  const target = await success('student', '/api/files/upload-url', 'POST', { assignmentId, filename: 'evidencia-e2e.png', contentType: 'image/png', sizeBytes: image.length });
  const uploadOrigin = new URL(target.signedUploadUrl).origin;
  assert.equal(uploadOrigin, new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin, 'Storage URL escaped local Supabase.');
  const response = await evaluate('student', `(async()=>{const bytes=Uint8Array.from(atob(${JSON.stringify(image.toString('base64'))}),c=>c.charCodeAt(0));const r=await fetch(${JSON.stringify(target.signedUploadUrl)},{method:'PUT',headers:{'content-type':'image/png'},body:bytes,signal:AbortSignal.timeout(20000)});return {status:r.status};})()`);
  assertTrue(response.status >= 200 && response.status < 300, 'Real Storage upload failed.');
  const file = await success('student', `/api/files/${target.file.id}/finalize`, 'POST', {});
  assert.equal(file.status, 'ready');
  return file.id;
}
async function fillActivityUi(activity, imagePath) {
  await browser('student', ['open', `${baseUrl}/atividade?assignmentId=${activity.assignmentId}`]);
  await eventually(async () => evaluate('student', `Boolean(document.getElementById('requirement-${activity.requirements[0].id}'))`), 'Activity form failed to render.');
  for (const requirement of activity.requirements) {
    if (!requirement.required) continue;
    const selector = `#requirement-${requirement.id}`;
    if (requirement.kind === 'file') {
      await browser('student', ['upload', selector, imagePath]);
      await eventually(async () => evaluate('student', `!document.querySelector('button[type=submit]')?.disabled && Boolean(document.querySelector('${selector}')?.closest('[data-attached=true]'))`), 'Real UI file upload did not finish.');
    } else {
      await browser('student', ['fill', selector, requirement.kind === 'text' ? 'Evidência fictícia: defini o problema, implementei os estados e validei o resultado com testes.' : 'https://github.com/academy-e2e/projeto']);
    }
  }
  await browser('student', ['find', 'role', 'button', 'click', '--name', 'Salvar rascunho', '--exact']);
  await eventually(async () => Boolean((await success('student', `/api/student/activities/${activity.assignmentId}`)).latestSubmission?.isDraft), 'UI draft was not persisted.');
  await browser('student', ['find', 'role', 'button', 'click', '--name', activity.status === 'revision_requested' ? 'Enviar nova versão' : 'Enviar versão', '--exact']);
  await eventually(async () => (await success('student', `/api/student/activities/${activity.assignmentId}`)).status === 'submitted', 'UI submission was not persisted.');
  return (await success('student', `/api/student/activities/${activity.assignmentId}`)).latestSubmission;
}
async function reviewUi(submission, adjustment) {
  await browser('admin', ['open', `${baseUrl}/admin/revisoes/${submission.id}`]);
  await eventually(async () => evaluate('admin', `Boolean(document.querySelector('[aria-label="Painel de avaliação"]'))`), 'Review workspace did not render.');
  if (adjustment) {
    const count = await evaluate('admin', `document.querySelectorAll('[role=group][aria-label^="Resultado:"]').length`);
    assertTrue(count > 0, 'Review rubric was empty.');
    for (let index = 0; index < count; index++) {
      // Resolve actual rubric controls, then use genuine browser clicks.
      const selector = await evaluate('admin', `(()=>{const group=document.querySelectorAll('[role=group][aria-label^="Resultado:"]')[${index}];const button=group?.querySelector('button:last-child');if(!button)return null;button.setAttribute('data-e2e-criterion','current');return '[data-e2e-criterion=current]';})()`);
      assertTrue(Boolean(selector), 'Criterion choice missing.');
      await browser('admin', ['click', selector]);
      await evaluate('admin', `document.querySelector('[data-e2e-criterion=current]')?.removeAttribute('data-e2e-criterion')`);
    }
    await browser('admin', ['find', 'placeholder', 'Explique com clareza o que deve mudar e como o aluno saberá que concluiu a correção.', 'fill', 'Atualize a evidência e explique como o estado de erro é apresentado.']);
    await browser('admin', ['find', 'role', 'button', 'click', '--name', 'Enviar correção', '--exact']);
  } else await browser('admin', ['find', 'role', 'button', 'click', '--name', 'Aprovar todos os critérios', '--exact']);
  await browser('admin', ['find', 'role', 'button', 'click', '--name', 'Confirmar e enviar', '--exact']);
  await eventually(async () => Boolean((await success('admin', `/api/admin/submissions/${submission.id}`)).review), 'UI review was not published.');
}

let student;
let firstAssignment;
let absentRecord;
let classData;
let classStudent;
const date = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
const schedule = { startsOn: date, weekdays: [2, 4], startsAtLocal: ['09:00', '09:00'], durationMinutes: 90, timezone: 'America/Sao_Paulo' };
const imagePath = join(process.env.RUNNER_TEMP ?? '.', 'academy-e2e-evidence.png');
writeFileSync(imagePath, image, { mode: 0o600 });
try {
  await checkpoint('real-admin-login-and-tenant-boundary', async () => {
    await login('admin', fixture.actors.admin);
    await login('other', fixture.actors.otherAdmin);
    classData = await success('admin', '/api/admin/classes', 'POST', { name: 'E2E Explorer coletivo', curriculumId: fixture.curriculum.id, schedule });
    assert.equal(classData.sessions.length, 16);
    await denied('other', `/api/admin/classes/${classData.class.id}`);
  });
  await checkpoint('six-active-class-students-and-capacity', async () => {
    for (let index = 0; index < 6; index++) classStudent = await invite({ kind: 'class', classId: classData.class.id });
    const detail = await success('admin', `/api/admin/classes/${classData.class.id}`);
    assert.equal(detail.enrollments.filter((item) => item.status === 'active').length, 6);
    await login('peer', { email: classStudent.email, password: fixture.password });
    const overflow = await api('admin', '/api/admin/students/invite', 'POST', invitationPayload(`overflow.${randomUUID()}@academy.test`, { kind: 'class', classId: classData.class.id }));
    assert.equal(overflow.status, 409);
  });
  await checkpoint('individual-invitation-activation-and-calendar', async () => {
    student = await invite({ kind: 'individual', individualSchedule: schedule });
    const calendar = await success('admin', `/api/admin/enrollments/${student.enrollmentId}/calendar`);
    assert.equal(calendar.length, 16);
    assert.deepEqual(calendar.map((item) => item.lessonPosition), Array.from({ length: 16 }, (_, index) => index + 1));
    const context = await success('admin', `/api/admin/sessions/${calendar[0].id}`);
    assert.equal(context.classId, null);
    assert.equal(context.enrollmentId, student.enrollmentId);
    await denied('student', '/api/admin/dashboard');
    await denied('peer', `/api/student/calendar?enrollmentId=${student.enrollmentId}`);
    await denied('other', `/api/admin/students/${student.studentId}`);
    await success('student', '/api/me', 'PATCH', { githubUsername: 'academy-e2e' });
  });
  await checkpoint('unreleased-content-stays-hidden', async () => {
    const released = await success('admin', `/api/admin/sessions/${classData.sessions[1].id}/release`, 'POST', { target: { kind: 'all_active_enrollments' }, dueAt: new Date(Date.now() + 86400000).toISOString() });
    assert.equal(released.assignmentIds.length, 6);
    await denied('student', `/api/student/activities/${released.assignmentIds[0]}`);
    await browser('student', ['open', `${baseUrl}/atividade?assignmentId=${released.assignmentIds[0]}`]);
    await eventually(async () => evaluate('student', `!document.querySelector('form input[id^=requirement-]') && /restrito|acesso|permissão|encontrad|interrompido/i.test(document.body.innerText)`), 'Unreleased foreign activity rendered its form.');
  });
  const calendar = await success('admin', `/api/admin/enrollments/${student.enrollmentId}/calendar`);
  await checkpoint('ui-upload-draft-submit-correction-resubmit-approval', async () => {
    const released = await success('admin', `/api/admin/sessions/${calendar[0].id}/release`, 'POST', { target: { kind: 'all_active_enrollments' }, dueAt: new Date(Date.now() + 86400000).toISOString() });
    firstAssignment = released.assignmentIds[0];
    let activity = await success('student', `/api/student/activities/${firstAssignment}`);
    const submission = await fillActivityUi(activity, imagePath);
    const fileId = submission.items.find((item) => item.fileId)?.fileId;
    assertTrue(Boolean(fileId), 'UI submission did not retain real uploaded file.');
    await success('admin', `/api/files/${fileId}/download-url`);
    await denied('other', `/api/files/${fileId}/download-url`);
    await denied('peer', `/api/files/${fileId}/download-url`);
    await denied('peer', `/api/student/activities/${firstAssignment}`);
    await reviewUi(submission, true);
    const home = await success('student', '/api/student/home');
    assert.equal(home.primaryAction.kind, 'revise_submission');
    activity = await success('student', `/api/student/activities/${firstAssignment}`);
    const revised = await fillActivityUi(activity, imagePath);
    assert.equal(revised.version, submission.version + 1);
    await reviewUi(revised, false);
    activity = await success('student', `/api/student/activities/${firstAssignment}`);
    assert.equal(activity.status, 'approved');
    assertTrue(activity.submissionHistory.items.length >= 2, 'Version history lost the original submission.');
  });
  await checkpoint('sixteen-lessons-four-projects-and-absence-blocker', async () => {
    for (let index = 0; index < calendar.length; index++) {
      const session = calendar[index];
      const attendance = await success('admin', `/api/admin/sessions/${session.id}/attendance`, 'PUT', { entries: [{ enrollmentId: student.enrollmentId, status: index === 3 ? 'absent' : 'present', privateNote: 'E2E nota privada não visível ao aluno' }] });
      if (index === 3) absentRecord = attendance.find((item) => item.enrollmentId === student.enrollmentId);
      if (index === 0) continue;
      const release = await success('admin', `/api/admin/sessions/${session.id}/release`, 'POST', { target: { kind: 'all_active_enrollments' }, dueAt: new Date(Date.now() + 86400000).toISOString() });
      const assignmentId = release.assignmentIds[0];
      const activity = await success('student', `/api/student/activities/${assignmentId}`);
      const items = [];
      for (const requirement of activity.requirements.filter((item) => item.required)) {
        items.push({ requirementId: requirement.id, kind: requirement.kind, ...(requirement.kind === 'text' ? { textValue: 'Reflexão e evidência E2E: objetivo, decisões, implementação, testes e limitações registrados.' } : requirement.kind === 'file' ? { fileId: await upload(assignmentId) } : { urlValue: 'https://github.com/academy-e2e/projeto' }) });
      }
      const draft = await success('student', `/api/student/activities/${assignmentId}/draft`, 'PUT', { items });
      const submitted = await success('student', `/api/student/activities/${assignmentId}/submit`, 'POST', { expectedDraftId: draft.id });
      await success('admin', `/api/admin/submissions/${submitted.id}/review`, 'POST', { decision: 'approved', feedback: '', criteria: activity.criteria.map((criterion) => ({ criterionId: criterion.id, result: 'met' })) });
    }
    const projects = await success('student', `/api/student/projects?enrollmentId=${student.enrollmentId}`);
    assert.equal(projects.length, 4);
    assertTrue(projects.every((project) => project.status === 'approved'), 'Four Project Days did not consolidate the projects.');
    const completion = await success('admin', `/api/admin/enrollments/${student.enrollmentId}/completion`);
    assert.equal(completion.projectsComplete, true);
    assert.equal(completion.reflectionComplete, true);
    assert.equal(completion.attendanceComplete, false);
    assert.equal(completion.eligible, false);
    await denied('admin', `/api/admin/enrollments/${student.enrollmentId}/complete`, 'POST', {});
  });
  await checkpoint('makeup-presentation-completion-and-read-only', async () => {
    assertTrue(Boolean(absentRecord?.attendanceId), 'Absent attendance record missing.');
    await success('admin', `/api/admin/attendance/${absentRecord.attendanceId}/makeup`, 'POST', { completedAt: new Date().toISOString(), note: 'Reposição individual E2E concluída.' });
    const ownAttendance = await success('student', `/api/student/attendance?enrollmentId=${student.enrollmentId}&limit=100`);
    assertTrue(ownAttendance.items.some((item) => item.status === 'absent' && item.makeup), 'Makeup erased the original absence.');
    assertTrue(!JSON.stringify(ownAttendance).includes('nota privada'), 'Student attendance leaked a private note.');
    const beforePresentation = await success('admin', `/api/admin/enrollments/${student.enrollmentId}/completion`);
    assert.equal(beforePresentation.attendanceComplete, true);
    assert.equal(beforePresentation.eligible, false);
    await success('admin', `/api/admin/enrollments/${student.enrollmentId}/presentation`, 'POST', { kind: 'substitute', performedAt: new Date().toISOString(), contextualNote: 'Demonstração E2E fictícia.' });
    const completion = await success('admin', `/api/admin/enrollments/${student.enrollmentId}/complete`, 'POST', {});
    assert.equal(completion.eligible, true);
    const activity = await success('student', `/api/student/activities/${firstAssignment}`);
    assert.equal(activity.canEdit, false);
    await denied('student', `/api/student/activities/${firstAssignment}/draft`, 'PUT', { items: [] });
    await denied('student', '/api/files/upload-url', 'POST', { assignmentId: firstAssignment, filename: 'after-completion.png', contentType: 'image/png', sizeBytes: image.length });
    const portfolio = [];
    let cursor;
    do {
      const page = await success('student', `/api/student/portfolio?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      portfolio.push(...page.items);
      assertTrue(page.nextCursor !== cursor || page.nextCursor === null, 'Portfolio cursor did not advance.');
      cursor = page.nextCursor;
    } while (cursor);
    assert.equal(portfolio.length, 4);
    assert.equal(new Set(portfolio.map((project) => project.id)).size, 4);
    await success('student', `/api/student/journey?enrollmentId=${student.enrollmentId}`);
  });
  await checkpoint('responsive-content-and-tab-url', async () => {
    for (const width of [375, 768, 1440]) {
      await browser('admin', ['set', 'viewport', String(width), '900']);
      await browser('admin', ['open', `${baseUrl}/admin/alunos/${student.studentId}?tab=formacao`]);
      await eventually(async () => evaluate('admin', `Boolean(document.querySelector('[role=tablist]'))`), 'Administrative tabs failed to render.');
      assertTrue(await evaluate('admin', 'document.documentElement.scrollWidth<=innerWidth+1'), 'Viewport has horizontal overflow.');
      const before = await evaluate('admin', 'location.search');
      await browser('admin', ['find', 'role', 'tab', 'focus', '--name', 'Formação', '--exact']);
      await browser('admin', ['press', 'ArrowLeft']);
      await browser('admin', ['press', 'Enter']);
      await eventually(async () => evaluate('admin', `location.search!==${JSON.stringify(before)}&&new URLSearchParams(location.search).has('tab')`), 'Keyboard tabs did not update URL.');
      const selected = await evaluate('admin', 'document.querySelector("[role=tab][aria-selected=true]")?.textContent');
      await browser('admin', ['back']);
      await eventually(async () => evaluate('admin', `location.search===${JSON.stringify(before)}`), 'Browser Back did not restore the tab URL.');
      await browser('admin', ['forward']);
      await eventually(async () => evaluate('admin', `document.querySelector('[role=tab][aria-selected=true]')?.textContent===${JSON.stringify(selected)}`), 'Browser Forward did not restore the selected tab.');
      await browser('admin', ['reload']);
      await eventually(async () => evaluate('admin', `document.querySelector('[role=tab][aria-selected=true]')?.textContent===${JSON.stringify(selected)}`), 'Tab selection did not survive refresh.');
    }
  });
} catch (cause) {
  // Stack messages may include provider/DOM data. Retain only our own source
  // line numbers and a closed set of error types, never the message or stack.
  const errorType = cause instanceof BrowserOperationError ? `browser-${cause.category}`
    : cause instanceof TypeError ? 'type' : cause instanceof SyntaxError ? 'syntax'
      : cause instanceof ReferenceError ? 'reference' : 'oracle-or-operation';
  const harnessLines = cause instanceof Error
    ? [...(cause.stack ?? '').matchAll(/journey\.mjs:(\d+):\d+/g)].map((match) => Number(match[1])).slice(0, 5) : [];
  lastAction = { ...lastAction, errorType, harnessLines };
  results.push({ name: phase, status: 'failed', reason: 'Behavioral oracle or real operation failed. Private output suppressed.', lastAction });
  process.exitCode = 1;
  console.error(`FAIL: ${phase}. Sensitive browser/provider output was not recorded.`);
  console.error(`Diagnostic: ${JSON.stringify(lastAction)}`);
} finally {
  mkdirSync('artifacts/mvp-e2e', { recursive: true });
  writeFileSync('artifacts/mvp-e2e/result.json', JSON.stringify({ engine: 'agent-browser@0.27.2', backend: 'isolated Supabase Auth/Postgres/Storage', mocks: false, results, journeyPassed: results.length === 8 && results.every((result) => result.status === 'passed') }, null, 2));
  for (const actor of Object.keys(sessions)) await browser(actor, ['close']).catch(() => {});
  for (const session of allSessions) {
    await new Promise((resolve) => execFile('agent-browser', ['--session', session, 'close'], { timeout: 15000 }, () => resolve()));
  }
  unlinkSync(imagePath);
}
