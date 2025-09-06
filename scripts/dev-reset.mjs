import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.join(process.cwd(), '.data');
const dbPath = path.join(dataDir, 'dev.sqlite');
if (fs.existsSync(dbPath)) fs.rmSync(dbPath);
console.log('Removed', dbPath);

