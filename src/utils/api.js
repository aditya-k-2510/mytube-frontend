import axios from 'axios';
const API_BASE_URL = '/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important: This sends cookies with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Handle token refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Don't retry on certain endpoints
    const noRetryEndpoints = ['/users/profile', '/users/refresh', '/users/login', '/users/register'];
    const isNoRetryEndpoint = noRetryEndpoints.some(endpoint => 
      originalRequest.url?.includes(endpoint)
    );
    
    if (error.response?.status === 401 && !originalRequest._retry && !isNoRetryEndpoint) {
      originalRequest._retry = true;
      try {
        // Refresh token is automatically sent via cookies
        await axios.post(`${API_BASE_URL}/users/refresh`, {}, {
          withCredentials: true
        });
        // Retry the original request
        return api(originalRequest);
      } catch (refreshError) {
        // Only clear and redirect if refresh also fails
        if (refreshError.response?.status === 401) {
          // Don't redirect if already on login/register page
          if (!window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/register')) {
            window.location.href = '/login';
          }
        }
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// User APIs
export const userAPI = {
  register: (formData) => api.post('/users/register', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  login: (credentials) => api.post('/users/login', credentials),
  logout: () => api.post('/users/logout'),
  getCurrentUser: () => api.get('/users/profile'),
  updateDetails: (data) => api.patch('/users/update-details', data),
  updateAvatar: (formData) => api.patch('/users/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  updateCoverImage: (formData) => api.patch('/users/coverimage', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getChannelProfile: (username) => api.get(`/users/c/${username}`),
  getWatchHistory: () => api.get('/users/history'),
  changePassword: (data) => api.post('/users/change-password', data),
};

// Video APIs
export const videoAPI = {
  getAllVideos: (params) => api.get('/videos', { params }),
  getVideoById: (videoId) => api.get(`/videos/${videoId}`),
  initUpload: (formData) => api.post('/videos/init-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadChunk: (formData, fileId, chunkIndex) => api.put(`/videos/chunk-upload/${fileId}/${chunkIndex}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),

  getUploadStatus: (fileId) => api.get(`/videos/upload-status/${fileId}`),

  finishVideoUpload: (data, fileId) => api.post(`videos/finish-upload/${fileId}`, data),
  uploadWatchProgress: (data, videoId) => api.post(`videos/watch-progress/${videoId}`, data),
  updateVideo: (videoId, formData) => api.patch(`/videos/${videoId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  deleteVideo: (videoId) => api.delete(`/videos/${videoId}`),
  togglePublish: (videoId) => api.patch(`/videos/toggle/publish/${videoId}`),
};

// Comment APIs
export const commentAPI = {
  getVideoComments: (videoId, params) => api.get(`/comments/${videoId}`, { params }),
  addComment: (videoId, content) => api.post(`/comments/${videoId}`, { content }),
  updateComment: (commentId, content) => api.patch(`/comments/c/${commentId}`, { content }),
  deleteComment: (commentId) => api.delete(`/comments/c/${commentId}`),
};

// Like APIs
export const likeAPI = {
  toggleVideoLike: (videoId) => api.post(`/likes/toggle/v/${videoId}`),
  toggleCommentLike: (commentId) => api.post(`/likes/toggle/c/${commentId}`),
  toggleTweetLike: (tweetId) => api.post(`/likes/toggle/t/${tweetId}`),
  getLikedVideos: (params) => api.get('/likes/videos', { params }),
};

// Subscription APIs
export const subscriptionAPI = {
  toggleSubscription: (channelId) => api.post(`/subscription/c/${channelId}`),
  getChannelSubscribers: (channelId) => api.get(`/subscription/c/${channelId}`),
  getSubscribedChannels: (subscriberId) => api.get(`/subscription/u/${subscriberId}`),
};

// Playlist APIs
export const playlistAPI = {
  createPlaylist: (data) => api.post('/playlist', data),
  getUserPlaylists: (userId) => api.get(`/playlist/user/${userId}`),
  getPlaylistById: (playlistId) => api.get(`/playlist/${playlistId}`),
  updatePlaylist: (playlistId, data) => api.patch(`/playlist/${playlistId}`, data),
  deletePlaylist: (playlistId) => api.delete(`/playlist/${playlistId}`),
  addVideoToPlaylist: (videoId, playlistId) => api.patch(`/playlist/add/${videoId}/${playlistId}`),
  removeVideoFromPlaylist: (videoId, playlistId) => api.patch(`/playlist/remove/${videoId}/${playlistId}`),
};

// Tweet APIs
export const tweetAPI = {
  createTweet: (content) => api.post('/tweets', { content }),
  getUserTweets: (userId, params) => api.get(`/tweets/users/${userId}`, { params }),
  updateTweet: (tweetId, content) => api.patch(`/tweets/${tweetId}`, { content }),
  deleteTweet: (tweetId) => api.delete(`/tweets/${tweetId}`),
};

// Dashboard APIs
export const dashboardAPI = {
  getChannelStats: () => api.get('/dashboard/stats'),
  getChannelVideos: (params) => api.get('/dashboard/videos', { params }),
};

export default api;
