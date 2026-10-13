import { createHash } from 'node:crypto';

const seededRecords = new Set([
  ...Array.from({ length: 12 }, (_, n) => `formal-job-${String(n + 1).padStart(2, '0')}`),
  ...Array.from({ length: 8 }, (_, n) => `formal-act-${String(n + 1).padStart(2, '0')}`),
  ...Array.from({ length: 10 }, (_, n) => `formal-con-${String(n + 1).padStart(2, '0')}`),
  'formal-student-profile', 'formal-enterprise-profile',
]);
const sampleEmails = new Set(['student@starlight-hunan.cn', 'enterprise@starlight-hunan.cn', 'student-demo@ja-starlight.test', 'enterprise-demo@ja-starlight.test']);
const fixtureId = id => /^(audit-|acceptance-|challenge-acceptance-)/.test(String(id));
const historicalOwner = id => /^(?:ja:)?(?:demo|test|formal):/.test(String(id)) || ['ja:seed','ja:formal'].includes(String(id));
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const tableKeys = {
  users: ['id'], workspace_records: ['id'], organizations: ['id'], activity_registrations: ['id'],
  student_experiences: ['id'], student_favorites: ['id'], student_calendar_events: ['id'], student_profile_shares: ['id'],
  challenge_teams: ['id'], challenge_members: ['activity_id', 'student_id'], challenge_invites: ['id'], challenge_history: ['id'],
  content_comments: ['id'], content_likes: ['content_id', 'user_id'], notifications: ['id'], media_assets: ['id'],
  file_access_logs: ['id'], password_credentials: ['user_id'], password_reset_challenges: ['id'], auth_sessions: ['id'], audit_logs: ['id'],
};

export function planSampleCleanup(db) {
  const existing = new Set(db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(row => row.name));
  const rows = Object.fromEntries(Object.keys(tableKeys).map(table => [table, existing.has(table) ? db.prepare(`SELECT * FROM ${table}`).all().map(row => ({ ...row })) : []]));
  const accountIds = new Set(rows.users.filter(row => ['student','enterprise'].includes(row.role) && (sampleEmails.has(String(row.email).toLowerCase()) || /@(.*\.)?(test|invalid|example)$/.test(String(row.email).toLowerCase()) || /@example\.(com|net|org)$/.test(String(row.email).toLowerCase()))).map(row => row.id));
  const isSampleOwner = id => accountIds.has(id) || historicalOwner(id);
  const records = new Set(rows.workspace_records.filter(row => seededRecords.has(row.id) || fixtureId(row.id) || isSampleOwner(row.owner_id)).map(row => row.id));
  const teams = new Set(rows.challenge_teams.filter(row => records.has(row.activity_id) || isSampleOwner(row.captain_id)).map(row => row.id));
  const registrations = new Set(rows.activity_registrations.filter(row => /^formal-registration-\d{2}$/.test(row.id) || fixtureId(row.id) || records.has(row.activity_id) || isSampleOwner(row.student_owner_id) || isSampleOwner(row.publisher_owner_id)).map(row => row.id));
  const keptPayloads = rows.workspace_records.filter(row => !records.has(row.id)).map(row => row.payload);
  const keptExperiences = rows.student_experiences.filter(row => !isSampleOwner(row.student_id) && !registrations.has(row.source_id) && !records.has(row.source_id) && !teams.has(String(row.source_id || '').replace(/^challenge:/, '')));
  const assets = new Set(rows.media_assets.filter(row => isSampleOwner(row.owner_id) && !keptPayloads.some(payload => payload.includes(row.storage_key) || payload.includes(encodeURIComponent(row.storage_key))) && !keptExperiences.some(item => item.evidence_asset_key === row.storage_key)).map(row => row.id));
  const assetKeys = new Set(rows.media_assets.filter(row => assets.has(row.id)).map(row => row.storage_key));
  const comments = new Set(rows.content_comments.filter(row => records.has(row.content_id) || isSampleOwner(row.author_id)).map(row => row.id));
  const selected = {
    users: row => accountIds.has(row.id),
    workspace_records: row => records.has(row.id),
    organizations: row => row.id === 'formal-organization' || isSampleOwner(row.owner_id),
    activity_registrations: row => registrations.has(row.id),
    student_experiences: row => /^formal-experience-\d{2}$/.test(row.id) || isSampleOwner(row.student_id) || registrations.has(row.source_id) || records.has(row.source_id) || teams.has(String(row.source_id || '').replace(/^challenge:/, '')),
    student_favorites: row => isSampleOwner(row.student_id) || records.has(row.target_id),
    student_calendar_events: row => isSampleOwner(row.student_id) || records.has(row.source_id),
    student_profile_shares: row => isSampleOwner(row.student_id),
    challenge_teams: row => teams.has(row.id),
    challenge_members: row => teams.has(row.team_id) || isSampleOwner(row.student_id),
    challenge_invites: row => teams.has(row.team_id),
    challenge_history: row => teams.has(row.team_id),
    content_comments: row => comments.has(row.id),
    content_likes: row => records.has(row.content_id) || isSampleOwner(row.user_id),
    notifications: row => isSampleOwner(row.user_id) || [...records, ...teams, ...registrations].some(id => String(row.target_url || '').includes(id)),
    media_assets: row => assets.has(row.id),
    file_access_logs: row => isSampleOwner(row.actor_id) || assetKeys.has(row.storage_key),
    password_credentials: row => accountIds.has(row.user_id),
    password_reset_challenges: row => accountIds.has(row.user_id),
    auth_sessions: row => row.subject_type !== 'admin' && accountIds.has(row.subject_id),
    audit_logs: row => isSampleOwner(row.actor_id) || records.has(row.target_id) || teams.has(row.target_id) || registrations.has(row.target_id) || comments.has(row.target_id),
  };
  const tables = Object.entries(selected).filter(([table]) => existing.has(table)).map(([table, match]) => {
    const keys = tableKeys[table];
    const removed = rows[table].filter(match), kept = rows[table].filter(row => !match(row));
    return { table, keys, deleteKeys: removed.map(row => keys.map(key => row[key])), sourceHash: hash(rows[table]), keptHash: hash(kept), count: removed.length, keptCount: kept.length };
  });
  return { version: 1, tables, files: [...assetKeys], totals: Object.fromEntries(tables.filter(table => table.count).map(table => [table.table, table.count])),
    reviewCandidates: rows.workspace_records.filter(row => !records.has(row.id) && /测试|验收|内测|demo/i.test(String(row.payload))).map(row => ({ id: row.id, kind: row.kind, title: JSON.parse(row.payload).title || '' })) };
}

