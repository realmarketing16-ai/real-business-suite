export function parseWebUrls(value?: string, fallback = 'http://localhost:3000') {
  const source = value?.trim() ? value : fallback;
  const urls = source
    .split(',')
    .map((url) => url.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return [...new Set(urls)];
}

export function primaryWebUrl(value?: string, fallback = 'http://localhost:3000') {
  return parseWebUrls(value, fallback)[0] ?? fallback;
}
