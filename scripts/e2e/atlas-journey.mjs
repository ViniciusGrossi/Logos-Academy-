import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

/** Real CMS lifecycle; receives the same authenticated browser/API driver.
 * No fixture SQL, substituted fetch, generated signed URL or published mock.
 * UI creates/publishes; API steps test clock guards, assets and preservation.
 */
export async function atlasJourney({ browser, evaluate, success, api, denied, eventually, baseUrl, image, calendar, curriculumId, assertTrue }) {
  const title = `Referência visual E2E ${randomUUID()}`;
  await browser('admin', ['open', `${baseUrl}/admin/atlas`]);
  await browser('admin', ['find', 'role', 'button', 'click', '--name', 'Novo conteúdo', '--exact']);
  await browser('admin', ['find', 'label', 'Título', 'fill', title, '--exact']);
  await browser('admin', ['find', 'role', 'button', 'click', '--name', 'Criar e editar', '--exact']);
  await eventually(async () => evaluate('admin', `/^\\/admin\\/atlas\\/[0-9a-f-]{36}$/.test(location.pathname)`), 'CMS creation did not open the real editor.', 120);
  const itemId = await evaluate('admin', 'location.pathname.split("/").at(-1)');
  let detail = await success('admin', `/api/admin/atlas/${itemId}`);
  assert.equal(detail.status, 'draft');
  await denied('student', `/api/student/concepts/${itemId}`);
  await denied('other', `/api/admin/atlas/${itemId}`);

  const options = await success('admin', '/api/admin/atlas/options?limit=50');
  const lesson = options.lessons.items.find((entry) => entry.curriculumId === curriculumId && entry.title === calendar[0].lessonTitle);
  assertTrue(Boolean(lesson), 'The released lesson was absent from CMS options.');
  const target = await success('admin', '/api/admin/atlas/assets/upload-url', 'POST', { ownerKind: 'concept', ownerId: itemId, filename: 'atlas-e2e.png', contentType: 'image/png', sizeBytes: image.length });
  assert.equal(new URL(target.signedUploadUrl).origin, new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin);
  const put = await evaluate('admin', `(async()=>{const bytes=Uint8Array.from(atob(${JSON.stringify(image.toString('base64'))}),c=>c.charCodeAt(0));const response=await fetch(${JSON.stringify(target.signedUploadUrl)},{method:'PUT',headers:{'content-type':'image/png'},body:bytes,signal:AbortSignal.timeout(20000)});return response.status;})()`);
  assertTrue(put >= 200 && put < 300, 'CMS private asset upload did not succeed.');
  const asset = await success('admin', `/api/admin/atlas/assets/${target.asset.id}/finalize`, 'POST', { alt: 'Imagem laranja fictícia para o ensaio editorial.', caption: 'Asset privado do ambiente isolado.' });
  assert.equal(asset.status, 'ready');
  assert.equal(asset.width, 16);
  assert.equal(asset.height, 16);
  const hiddenId = randomUUID();
  const draft = { ...detail.draft, title, slug: `e2e-${randomUUID()}`, summary: 'Decisão funcional com explicação, comparação e evidência visual.', tags: ['Interface', 'Acessibilidade'], lessonTemplateIds: [lesson.id], contentBlocks: [
    { id: randomUUID(), isVisible: true, type: 'text', heading: 'Uma decisão explicável', body: 'A cor reforça a ação, mas o texto e a estrutura preservam seu significado.' },
    { id: randomUUID(), isVisible: true, type: 'comparison', heading: 'Decorativa ou funcional', left: { title: 'Somente cor', body: 'A mensagem depende de uma única pista.' }, right: { title: 'Texto e forma', body: 'O significado continua perceptível sem cor.' }, emphasis: 'right' },
    { id: randomUUID(), isVisible: true, type: 'image', source: { kind: 'asset', assetId: asset.id, alt: asset.alt } },
    { id: hiddenId, isVisible: false, type: 'text', heading: 'Nota editorial privada', body: 'Este bloco não pode integrar o DTO estudantil.' },
  ] };
  const staleClock = detail.draftUpdatedAt;
  detail = await success('admin', `/api/admin/atlas/${itemId}`, 'PATCH', { expectedDraftUpdatedAt: staleClock, draft });
  const winningDraft = detail.draft;
  const winningClock = detail.draftUpdatedAt;
  const stale = await api('admin', `/api/admin/atlas/${itemId}`, 'PATCH', { expectedDraftUpdatedAt: staleClock, draft: { ...draft, summary: 'Não pode sobrescrever a versão mais recente.' } });
  assert.equal(stale.status, 409);
  const afterConflict = await success('admin', `/api/admin/atlas/${itemId}`);
  assert.deepEqual(afterConflict.draft, winningDraft);
  assert.equal(afterConflict.draftUpdatedAt, winningClock);
  await browser('admin', ['open', `${baseUrl}/admin/atlas/${itemId}`]);
  await browser('admin', ['find', 'role', 'button', 'click', '--name', 'Publicar', '--exact']);
  await browser('admin', ['find', 'role', 'button', 'click', '--name', 'Salvar e publicar', '--exact']);
  await eventually(async () => (await success('admin', `/api/admin/atlas/${itemId}`)).status === 'published', 'CMS UI did not publish the real draft.');
  detail = await success('admin', `/api/admin/atlas/${itemId}`);
  const visible = await success('student', `/api/student/concepts/${itemId}`);
  assert.equal(visible.title, title);
  assertTrue(!JSON.stringify(visible).includes(hiddenId), 'Hidden editorial block leaked to the student DTO.');
  assertTrue(!JSON.stringify(visible).includes('Nota editorial privada'), 'Hidden editorial text leaked without its block identifier.');
  assertTrue(visible.resolvedAssets?.length === 1, 'Published asset was not resolved after authorization.');
  const signedUrl = visible.resolvedAssets[0].readUrl;
  assert.equal(new URL(signedUrl).origin, new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin);
  const downloaded = await evaluate('student', `(async()=>{const response=await fetch(${JSON.stringify(signedUrl)});return {status:response.status,size:(await response.arrayBuffer()).byteLength};})()`);
  assert.equal(downloaded.status, 200);
  assert.equal(downloaded.size, image.length);
  await denied('peer', `/api/student/concepts/${itemId}`);
  await denied('other', '/api/admin/atlas/assets/upload-url', 'POST', { ownerKind: 'concept', ownerId: itemId, filename: 'foreign.png', contentType: 'image/png', sizeBytes: image.length });

  const history = await success('admin', `/api/admin/atlas/${itemId}/revisions?limit=50`);
  const saved = history.items.find((entry) => entry.reason === 'save');
  assertTrue(Boolean(saved), 'CMS save revision was not preserved.');
  const publishedSnapshot = detail.published;
  detail = await success('admin', `/api/admin/atlas/${itemId}`, 'PATCH', { expectedDraftUpdatedAt: detail.draftUpdatedAt, draft: { ...detail.draft, summary: 'Versão privada distinta para provar restauração real.' } });
  assert.notEqual(detail.draft.summary, winningDraft.summary);
  assert.equal((await success('student', `/api/student/concepts/${itemId}`)).summary, visible.summary);
  detail = await success('admin', `/api/admin/atlas/${itemId}/revisions/${saved.revision}/restore`, 'POST', { expectedDraftUpdatedAt: detail.draftUpdatedAt });
  assert.equal(detail.status, 'published');
  assert.deepEqual(detail.draft, winningDraft);
  assert.deepEqual(detail.published, publishedSnapshot);
  assert.equal((await success('student', `/api/student/concepts/${itemId}`)).summary, visible.summary);
  await success('admin', `/api/admin/atlas/${itemId}/archive`, 'POST', { expectedItemUpdatedAt: detail.itemUpdatedAt });
  await denied('student', `/api/student/concepts/${itemId}`);
  const archived = await success('admin', `/api/admin/atlas/${itemId}/revisions?limit=50`);
  assertTrue(['publish', 'restore', 'archive'].every((reason) => archived.items.some((entry) => entry.reason === reason)), 'CMS lifecycle lost an append-only revision.');
}
