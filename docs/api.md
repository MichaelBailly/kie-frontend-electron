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

Get generation details with audio tracks.

#### DELETE /api/generations/{id}

Delete a generation.

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

#### GET /api/sse/generations/{taskId}

Stream status updates for a generation task.

```
event: status
data: {"status": "PENDING"}

event: status
data: {"status": "SUCCESS", "tracks": [...]}
```

---

## Status Codes

### Generation Status

| Status                  | Description              |
| ----------------------- | ------------------------ |
| `PENDING`               | Task queued              |
| `TEXT_SUCCESS`          | Lyrics processed         |
| `FIRST_SUCCESS`         | First track ready        |
| `SUCCESS`               | All tracks complete      |
| `CREATE_TASK_FAILED`    | Failed to create task    |
| `GENERATE_AUDIO_FAILED` | Audio generation failed  |
| `SENSITIVE_WORD_ERROR`  | Content policy violation |

### Stem Separation Status

| Status                  | Description       |
| ----------------------- | ----------------- |
| `PENDING`               | Processing        |
| `SUCCESS`               | Stems available   |
| `CREATE_TASK_FAILED`    | Failed            |
| `GENERATE_AUDIO_FAILED` | Processing failed |

## See Also

- [Architecture](architecture.md) - System overview
- [Development](development.md) - Setup and workflow
