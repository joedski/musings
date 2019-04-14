// Largely based on this:
//   https://github.com/kuitos/axios-extensions/blob/master/src/cacheAdapterEnhancer.ts

import { AxiosAdapter, AxiosPromise, AxiosRequestConfig } from 'axios';

interface EntityCacheOptions {
  /**
   * Cache key.
   */
  key?: string;
  /**
   * A requested entity's id, used for cache invalidation.
   */
  entityId?: string | number;
  /**
   * Explicitly opt out of caching for a given request.
   */
  disable?: boolean;
}

interface EntityCacheEntry {
  entityId: string | number;
  response: {
    data: any;
    status: number;
    statusText: string;
    headers: { [headerName: string]: string };
    config: EntityCacheRequestConfig;
    // Technically, this could vary by platform.
    // Practically, it's always an XHR for us.
    request: any;
  };
}

interface EntityCacheRequestConfig extends AxiosRequestConfig {
  entityCache?: EntityCacheOptions;
}

function getEntityCacheOptions(config: EntityCacheRequestConfig): EntityCacheOptions {
  return config.entityCache || {};
}

const localStorageKey = 'axios.entityCacheAdapterEnhancer.cache';
// Check cache for existing entry
const cache: Map<string, EntityCacheEntry> = (() => {
  const storageData = window.localStorage.getItem(localStorageKey);
  if (storageData) {
    try {
      return new Map(JSON.parse(storageData));
    } catch (error) {
      // ... eh.
    }
  }
  return new Map();
})();

export default function entityCacheAdapterEnhancer(adapter: AxiosAdapter | undefined): AxiosAdapter {
  if (! adapter) {
    throw new Error(`Received undefined base adapter`);
  }

  return (config: EntityCacheRequestConfig) => {
    const options = getEntityCacheOptions(config);

    if (
      options.disable !== true
      && !! options.key
      && options.entityId != null
    ) {
      const entry = cache.get(options.key);
      if (entry && entry.entityId === options.entityId) {
        return Promise.resolve(entry.response);
      }
      return adapter(config).then(response => {
        const newCacheEntry = {
          entityId: options.entityId!,
          response: {
            // Do we want to cache the headers?  I guess if we're putting
            // a user token here then putting headers isn't any worse.
            // They are pretty big, though.
            // Also, config.  Maybe add enhancer options to transform those things
            // so you can specify headers to keep, etc?
            ...response,
            // For now, we're just blanking this out.
            // Request is mostly used for debugging...
            request: {},
          },
        };
        cache.set(options.key!, newCacheEntry);
        window.localStorage.setItem(localStorageKey, JSON.stringify([...cache.entries()]));
        return response;
      });
    }

    return adapter(config);
  }
}
