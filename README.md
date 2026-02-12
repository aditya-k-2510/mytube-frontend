# Video Platform Frontend

A simple React + Vite frontend for a YouTube-like video platform.

## Features

- 🎥 Video browsing and playback
- 👤 User authentication (login/register)
- 💬 Comments on videos
- 👍 Like videos, comments, and tweets
- 📺 Subscribe to channels
- 📝 Create and manage playlists
- 📊 User dashboard for content creators
- 🔍 Search videos
- 📜 Watch history
- 💖 Liked videos page

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend API running (default: http://localhost:8000)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Configure the API base URL:
   - The app is configured to proxy requests to `http://localhost:8000`
   - If your backend runs on a different port, update `vite.config.js`

3. Start the development server:
```bash
npm run dev
```

The app will run on `http://localhost:3000`

## Build for Production

```bash
npm run build
```

This creates an optimized build in the `dist/` folder.

## Project Structure

```
src/
├── components/         # Reusable components
│   ├── Navbar.jsx
│   └── VideoCard.jsx
├── context/           # React Context (Auth)
│   └── AuthContext.jsx
├── pages/             # Page components
│   ├── Home.jsx
│   ├── Login.jsx
│   ├── Register.jsx
│   ├── VideoDetail.jsx
│   ├── Channel.jsx
│   ├── Dashboard.jsx
│   ├── WatchHistory.jsx
│   ├── LikedVideos.jsx
│   ├── Subscriptions.jsx
│   ├── Playlists.jsx
│   └── PlaylistDetail.jsx
├── utils/             # Utilities
│   └── api.js         # API client
├── App.jsx            # Main app component
├── main.jsx           # Entry point
└── styles.css         # Global styles
```

## API Endpoints Used

### User
- POST `/api/v1/users/register` - Register new user
- POST `/api/v1/users/login` - Login
- POST `/api/v1/users/logout` - Logout
- GET `/api/v1/users/profile` - Get current user
- GET `/api/v1/users/c/:username` - Get channel profile
- GET `/api/v1/users/history` - Get watch history

### Videos
- GET `/api/v1/videos` - Get all videos (with filters)
- GET `/api/v1/videos/:videoId` - Get video details
- POST `/api/v1/videos` - Upload video
- PATCH `/api/v1/videos/:videoId` - Update video
- DELETE `/api/v1/videos/:videoId` - Delete video
- PATCH `/api/v1/videos/toggle/publish/:videoId` - Toggle publish status

### Comments
- GET `/api/v1/comments/:videoId` - Get video comments
- POST `/api/v1/comments/:videoId` - Add comment
- PATCH `/api/v1/comments/c/:commentId` - Update comment
- DELETE `/api/v1/comments/c/:commentId` - Delete comment

### Likes
- POST `/api/v1/likes/toggle/v/:videoId` - Toggle video like
- POST `/api/v1/likes/toggle/c/:commentId` - Toggle comment like
- GET `/api/v1/likes/videos` - Get liked videos

### Subscriptions
- POST `/api/v1/subscriptions/c/:channelId` - Toggle subscription
- GET `/api/v1/subscriptions/u/:subscriberId` - Get subscribed channels

### Playlists
- POST `/api/v1/playlists` - Create playlist
- GET `/api/v1/playlists/user/:userId` - Get user playlists
- GET `/api/v1/playlists/:playlistId` - Get playlist details
- PATCH `/api/v1/playlists/:playlistId` - Update playlist
- DELETE `/api/v1/playlists/:playlistId` - Delete playlist
- PATCH `/api/v1/playlists/add/:videoId/:playlistId` - Add video to playlist
- PATCH `/api/v1/playlists/remove/:videoId/:playlistId` - Remove video from playlist

### Dashboard
- GET `/api/v1/dashboard/stats` - Get channel stats
- GET `/api/v1/dashboard/videos` - Get channel videos

## Notes

- The app uses cookie-based authentication
- Access tokens are stored in localStorage
- File uploads use multipart/form-data
- All authenticated routes require the `verifyJWT` middleware on the backend

## Troubleshooting

### CORS Issues
Make sure your backend has CORS enabled and allows credentials:
```javascript
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
```

### API Connection
If you can't connect to the backend:
1. Check that the backend is running
2. Verify the proxy settings in `vite.config.js`
3. Check the browser console for errors

## License

MIT