export function applySampleCleanup(db, plan) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const current = planSampleCleanup(db);
    if (hash(current) !== hash(plan)) throw new Error('Database changed since planning; inspect a new plan before applying');
    // Child tables first. Admin credentials and production account records are never cleared.
    const ordered = [...plan.tables.filter(item => !['users','workspace_records'].includes(item.table)), ...plan.tables.filter(item => item.table === 'workspace_records'), ...plan.tables.filter(item => item.table === 'users')];
    for (const item of ordered) {
      const statement = db.prepare(`DELETE FROM ${item.table} WHERE ${item.keys.map(key => `${key}=?`).join(' AND ')}`);
      for (const values of item.deleteKeys) statement.run(...values);
    }
    for (const item of plan.tables) {
      const remaining = db.prepare(`SELECT * FROM ${item.table}`).all().map(row => ({ ...row }));
      if (remaining.length !== item.keptCount || hash(remaining) !== item.keptHash) throw new Error(`Non-sample data changed in ${item.table}`);
    }
    // Validate business data preservation first, then perform the requested
    // ranking-only change so removing samples cannot leave a 1..N gap.
    db.exec(`WITH ranked AS (
      SELECT id,ROW_NUMBER() OVER(PARTITION BY kind ORDER BY
        CASE WHEN CAST(json_extract(payload,'$.sortOrder') AS INTEGER)>0 THEN CAST(json_extract(payload,'$.sortOrder') AS INTEGER) ELSE 2147483647 END,
        COALESCE(published_at,updated_at) DESC,id) AS position
      FROM workspace_records WHERE kind IN ('job','activity','content') AND archived_at IS NULL AND json_extract(payload,'$.reviewStatus')='approved'
    ) UPDATE workspace_records SET payload=json_set(payload,'$.sortOrder',(SELECT position FROM ranked WHERE ranked.id=workspace_records.id)),version=version+1
      WHERE id IN (SELECT id FROM ranked) AND COALESCE(json_extract(payload,'$.sortOrder'),0)<>(SELECT position FROM ranked WHERE ranked.id=workspace_records.id)`);
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Database integrity failed');
    if (db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('Database reference integrity failed');
    db.prepare("INSERT INTO audit_logs(actor_id,action,target_type,target_id) VALUES('system','production-sample-cleanup','maintenance',?)").run(new Date().toISOString());
    db.exec('COMMIT');
    return plan.totals;
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
