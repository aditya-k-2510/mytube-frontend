# MyTube Frontend

A React client for MyTube — a YouTube-style video platform. This is the **frontend-only** repository: it renders the UI, drives resumable chunked uploads, and plays back adaptive-bitrate video, but holds no server logic of its own. It talks exclusively over REST to a separately-deployed backend API; see that repo's README for everything about the Express server, MongoDB, Redis, FFmpeg transcoding, and the API contract itself.

## Chunked Upload UX

The upload form lives in [Dashboard.jsx](src/pages/Dashboard.jsx) (`handleUploadVideo`). From the user's point of view:

1. **Select files.** The user opens "Upload New Video," fills in title/description, picks a video file, and optionally a thumbnail. If no thumbnail is picked, the field is simply left `null` — the backend generates one from the video instead, so the UI never blocks submission on it.

2. **Upload starts, progress bar appears.** On submit, the file is sliced client-side into 1MB chunks (`CHUNK_SIZE = 1024 * 1024`) and uploaded **5 at a time in parallel** (`BATCH_SIZE = 5`) via `videoAPI.uploadChunk`. Each chunk upload goes through `uploadWithRetry`, which retries up to 3 attempts with a linear backoff (1s, 2s, 3s) before giving up and surfacing the error. As each chunk resolves, `uploadedChunks.current` increments and `uploadProgress` (percentage, shown in the progress bar) updates.

