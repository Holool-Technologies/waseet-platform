import { environment } from '../../../environments/environment';

/**
 * Resolves any stored image/file URL to an absolute URL pointing
 * to the static file server.
 *
 * Handles all stored formats:
 *  - "http://localhost:5294/kyc-docs/x.png"  → unchanged
 *  - "/kyc-docs/x.png"                       → "http://localhost:5294/kyc-docs/x.png"
 *  - "/api/files/kyc-docs/x.png"             → "http://localhost:5294/kyc-docs/x.png"
 *  - "kyc-docs/x.png"                        → "http://localhost:5294/kyc-docs/x.png"
 */
export function resolveFileUrl(storedUrl: string): string {
  if (!storedUrl) return '';

  if (storedUrl.startsWith('http://') || storedUrl.startsWith('https://'))
    return storedUrl;

  const staticBase = environment.apiUrl.replace(/\/api$/, '');
  const stripped   = storedUrl
    .replace(/^\/api\/files\//, '')
    .replace(/^\//, '');

  return `${staticBase}/${stripped}`;
}