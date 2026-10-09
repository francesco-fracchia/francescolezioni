import { S3Client, GetObjectCommand, HeadObjectCommand, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

function key(value) {
  if (typeof value !== 'string' || !value || value.length > 1024 || /[\x00-\x1f]/.test(value)) throw new Error('Invalid material key');
  return value;
}
function requestedRange(value, size) {
  if (!value) return null;
  const invalid = () => { const e = new Error('Range not satisfiable'); e.code = 'RANGE_NOT_SATISFIABLE'; e.size = size; throw e; };
  let start, end;
  if (value instanceof Headers) {
    const header = value.get('range');
    if (!header) return null;
    const match = /^bytes=(\d*)-(\d*)$/.exec(header);
    if (!match || (!match[1] && !match[2])) return invalid();
    if (!match[1]) { const length = Number(match[2]); if (!Number.isSafeInteger(length) || length <= 0) return invalid(); start = Math.max(0, size - length); end = size - 1; }
    else { start = Number(match[1]); end = match[2] ? Math.min(size - 1, Number(match[2])) : size - 1; }
  } else if ('suffix' in value) { if (!Number.isSafeInteger(value.suffix) || value.suffix <= 0) return invalid(); start = Math.max(0, size - value.suffix); end = size - 1; }
  else { start = value.offset ?? 0; end = Math.min(size - 1, start + (value.length ?? size) - 1); }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start >= size || end < start) return invalid();
  return { offset: start, length: end - start + 1 };
}
export function createRemoteBucket({ accountId, bucket, accessKeyId, secretAccessKey, client }) {
  if (!/^[a-f0-9]{32}$/i.test(accountId || '') || !bucket || !accessKeyId || !secretAccessKey) throw new Error('Remote archive configuration missing');
  const s3 = client || new S3Client({ endpoint: `https://${accountId}.r2.cloudflarestorage.com`, region: 'auto', credentials: { accessKeyId, secretAccessKey }, maxAttempts: 1 });
  const missing = e => e?.name === 'NoSuchKey' || e?.name === 'NotFound' || e?.$metadata?.httpStatusCode === 404;
  return {
    async get(objectKey, options = {}) {
      key(objectKey);
      let head;
      try { head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey })); }
      catch (e) { if (missing(e)) return null; throw new Error('Private archive unavailable'); }
      const size = head.ContentLength;
      if (!Number.isSafeInteger(size) || size < 0 || !head.ETag) throw new Error('Invalid archive metadata');
      const range = requestedRange(options.range, size);
      let object;
      try { object = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: objectKey, IfMatch: head.ETag, ...(range ? { Range: `bytes=${range.offset}-${range.offset + range.length - 1}` } : {}) })); }
      catch { throw new Error('Private archive unavailable'); }
      if (!object.Body) throw new Error('Private archive unavailable');
      return { key: objectKey, size, httpEtag: head.ETag, etag: head.ETag.replaceAll('"', ''), uploaded: head.LastModified, ...(range ? { range } : {}), body: object.Body.transformToWebStream() };
    },
    async put(objectKey, value, options = {}) {
      key(objectKey);
      let bytes;
      if (value instanceof ReadableStream) {
        const reader = value.getReader(), chunks = [];
        let length = 0;
        try {
          while (true) {
            const chunk = await reader.read();
            if (chunk.done) break;
            if (!(chunk.value instanceof Uint8Array)) throw new TypeError('Upload stream must contain bytes');
            length += chunk.value.byteLength;
            if (length > 50 * 1024 * 1024) throw new Error('Material exceeds 50 MB');
            chunks.push(chunk.value);
          }
        } catch (error) {
          await reader.cancel().catch(() => {});
          throw error;
        } finally { reader.releaseLock(); }
        bytes = new Uint8Array(length);
        let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      }
      else if (value instanceof Blob) {
        if (value.size > 50 * 1024 * 1024) throw new Error('Material exceeds 50 MB');
        bytes = new Uint8Array(await value.arrayBuffer());
      }
      else if (value instanceof ArrayBuffer) bytes = new Uint8Array(value);
      else if (ArrayBuffer.isView(value)) bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
      else if (typeof value === 'string') bytes = new TextEncoder().encode(value);
      else if (value === null) bytes = new Uint8Array();
      else throw new TypeError('Remote upload requires a bounded body');
      if (bytes.byteLength > 50 * 1024 * 1024) throw new Error('Material exceeds 50 MB');
      let response;
      try { response = await s3.send(new PutObjectCommand({ Bucket: bucket, Key: objectKey, Body: bytes, ContentLength: bytes.byteLength, ContentType: options.httpMetadata?.contentType || 'application/octet-stream' })); }
      catch { throw new Error('Private archive upload failed; outcome may require verification'); }
      return { key: objectKey, size: bytes.byteLength, httpEtag: response.ETag, etag: response.ETag?.replaceAll('"', ''), uploaded: new Date() };
    },
    async delete(keys) {
      for (const objectKey of Array.isArray(keys) ? keys : [keys]) {
        key(objectKey);
        try { await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey })); }
        catch { throw new Error('Private archive delete failed'); }
      }
    },
  };
}
