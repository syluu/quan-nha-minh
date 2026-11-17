import pg from 'pg';
import type { WorldState } from '@qnm/shared';
import type { WorldStore } from './worldStore';

const CREATE_TABLE = `
CREATE TABLE IF NOT EXISTS worlds (
  code text PRIMARY KEY,
  schema_version int NOT NULL,
  state jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
)`;

/** Lưu thế giới vào Postgres (Neon). Một dòng / thế giới, state dạng JSONB. */
export class PgWorldStore implements WorldStore {
  private pool: pg.Pool;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString, max: 3 });
    // Neon tự ngủ khi rảnh và cắt kết nối đang nhàn rỗi → pool phát 'error'.
    // Không bắt thì Node coi là lỗi chưa xử lý và tắt cả máy chủ game.
    this.pool.on('error', (err) => console.warn('[db] kết nối nhàn rỗi bị đóng:', err.message));
  }

  async init(): Promise<void> {
    await this.pool.query(CREATE_TABLE);
  }

  async create(world: WorldState): Promise<void> {
    const r = await this.pool.query(
      'INSERT INTO worlds (code, schema_version, state) VALUES ($1, $2, $3) ON CONFLICT (code) DO NOTHING',
      [world.code, world.schemaVersion, JSON.stringify(world)],
    );
    if (r.rowCount === 0) throw new Error('CODE_TAKEN');
  }

  async load(code: string): Promise<unknown | null> {
    const r = await this.pool.query('SELECT state FROM worlds WHERE code = $1', [code]);
    return r.rows[0]?.state ?? null;
  }

  async save(world: WorldState): Promise<void> {
    await this.pool.query(
      `INSERT INTO worlds (code, schema_version, state) VALUES ($1, $2, $3)
       ON CONFLICT (code) DO UPDATE SET schema_version = EXCLUDED.schema_version, state = EXCLUDED.state, updated_at = now()`,
      [world.code, world.schemaVersion, JSON.stringify(world)],
    );
  }

  async exists(code: string): Promise<boolean> {
    const r = await this.pool.query('SELECT 1 FROM worlds WHERE code = $1', [code]);
    return (r.rowCount ?? 0) > 0;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
