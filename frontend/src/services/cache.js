export function setCache(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getCache(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setCacheWithTTL(key, value, ttlMs) {
  const payload = { value, expiresAt: Date.now() + ttlMs };
  localStorage.setItem(key, JSON.stringify(payload));
}

export function getCacheWithTTL(key) {
  const raw = localStorage.getItem(key);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw);
    if (!payload?.expiresAt || Date.now() > payload.expiresAt) {
      localStorage.removeItem(key);
      return null;
    }
    return payload.value;
  } catch {
    return null;
  }
}