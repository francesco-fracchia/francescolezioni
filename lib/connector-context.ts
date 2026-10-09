import type { ExecutionContext } from "@cloudflare/workers-types";
import { AsyncLocalStorage } from "node:async_hooks";
import type { ConnectorBinding } from "./connector-contract.mjs";
import { getCloudflareContext } from '@opennextjs/cloudflare';

// The capability stays request-scoped; it is never cached between visitors.
const bindings = new AsyncLocalStorage<ConnectorBinding | undefined>();

export function runWithConnectorBinding<T>(
  binding: ConnectorBinding | undefined,
  run: () => T,
): T {
  return bindings.run(binding, run);
}

export function getConnectorBinding(): ConnectorBinding | undefined {
  const scoped = bindings.getStore();
  if (scoped) return scoped;
  try {
    const ctx = getCloudflareContext().ctx as ExecutionContext<{ CONNECTORS?: ConnectorBinding }>;
    return ctx.props?.CONNECTORS;
  } catch {
    return undefined;
  }
}
