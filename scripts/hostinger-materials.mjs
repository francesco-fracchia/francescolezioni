import { readFileSync, realpathSync, lstatSync, createReadStream } from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { getNodeResources } from '../lib/node/runtime.mjs';
const manifest = process.argv[2];
if (!manifest) throw new Error('Specify a JSON manifest: [{"key":"original R2 key","file":"relative export file"}]. Stop the app before importing.');
const source = realpathSync(path.dirname(path.resolve(manifest)));
const entries = JSON.parse(readFileSync(manifest, 'utf8'));
if (!Array.isArray(entries)) throw new Error('Invalid material manifest');
const { DB, BUCKET } = getNodeResources();
try {
  const expected = new Map(DB.sql.prepare('SELECT object_key,size FROM course_materials WHERE object_key IS NOT NULL UNION ALL SELECT object_key,size FROM homework_assignments WHERE object_key IS NOT NULL UNION ALL SELECT object_key,size FROM homework_submissions WHERE object_key IS NOT NULL').all().map(row => [row.object_key, row.size]));
  const keys = new Set();
  // Validate everything before writing. Only DB-referenced, protected objects
  // can be imported; a file from outside the export folder is never read.
  const validated = entries.map(entry => {
    if (!entry || typeof entry.key !== 'string' || typeof entry.file !== 'string' || keys.has(entry.key) || !expected.has(entry.key)) throw new Error('Unknown or duplicate material key');
    keys.add(entry.key);
    const file = realpathSync(path.resolve(source, entry.file));
    if (!file.startsWith(source + path.sep) || !lstatSync(file).isFile()) throw new Error('Material file must be inside the export folder');
    const size = lstatSync(file).size;
    if (size !== expected.get(entry.key) || size > 50 * 1024 * 1024) throw new Error('Material size does not match the exported database');
    return { key: entry.key, file };
  });
  if (keys.size !== expected.size) throw new Error('The manifest must include every DB-referenced material, including homework.');
  for (const entry of validated) await BUCKET.put(entry.key, Readable.toWeb(createReadStream(entry.file)));
  console.log(`Protected files imported: ${validated.length}. Verify downloads with a tutor and a student account before launch.`);
} finally { DB.close(); }
