import { drizzle, PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

type Db = PostgresJsDatabase<typeof schema>;

let _db: Db | null = null;

function connect(): Db {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set — copy .env.example to .env");
  // Supabase's transaction pooler (port 6543) does not support prepared statements.
  return drizzle(postgres(url, { prepare: false }), { schema });
}

/** Lazily-connected client so importing this module never throws at build time. */
export const db: Db = new Proxy({} as Db, {
  // Auth.js' adapter checks the class via the prototype chain; answer without connecting.
  getPrototypeOf() {
    return PostgresJsDatabase.prototype;
  },
  get(_t, prop) {
    _db ??= connect();
    const v = Reflect.get(_db, prop);
    return typeof v === "function" ? v.bind(_db) : v;
  },
});

export { schema };
