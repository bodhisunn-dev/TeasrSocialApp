// Using javascript_database blueprint pattern
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Log which database is being used (for debugging)
console.log(`[DB] Connecting to database:`, 
  process.env.DATABASE_URL ? 
  `${process.env.DATABASE_URL.split('@')[1]?.split('/')[0]} (${process.env.NODE_ENV || 'development'})` : 
  'No connection string'
);

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Handle pool errors
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle({ client: pool, schema });