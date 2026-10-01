export const getOutputAddresses = (env: NodeJS.ProcessEnv = process.env): string[] => {
  return ['LEFT', 'RIGHT'].map(role => {
    const key = `OCTACORE_${role}_URL`;
    const address = env[key] ?? `ws://octacore-${role.toLowerCase()}.local:81`;
    let url: URL;
    try {
      url = new URL(address);
    } catch {
      throw new Error(`${key} must be a ws:// or wss:// URL`);
    }
    if (!['ws:', 'wss:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.hash) {
      throw new Error(`${key} must be a ws:// or wss:// URL without credentials or a fragment`);
    }
    return url.href;
  });
};

export type TowerId = 1 | 2 | 3 | 4;
export interface TowerEndpoint { id: TowerId; urls: string[] }

export const getTowerEndpoints = (env: NodeJS.ProcessEnv = process.env): TowerEndpoint[] =>
  ([1, 2, 3, 4] as TowerId[]).map(id => {
    const key = `OCTACORE_${id}_URL`;
    const legacyKey = id === 1 ? 'OCTACORE_LEFT_URL' : id === 2 ? 'OCTACORE_RIGHT_URL' : undefined;
    const override = env[key] ?? (legacyKey ? env[legacyKey] : undefined);
    const urls = override === undefined
      ? [`ws://octacore-${id}.local:81`, ...(id <= 2 ? [`ws://octacore-${id === 1 ? 'left' : 'right'}.local:81`] : [])]
      : [override];
    return { id, urls: urls.map(address => {
      let url: URL;
      try { url = new URL(address); }
      catch { throw new Error(`${key} must be a ws:// or wss:// URL`); }
      if (!['ws:', 'wss:'].includes(url.protocol) || !url.hostname || url.username || url.password || url.hash) {
        throw new Error(`${key} must be a ws:// or wss:// URL without credentials or a fragment`);
      }
      return url.href;
    }) };
  });
