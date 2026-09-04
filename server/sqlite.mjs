import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, chmodSync } from 'node:fs';
import { dirname } from 'node:path';

// Preserve the existing prepared-statement boundary while running without D1.
export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true, mode: 0o700 });
  const sqlite = new DatabaseSync(filename);
  if (filename !== ':memory:') chmodSync(filename, 0o600);
  sqlite.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;');
  class Statement {
    constructor(sql, values = []) { this.sql = sql; this.values = values; }
    bind(...values) { return new Statement(this.sql, values); }
    execute() {
      const statement = sqlite.prepare(this.sql);
      const started = performance.now();
      const results = statement.all(...this.values).map(row => ({ ...row }));
      const meta = sqlite.prepare('SELECT changes() AS changes, last_insert_rowid() AS last_row_id').get();
      return { success: true, results, meta: { ...meta, duration: performance.now() - started } };
    }
    async all() { return this.execute(); }
    async run() { return this.execute(); }
    async first(column) {
      const row = sqlite.prepare(this.sql).get(...this.values);
      return row ? (column === undefined ? { ...row } : row[column]) : null;
    }
    async raw(options = {}) {
      const stmt = sqlite.prepare(this.sql);
      stmt.setReturnArrays(true);
      const rows = stmt.all(...this.values);
      return options.columnNames ? [stmt.columns().map(c => c.name), ...rows] : rows;
    }
  }
  return {
    prepare: sql => new Statement(sql),
    async batch(statements) {
      // There is no await inside the transaction: concurrent requests cannot interleave.
      sqlite.exec('BEGIN IMMEDIATE');
      try { const result = statements.map(s => s.execute()); sqlite.exec('COMMIT'); return result; }
      catch (error) { sqlite.exec('ROLLBACK'); throw error; }
    },
    async exec(sql) { sqlite.exec(sql); return { count: 0, duration: 0 }; },
    close() { sqlite.close(); },
  };
}
