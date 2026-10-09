import { constants, createReadStream, createWriteStream, openSync, fstatSync, closeSync, lstatSync, mkdirSync } from 'node:fs';
import { rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { createHash, randomUUID } from 'node:crypto';

const maximumBytes = 50 * 1024 * 1024;
function directory(location) {
  mkdirSync(location, { recursive: true, mode: 0o700 });
  if (!lstatSync(location).isDirectory() || lstatSync(location).isSymbolicLink()) throw new Error('Unsafe material directory');
}
function byteRange(range, size) {
  if (!range) return null;
  const invalid = () => { const error = new Error('Range not satisfiable'); error.code = 'RANGE_NOT_SATISFIABLE'; error.size = size; throw error; };
  let start, end;
  if (range instanceof Headers) {
    const header = range.get('range');
    if (!header) return null;
    const match = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!match || (!match[1] && !match[2])) return invalid();
    if (!match[1]) { const length = Number(match[2]); if (length <= 0) return invalid(); start = Math.max(0, size - length); end = size - 1; }
    else { start = Number(match[1]); end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1; }
  } else if ('suffix' in range) { start = Math.max(0, size - range.suffix); end = size - 1; }
  else { start = range.offset ?? 0; end = Math.min(size - 1, start + (range.length ?? size) - 1); }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return invalid();
  return { offset: start, length: end - start + 1 };
}
export function createMaterialBucket(root) {
  directory(root);
  function location(key) {
    if (typeof key !== 'string' || !key || key.length > 1024 || /[\x00-\x1f]/.test(key)) throw new Error('Invalid material key');
    // Keys never become filesystem paths, including legacy keys with slashes.
    const hash = createHash('sha256').update(key).digest('hex');
    const shard = path.join(root, hash.slice(0, 2));
    directory(shard);
    return path.join(shard, hash + '.blob');
  }
  function metadata(key, stat) {
    const etag = createHash('sha256').update(`${key}:${stat.size}:${stat.mtimeMs}:${stat.ino}`).digest('hex');
    return { key, size: stat.size, etag, httpEtag: `"${etag}"`, uploaded: stat.mtime };
  }
  return {
    async put(key, value) {
      const file = location(key), temporary = file + '.' + randomUUID() + '.tmp';
      let source;
      if (value instanceof ReadableStream) source = Readable.fromWeb(value);
      else if (value instanceof Blob) source = Readable.fromWeb(value.stream());
      else if (value === null) source = Readable.from([]);
      else if (typeof value === 'string') source = Readable.from([Buffer.from(value)]);
      else if (value instanceof ArrayBuffer) source = Readable.from([Buffer.from(value)]);
      else if (ArrayBuffer.isView(value)) source = Readable.from([Buffer.from(value.buffer, value.byteOffset, value.byteLength)]);
      else throw new TypeError('Unsupported material body');
      let received = 0;
      const limit = new Transform({ transform(chunk, encoding, done) {
        received += chunk.length;
        done(received > maximumBytes ? new Error('Material exceeds 50 MB') : null, chunk);
      } });
      try {
        await pipeline(source, limit, createWriteStream(temporary, { flags: 'wx', mode: 0o600 }));
        await rename(temporary, file);
        return metadata(key, lstatSync(file));
      } finally { await unlink(temporary).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
    },
    async get(key, options = {}) {
      let fd;
      try { fd = openSync(location(key), constants.O_RDONLY | constants.O_NOFOLLOW); }
      catch (error) { if (error.code === 'ENOENT') return null; throw error; }
      let stat, range;
      try {
        stat = fstatSync(fd);
        if (!stat.isFile()) throw new Error('Invalid material object');
        range = byteRange(options.range, stat.size);
      } catch (error) { closeSync(fd); throw error; }
      if (stat.size === 0) { closeSync(fd); return { ...metadata(key, stat), body: new ReadableStream({ start(controller) { controller.close(); } }) }; }
      const stream = createReadStream('', { fd, autoClose: true, ...(range ? { start: range.offset, end: range.offset + range.length - 1 } : {}) });
      return { ...metadata(key, stat), ...(range ? { range } : {}), body: Readable.toWeb(stream) };
    },
    async delete(keys) {
      for (const key of Array.isArray(keys) ? keys : [keys]) await unlink(location(key)).catch(error => { if (error.code !== 'ENOENT') throw error; });
    },
  };
}
