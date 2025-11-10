import { Client } from '@replit/object-storage';

// Initialize Object Storage client
let client: Client | null = null;

// Try to initialize client, fallback gracefully
async function getClient(): Promise<Client | null> {
  if (client) return client;
  
  try {
    client = new Client();
    return client;
  } catch (error) {
    console.warn('Object Storage not configured:', error);
    return null;
  }
}

export async function saveToObjectStorage(key: string, data: Buffer): Promise<void> {
  const c = await getClient();
  if (!c) {
    throw new Error('Object Storage not configured');
  }
  await c.uploadFromBytes(key, data);
}

export async function getFromObjectStorage(key: string): Promise<Buffer> {
  const c = await getClient();
  if (!c) {
    throw new Error('Object Storage not configured');
  }
  const bytes = await c.downloadAsBytes(key);
  return Buffer.from(bytes);
}

export async function deleteFromObjectStorage(key: string): Promise<void> {
  const c = await getClient();
  if (!c) {
    throw new Error('Object Storage not configured');
  }
  await c.delete(key);
}

export async function existsInObjectStorage(key: string): Promise<boolean> {
  const c = await getClient();
  if (!c) return false;
  
  try {
    await c.downloadAsBytes(key);
    return true;
  } catch {
    return false;
  }
}