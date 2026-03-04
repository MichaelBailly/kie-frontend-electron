export const KIE_API_KEY = process.env.KIE_API_KEY ?? '';
// Callback URL is optional in current polling-first architecture; keep a safe default for API compatibility.
export const KIE_CALLBACK_URL = process.env.KIE_CALLBACK_URL ?? 'https://api.example.com/callback';
