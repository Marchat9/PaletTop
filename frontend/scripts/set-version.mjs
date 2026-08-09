import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const versionFile = path.join(__dirname, '../src/environments/splits/environment.version.ts');

const version = process.env.APP_VERSION;

if (!version) {
  console.log('[set-version] APP_VERSION not set, keeping committed default.');
} else {
  await writeFile(versionFile, `export const APP_VERSION = '${version}';\n`);
  console.log(`[set-version] APP_VERSION set to ${version}`);
}
