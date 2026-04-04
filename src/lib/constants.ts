export const NEGATIVE_TAGS_MAX_LENGTH = 200;
export const GENERATION_TITLE_MAX_LENGTH = 80;
export const GENERATION_STYLE_MAX_LENGTH = 1000;
export const GENERATION_LYRICS_MAX_LENGTH = 5000;
export const STYLE_COLLECTION_NAME_MAX_LENGTH = 100;
export const STYLE_COLLECTION_DESCRIPTION_MAX_LENGTH = 500;
export const STYLE_COLLECTION_STYLE_MAX_LENGTH = 2000;
export const STYLE_COLLECTION_QUERY_MAX_LENGTH = 256;
export const ANNOTATION_COMMENT_MAX_LENGTH = 500;
export const LABEL_MAX_LENGTH = 128;
export const LABEL_QUERY_MAX_LENGTH = 128;
export const KIE_API_BASE = 'https://api.kie.ai/api/v1';
export const DEFAULT_KIE_CALLBACK_URL = 'https://api.example.com/callback';
export const MAX_UPLOAD_AUDIO_BYTES = 100 * 1024 * 1024;
export const POLLING_INTERVAL_MS = 5_000;
export const POLLING_MAX_ATTEMPTS = 120;
export const CREDITS_REFRESH_INTERVAL_MS = 60_000;
export const STEM_SEPARATION_TYPES = ['separate_vocal', 'split_stem'] as const;
export const FORWARDED_MEDIA_REQUEST_HEADERS = ['accept', 'range'] as const;
export const FORWARDED_MEDIA_RESPONSE_HEADERS = [
	'accept-ranges',
	'content-length',
	'content-range',
	'content-type',
	'etag',
	'last-modified'
] as const;
