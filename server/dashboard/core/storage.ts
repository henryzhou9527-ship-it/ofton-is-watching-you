import { Logger } from '@nestjs/common';
import { sql, type SQL } from 'drizzle-orm';
import type { PostgresJsDatabase } from '@lark-apaas/nestjs-datapaas';

export type Parameter = string | number | bigint | null;
export type SqlCall = { sql: string; args?: Parameter[] };
type QueryResult = { rows: any[]; changes: number };
export type Statement = {
  sql: string;
  run(...args: Parameter[]): Promise<{ changes: number }>;
  all(...args: Parameter[]): Promise<any[]>;
  get(...args: Parameter[]): Promise<any | null>;
};
export class StorageError extends Error {
  constructor() { super('Persistent storage unavailable'); }
}
function reportStorageFailure(error: unknown): void {
  const chain: { name?: string; code?: string }[] = [];
  let value: any = error;
  for (let depth = 0; value && depth < 3; depth++, value = value.cause) {
    chain.push({ name: value.name, code: value.code });
  }
  Logger.error('[dashboard-storage]', JSON.stringify(chain));
}

let platformDatabase: PostgresJsDatabase | undefined;
export function setPlatformDatabase(database: PostgresJsDatabase): void { platformDatabase = database; }
function getDatabase(): PostgresJsDatabase {
  if (!platformDatabase) throw new StorageError();
  return platformDatabase;
}

export function parameterizedQuery(statement: string, args: Parameter[]): SQL {
  const pieces = statement.split('?');
  if (pieces.length !== args.length + 1) throw new StorageError();
  const chunks: SQL[] = [];
  pieces.forEach((piece, index) => {
    chunks.push(sql.raw(piece));
    if (index < args.length) chunks.push(sql`${args[index]}`);
  });
  return sql.join(chunks, sql.raw(''));
}

function decode(result: any): QueryResult {
  const values = Array.isArray(result) ? result : result.rows || [];
  const numericColumns = new Set(['id', 'count', 'row_count', 'snapshot', 'max_id', 'last_seen', 'last_run_at']);
  const rows = values.map((row: Record<string, unknown>) => Object.fromEntries(
    Object.entries(row).map(([key, value]) => {
      if (numericColumns.has(key) && typeof value === 'string' && /^\d+$/.test(value)) {
        const number = Number(value);
        if (!Number.isSafeInteger(number)) throw new StorageError();
        return [key, number];
      }
      return [key, value];
    }),
  ));
  return { rows, changes: Number(result.count ?? result.rowCount ?? 0) };
}

class PostgreSQLStore {
  readonly provider = 'postgres' as const;
  prepare(statement: string): Statement {
    return {
      sql: statement,
      run: async (...args) => ({ changes: (await this.execute(statement, args)).changes }),
      all: async (...args) => (await this.execute(statement, args)).rows,
      get: async (...args) => (await this.execute(statement, args)).rows[0] ?? null,
    };
  }
  async run(statement: string, ...args: Parameter[]) { return this.prepare(statement).run(...args); }
  async execute(statement: string, args: Parameter[]): Promise<QueryResult> {
    try { return decode(await getDatabase().execute(parameterizedQuery(statement, args))); }
    catch (error) { reportStorageFailure(error); throw new StorageError(); }
  }
  async batch(calls: SqlCall[]): Promise<QueryResult[]> {
    try {
      return await getDatabase().transaction(async transaction => {
        const results: QueryResult[] = [];
        for (const call of calls) results.push(decode(await transaction.execute(parameterizedQuery(call.sql, call.args ?? []))));
        return results;
      });
    } catch (error) { reportStorageFailure(error); throw new StorageError(); }
  }
}

export function openStore(): PostgreSQLStore { return new PostgreSQLStore(); }
