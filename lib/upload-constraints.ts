// Shared client-side upload constraints
// Reads from NEXT_PUBLIC_MAX_UPLOAD_MB when provided, defaults to 10MB
export const MAX_UPLOAD_MB = Number(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || '10');
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
export const ALLOWED_MIME = ['image/png', 'image/jpeg'];

