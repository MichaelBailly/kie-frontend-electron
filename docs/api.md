# API Reference

This document covers the KIE.ai API integration and internal SvelteKit endpoints.

## KIE.ai API

The application integrates with the [KIE.ai REST API](https://api.kie.ai). All external calls are made server-side through `src/lib/kie-api.server.ts`.

### Authentication

API key is read in order:

1. Settings database (`settings` table, key `kie_api_key`)
2. Environment variable `KIE_API_KEY`

### Music Generation

#### Generate Music

```typescript
POST https://api.kie.ai/api/v1/generate

{
  prompt: string;        // Lyrics or description
  style: string;         // Musical style tags
  title: string;         // Track title
  customMode: boolean;   // Custom vs simple mode
  instrumental: boolean; // No vocals
  model: 'V4' | 'V4_5' | 'V4_5PLUS' | 'V4_5ALL' | 'V5';
  callBackUrl: string;   // Webhook URL (optional)
  negativeTags?: string; // Styles to avoid
}

Response: { code: number, msg: string, data: { taskId: string } }
```

#### Extend Music

```typescript
POST https://api.kie.ai/api/v1/generate/extend

{
  defaultParamFlag: boolean;
  audioId: string;       // ID of track to extend
  prompt: string;
  style: string;
  title: string;
  continueAt: number;    // Timestamp in seconds
  model: string;
  callBackUrl: string;
}
```

#### Get Generation Status

```typescript
GET https://api.kie.ai/api/v1/generate/record-info?taskId={taskId}

Response: {
  data: {
    taskId: string;
    status: 'PENDING' | 'TEXT_SUCCESS' | 'FIRST_SUCCESS' | 'SUCCESS' | 'CREATE_TASK_FAILED' | 'GENERATE_AUDIO_FAILED';
    response: {
      sunoData: [{
        id: string;
        audioUrl: string;
        imageUrl: string;
        title: string;
        tags: string;
        duration: number;
      }]
    }
  }
}
```

### Stem Separation

#### Separate Vocals/Stems

```typescript
POST https://api.kie.ai/api/v1/vocal-removal/generate

{
  taskId: string;
  audioId: string;
  type: 'separate_vocal' | 'split_stem';
  callBackUrl: string;
}
```

#### Get Separation Status

```typescript
GET https://api.kie.ai/api/v1/vocal-removal/record-info?taskId={taskId}

Response: {
  data: {
    successFlag: 'PENDING' | 'SUCCESS' | 'CREATE_TASK_FAILED';
    response: {
      vocalUrl: string | null;
      instrumentalUrl: string | null;
      drumsUrl: string | null;
      bassUrl: string | null;
      guitarUrl: string | null;
      pianoUrl: string | null;
      // ... more stems
    }
  }
}
```

---

## Internal API Endpoints

SvelteKit API routes for the frontend.

### Settings

#### GET /api/settings

Returns API key status.

```json
{
	"hasApiKey": true,
	"maskedApiKey": "sk-...abc"
}
```

#### PUT /api/settings

Save or clear API key.

```json
// Save
{ "apiKey": "sk-your-key-here" }

// Clear
{ "apiKey": "" }
```

#### POST /api/settings/validate

Validate an API key against KIE API.

```json
{ "apiKey": "sk-your-key-here" }

// Response
{ "valid": true }
```

### Projects

#### GET /api/projects

List all projects with metadata.

#### POST /api/projects

Create a new project.

```json
{ "name": "My Project", "description": "Optional description" }
```

#### PUT /api/projects/{id}

Update project details.

#### DELETE /api/projects/{id}

Delete a project and associated data.

### Generations

#### POST /api/generations

Start a new generation.

```json
{
	"projectId": 1,
	"prompt": "A peaceful morning melody",
	"style": "ambient, piano",
	"title": "Morning Light",
	"model": "V5",
	"instrumental": false
}
```

#### GET /api/generations/{id}

Get generation details.

#### DELETE /api/generations/{id}

Delete a generation.

#### POST /api/generations/extend

Extend an existing generated track.

```json
{
	"projectId": 1,
	"title": "Morning Light Extended",
	"style": "ambient, piano",
	"lyrics": "...",
	"extendsGenerationId": 3,
	"extendsAudioId": "audio-uuid",
	"continueAt": 60
}
```

#### GET /api/generations/{id}/annotations?audioId={audioId}

Get annotation (starred, comment, labels) for a specific audio track.

#### PATCH /api/generations/{id}/annotations

Update annotation for a specific audio track.

```json
// Toggle star
{ "audioId": "audio-uuid", "action": "toggle_star" }

// Set labels
{ "audioId": "audio-uuid", "action": "set_labels", "labels": ["chill", "demo"] }

// Update comment
{ "audioId": "audio-uuid", "comment": "maybe use this one" }
```

### Stem Separation

### Labels

#### GET /api/labels?query={q}&limit={n}

Return autocomplete label suggestions matching the query (ordered by recency).

```json
{ "suggestions": ["chill", "chorus", "cinematic"] }
```

### Import

#### POST /api/import

Import an existing generation from a known KIE task ID into a project.

```json
{
	"taskId": "abc123",
	"projectId": 1
}
```

### Stem Separation

#### POST /api/stem-separation

Start stem separation on a track.

```json
{
	"generationId": 1,
	"audioId": "audio-uuid",
	"type": "split_stem"
}
```

### Server-Sent Events

#### GET /api/sse

Global SSE stream. All generation, stem-separation, and annotation updates for all tasks are broadcast to every connected client. Connect once on app load and react to typed events.

```
// Initial handshake
data: {"type": "connected", "clientId": "uuid"}

// Generation progress / completion
data: {"type": "generation_update", "generationId": 3, "data": {...}}
data: {"type": "generation_complete", "generationId": 3, "data": {...}}
data: {"type": "generation_error", "generationId": 3, "data": {...}}

// Stem separation progress / completion
data: {"type": "stem_separation_update", "stemSeparationId": 1, "generationId": 3, "audioId": "uuid", "data": {...}}
data: {"type": "stem_separation_complete", ...}
data: {"type": "stem_separation_error", ...}

// Annotation change (star, comment, labels)
data: {"type": "annotation_update", "generationId": 3, "audioId": "uuid", "data": {...}}
```

---

## Status Codes

### Internal Generation Status (stored in SQLite)

| Status          | Description                |
| --------------- | -------------------------- |
| `pending`       | Task queued                |
| `processing`    | KIE task created           |
| `text_success`  | Lyrics processed           |
| `first_success` | First track ready          |
| `success`       | All tracks complete        |
| `error`         | Failed (see error_message) |

### KIE API Generation Status (returned by KIE API)

| Status                  | Description              |
| ----------------------- | ------------------------ |
| `PENDING`               | Task queued              |
| `TEXT_SUCCESS`          | Lyrics processed         |
| `FIRST_SUCCESS`         | First track ready        |
| `SUCCESS`               | All tracks complete      |
| `CREATE_TASK_FAILED`    | Failed to create task    |
| `GENERATE_AUDIO_FAILED` | Audio generation failed  |
| `SENSITIVE_WORD_ERROR`  | Content policy violation |

### KIE API Stem Separation Status

| Status                  | Description       |
| ----------------------- | ----------------- |
| `PENDING`               | Processing        |
| `SUCCESS`               | Stems available   |
| `CREATE_TASK_FAILED`    | Failed            |
| `GENERATE_AUDIO_FAILED` | Processing failed |

## See Also

- [Architecture](architecture.md) - System overview
- [Development](development.md) - Setup and workflow
