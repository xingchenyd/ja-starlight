// Explicit maintenance only. Never called by application startup or deployment.
import { readFile, writeFile, mkdir, rename, stat, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { planSampleCleanup, applySampleCleanup } from './sample-cleanup.mjs';
const [directory, mode, planFile, backupDirectory] = process.argv.slice(2);
if (!directory || !planFile || !['--plan','--apply'].includes(mode)) throw new Error('Usage: cleanup-samples.mjs DATA (--plan|--apply) PRIVATE_PLAN [COMPLETED_BACKUP]');
const root = resolve(directory), dbFile = join(root, 'app.sqlite');
const db = new DatabaseSync(dbFile, { readOnly: mode === '--plan' });
try {
  if (mode === '--plan') {
    const plan = planSampleCleanup(db);
    await writeFile(resolve(planFile), JSON.stringify(plan, null, 2), { flag: 'wx', mode: 0o600 });
    console.log(JSON.stringify({ totals: plan.totals, reviewCandidates: plan.reviewCandidates, planFile: resolve(planFile) }));
  } else {
    if (!backupDirectory) throw new Error('A completed backup is required');
    const snapshot = resolve(backupDirectory);
    JSON.parse(await readFile(join(snapshot, 'backup-complete.json'), 'utf8'));
    if ((await stat(join(snapshot, 'app.sqlite'))).size === 0) throw new Error('Backup database missing');
    const backup = new DatabaseSync(join(snapshot, 'app.sqlite'), { readOnly: true });
    const plan = JSON.parse(await readFile(resolve(planFile), 'utf8'));
    try {
      if (JSON.stringify(planSampleCleanup(backup)) !== JSON.stringify(plan)) throw new Error('Backup does not match planned data');
    } finally { backup.close(); }
    const totals = applySampleCleanup(db, plan);
    const quarantine = join(snapshot, 'removed-sample-files');
    await mkdir(quarantine, { mode: 0o700, recursive: true });
    const keyHash = key => createHash('sha256').update(key).digest('hex');
    const removedDigests = new Set();
    for (const key of plan.files) {
      const name = keyHash(key) + '.json', source = join(root, 'files', 'index', name);
      try {
        const metadata = JSON.parse(await readFile(source, 'utf8'));
        if (metadata.key !== key || !/^[a-f0-9]{64}$/.test(metadata.sha256)) throw new Error('Invalid file metadata');
        removedDigests.add(metadata.sha256);
        await mkdir(join(quarantine, 'index'), { mode: 0o700, recursive: true });
        await rename(source, join(quarantine, 'index', name));
      } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    const referencedDigests = new Set();
    let names = [];
    try { names = await readdir(join(root, 'files', 'index')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    for (const name of names.filter(name => /^[a-f0-9]{64}\.json$/.test(name))) {
      const metadata = JSON.parse(await readFile(join(root, 'files', 'index', name), 'utf8'));
      referencedDigests.add(metadata.sha256);
    }
    for (const digest of removedDigests) {
      if (referencedDigests.has(digest)) continue;
      await mkdir(join(quarantine, 'blobs'), { mode: 0o700, recursive: true });
      try { await rename(join(root, 'files', 'blobs', digest), join(quarantine, 'blobs', digest)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    }
    console.log(JSON.stringify({ deleted: totals, quarantinedFiles: plan.files.length, preservedNonSampleData: true, backup: snapshot }));
  }
} finally { db.close(); }
