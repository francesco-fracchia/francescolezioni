export const canonicalSiteOrigin: string;
export const indexingExcludedPaths: string[];
export function httpsOrigin(value: unknown): string | null;
export function indexingExcluded(path: string): boolean;
export function releaseIndexingAllowed(config: {visibility?: string; indexing?: string; origin?: string}): boolean;
