import type { R2Bucket, R2Object, R2ObjectBody, R2PutOptions, R2Range } from '@cloudflare/workers-types';

// The APIs used by this app are Web-standard streams/headers in both Node and
// Workers. Keep Cloudflare's extra global declarations out of Next's Node types.
type StoredObject = Omit<R2ObjectBody, 'body'> & { body: ReadableStream<Uint8Array> };
export type MaterialBucket = Pick<R2Bucket, 'delete'> & {
  get(key: string, options?: { range?: Headers | R2Range }): Promise<StoredObject | null>;
  put(key: string, value: ReadableStream<Uint8Array> | ArrayBuffer | ArrayBufferView | Blob | string | null, options?: R2PutOptions): Promise<R2Object | null>;
};
