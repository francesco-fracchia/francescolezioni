import { head, get, put, del, BlobNotFoundError, issueSignedToken, presignUrl } from '@vercel/blob';
import { requestedRange, boundedBytes } from './bucket.mjs';

function validKey(value) {
  if (typeof value !== 'string' || !/^(learning|homework\/(tasks|submissions))\/[a-zA-Z0-9_/-]+$/.test(value) || value.length > 512) throw new Error('Invalid private archive key');
  return value;
}
export function blobConfigured(config = process.env) {
  return !!config.BLOB_STORE_ID?.trim();
}
export function createBlobBucket({ storeId, sdk = { head, get, put, del, issueSignedToken, presignUrl } }) {
  if (!storeId) throw new Error('Private archive configuration missing');
  const options = { storeId };
  return {
    async get(key, input = {}) {
      validKey(key);
      let meta;
      try { meta = await sdk.head(key, options); }
      catch (error) { if (error instanceof BlobNotFoundError) return null; throw new Error('Private archive unavailable'); }
      if (!Number.isSafeInteger(meta.size) || meta.size < 0 || !meta.etag) throw new Error('Invalid archive metadata');
      const range = requestedRange(input.range, meta.size);
      let result;
      try { result = await sdk.get(key, { ...options, access: 'private', headers: { 'If-Match': meta.etag, ...(range ? { Range: `bytes=${range.offset}-${range.offset + range.length - 1}` } : {}) } }); }
      catch { throw new Error('Private archive unavailable'); }
      if (!result?.stream || result.blob.etag !== meta.etag || (range && result.headers.get('content-range') !== `bytes ${range.offset}-${range.offset + range.length - 1}/${meta.size}`)) {
        await result?.stream?.cancel().catch(() => {});
        throw new Error('Private archive version or range changed');
      }
      return { key, size: meta.size, etag: meta.etag.replaceAll('"', ''), httpEtag: meta.etag, uploaded: meta.uploadedAt, body: result.stream, ...(range ? { range } : {}) };
    },
    async put(key, body, input = {}) {
      validKey(key);
      const bytes = await boundedBytes(body);
      try {
        const result = await sdk.put(key, Buffer.from(bytes), { ...options, access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: input.httpMetadata?.contentType || 'application/octet-stream' });
        return { key, size: bytes.byteLength, etag: result.etag, httpEtag: result.etag, uploaded: new Date() };
      } catch { throw new Error('Private archive upload failed; outcome may require verification'); }
    },
    async delete(keys) {
      const paths = (Array.isArray(keys) ? keys : [keys]).map(validKey);
      try { await sdk.del(paths, options); } catch { throw new Error('Private archive delete failed'); }
    },
    async presignUpload(key, mime, size) {
      validKey(key);
      const validUntil = Date.now() + 5 * 60 * 1000;
      try {
        const token = await sdk.issueSignedToken({ ...options, pathname: key, operations: ['put'], validUntil, allowedContentTypes: [mime], maximumSizeInBytes: size });
        const result = await sdk.presignUrl(token, { operation: 'put', access: 'private', pathname: key, validUntil, allowedContentTypes: [mime], maximumSizeInBytes: size, addRandomSuffix: false, allowOverwrite: false });
        return result.presignedUrl;
      } catch { throw new Error('Private upload authorization unavailable'); }
    },
  };
}
