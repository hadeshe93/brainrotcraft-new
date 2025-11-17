import { drizzle, DrizzleD1Database } from 'drizzle-orm/d1';
import * as schema from './schema';

const cachedDrizzleClientMap = new Map<D1Database, DrizzleD1Database<typeof schema>>();
export function createDrizzleClient(db: D1Database) {
	const cached = cachedDrizzleClientMap.get(db);
	if (cached) return cached;

	const client = drizzle(db, { schema });
	cachedDrizzleClientMap.set(db, client);
	return client;
}