3. **User navigates away mid-upload.** Before the first chunk is sent, the form writes a `pendingUpload` object to `localStorage`: `{ fileId, thumbnailName, videoFileName, title, description, createdAt }`. If the browser tab is closed or the page is refreshed mid-upload, this survives — the in-memory `uploadedChunks` ref does not, but the chunks already accepted by the backend do (they're on disk server-side).

4. **User comes back and reopens the upload form.** The form pre-fills `title`/`description` from `pendingUpload` if present. On the next submit, the code decides **resume vs. restart from scratch** by comparing the new attempt against the stored session on four fields: `title`, `description`, the video file's `name`, and — deliberately strict — the thumbnail's `name` (both must be `null`, or both must match exactly; a different thumbnail file, even for the same video, invalidates the match). If all four match, it reuses the stored `fileId` and calls `getUploadStatus` to fetch which chunk indices the backend already has, then resumes from there instead of re-uploading everything. If anything differs, it starts a brand-new `init-upload` session.

5. **Finishing up.** Once every chunk has been sent, `finishVideoUpload` is called with the total chunk count and filename, `pendingUpload` is cleared from `localStorage`, and the user sees an "video added for processing" confirmation. If the backend responds `410` (the upload session expired server-side, e.g. Redis TTL lapsed or the server restarted), the stale `pendingUpload` entry is cleared and the user is told to restart — there's no partial-resume path across an expired session.

Processing is asynchronous on the backend, so the frontend doesn't wait for transcoding — see [VideoDetail.jsx](src/pages/VideoDetail.jsx), which shows a "Video is still processing, please check back soon" message until `processingStatus` flips to `"ready"`.

## Adaptive Video Player

All playback logic lives in [VideoDetail.jsx](src/pages/VideoDetail.jsx), in the `useEffect` keyed on `streamUrls` (populated once `fetchStreamUrls` resolves, which itself only fires once `fetchVideoData` reports `processingStatus === 'ready'`).

**Source selection fallback chain**, checked in order:

1. **hls.js**, when `streamUrls.hls` (the backend's HLS master manifest URL) is present and `Hls.isSupported()` returns true. An `Hls` instance is created and stored in `hlsRef`, `hls.loadSource(streamUrls.hls)` and `hls.attachMedia(videoElement)` wire it to the `<video>` element.
2. **Native Safari HLS**, when hls.js isn't supported but the browser can play `application/vnd.apple.mpegurl` natively (`videoElement.canPlayType(...)`) — the manifest URL is set directly as `videoElement.src`.
3. **Direct MP4 fallback**, when neither of the above applies — `videoElement.src` is set to `streamUrls.qualities?.['720p'] || streamUrls.fallback`.

**Automatic + manual quality control.** With the hls.js path active, `Hls.Events.MANIFEST_PARSED` confirms the available renditions (`hls.levels`), and `Hls.Events.LEVEL_SWITCHED` fires whenever hls.js's adaptive bitrate logic switches renditions based on measured bandwidth. On top of that automatic switching, the player exposes an **Auto / 360p / 720p / 1080p quality selector** in the player UI — picking a specific resolution sets `hls.currentLevel` to that rendition's index (pinning playback to it), while "Auto" resets control back to hls.js's own ABR algorithm (`hls.currentLevel = -1`).

**Error handling — two distinct layers, deliberately separate:**

- **HLS-specific, non-fatal-vs-fatal.** `hls.on(Hls.Events.ERROR, (event, data) => ...)` inspects `data.fatal`. Only fatal errors act — the code destroys the `Hls` instance (`hls.destroy()`), clears `hlsRef.current`, and falls back to setting `videoElement.src` directly to the 720p (or generic fallback) MP4 URL. Non-fatal HLS errors (a dropped segment, a recoverable network blip) are logged but don't interrupt playback — hls.js handles those internally.
- **General `<video>` element errors.** The `<video>` tag's own `onError` handler (unrelated to hls.js, catches things like a broken direct-MP4 URL or a codec the browser can't decode at all) sets `videoLoadError` to `true`, which swaps the player out for a plain "This video is temporarily unavailable. Please try again later." message — no attempt to retry or fall back further, since by this point there's nothing left to fall back to.

These are separate because they're different failure domains: an HLS fatal error still has a fallback (direct MP4) worth trying, but a `<video>` element error means even the fallback source failed, so the only sane UI response is to stop pretending a player will work and tell the user plainly.

**Cleanup.** The effect's return function destroys the `Hls` instance on unmount or whenever `streamUrls` changes (e.g., navigating between videos), preventing orphaned HLS instances from continuing to buffer in the background.

**Watch progress**, unrelated to playback mechanics but tracked from the same page: `onTimeUpdate`/`onLoadedMetadata` keep `lastWatchTime`/`lastVideoDuration` refs current, and two separate mechanisms flush that data to the backend — a `visibilitychange` listener firing `navigator.sendBeacon` when the tab is hidden, and the same beacon call on component unmount — both hitting `POST /videos/watch-progress/:videoId`, chosen over a normal `fetch`/`axios` call because `sendBeacon` is designed to reliably complete even as the page is being torn down.

## Key Pages & Components

```
src/
├── App.jsx                    # Router setup, route definitions, ProtectedRoute wrapper for auth-gated pages
├── main.jsx                   # React root render entrypoint
├── context/
│   ├── AuthContext.jsx        # Auth state (user, loading), login/register/logout, checkAuth() as source of truth
│   └── ThemeContext.jsx       # Light/dark theme, persisted to localStorage, respects prefers-color-scheme
├── components/
│   ├── Navbar.jsx             # Top nav — auth-aware links, theme toggle, user menu/logout
│   └── VideoCard.jsx          # Video grid tile — thumbnail, duration, views, channel, like count
├── pages/
│   ├── Home.jsx                # Video feed — search, pagination, requires auth to fetch listings
│   ├── VideoDetail.jsx         # Playback (hls.js), comments, likes, subscribe, watch-progress tracking
│   ├── Dashboard.jsx           # Channel owner view — stats, chunked upload form, publish toggle, delete
│   ├── Channel.jsx             # Public channel profile — subscriber count, that channel's videos
│   ├── Login.jsx / Register.jsx # Auth forms
│   ├── WatchHistory.jsx        # User's watch history video grid
│   ├── LikedVideos.jsx         # User's liked videos grid
│   ├── Subscriptions.jsx       # Channels the user is subscribed to
│   ├── Playlists.jsx           # User's playlists, create-playlist form
│   └── PlaylistDetail.jsx      # Single playlist's video list
└── utils/
    └── api.js                  # Axios instance + per-resource API modules (userAPI, videoAPI, commentAPI, ...), 401 refresh-and-retry interceptor
```

## Setup

### Prerequisites

- Node.js 18+
- A running instance of the [MyTube backend API](../mytube-backend) (or wherever that repo is hosted) — this frontend has nothing to render without it.

### API base URL

There's currently no `.env` file or `import.meta.env` variable for this — [api.js](src/utils/api.js) hardcodes `API_BASE_URL = '/api/v1'` as a relative path, and [vite.config.js](vite.config.js) proxies `/api` to `http://localhost:3000` in dev (`server.proxy`). To point at a different backend:
- **Dev:** change the `target` in `vite.config.js`'s proxy config.
- **Prod build:** the relative `/api/v1` path assumes the built frontend is served from the same origin as the API (e.g., behind the same reverse proxy). Pointing at a different origin would require changing `API_BASE_URL` in `api.js` to an absolute URL and configuring CORS on the backend accordingly.

### Install & run

```bash
npm install
npm run dev       # vite dev server on http://localhost:5173
```

```bash
npm run build      # production build
npm run preview    # preview the production build locally
```

## Design Decisions

**Why `localStorage` for resumable upload tracking?** The upload can span minutes for a large file, during which a tab close, refresh, or crash is entirely plausible. `localStorage` survives all of those (unlike component state or a ref), so `pendingUpload` can be read back on the next visit to decide whether to resume. It's deliberately compared on four fields — title, description, video filename, and thumbnail filename — rather than trusting a bare `fileId`, because a stale or mismatched `fileId` from a different upload attempt resuming against the wrong session would silently merge chunks from two unrelated uploads.

**Why a manual quality selector in addition to automatic ABR?** hls.js's automatic switching optimizes for smooth playback under changing network conditions, but it isn't always what a viewer wants — someone on an unmetered connection who prefers guaranteed 1080p, or someone deliberately capping bandwidth usage, has no way to express that preference to an algorithm reacting to throughput alone. Exposing `hls.currentLevel` directly as Auto/360p/720p/1080p buttons gives the viewer an escape hatch without having to disable ABR entirely — "Auto" just hands control back.

**Why separate error handling for HLS-specific failures vs. general video element failures?** They represent different points of failure with different recoverable actions available. An HLS fatal error (a manifest fetch failure, a fatal media error hls.js can't recover from) still has a fallback worth attempting — the flat MP4 files the backend also produces — so that handler actively swaps the source and keeps the player alive. A general `<video>` element error fires *after* a source (HLS or the MP4 fallback) has already been set and failed to play, meaning there's no further fallback left to try — at that point the only honest UI response is the "video unavailable" message, not a silent retry loop against a source that's already failed.
