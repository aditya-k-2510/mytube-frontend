import { useState, useEffect } from 'react';
import { dashboardAPI, videoAPI } from '../utils/api';
import VideoCard from '../components/VideoCard';
import './Dashboard.css';

const CHUNK_SIZE = 5 * 1024 * 1024;

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadFormOpen, setUploadFormOpen] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
  });
  const [videoFile, setVideoFile] = useState(null);
  const [thumbnail, setThumbnail] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, videosRes] = await Promise.all([
        dashboardAPI.getChannelStats(),
        dashboardAPI.getChannelVideos({ page: 1 }),
      ]);
      setStats(statsRes.data.data[0]);
      setVideos(videosRes.data.data.videos);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setLoading(false);
    }
  };

  const handleUploadVideo = async (e) => {
    e.preventDefault();
    if (!videoFile || !thumbnail) {
      alert('Please select video and thumbnail');
      return;
    }

    setUploading(true);
    try {
      const initForm = new FormData();
      initForm.append('title', uploadData.title);
      initForm.append('description', uploadData.description);
      initForm.append('thumbnail', thumbnail);
      const initRes = await videoAPI.initUpload(initForm);
      const fileId = initRes.data.data;
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {

        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, videoFile.size);

        const chunk = videoFile.slice(start, end);

        const chunkForm = new FormData();
        chunkForm.append('chunkIndex', i);
        chunkForm.append('totalChunks', totalChunks);
        chunkForm.append('fileName', videoFile.name);
        chunkForm.append('chunk', chunk);
        await videoAPI.uploadChunk(chunkForm, fileId);
      }
      alert("Video uploaded successfully 🚀");
      setUploadFormOpen(false);
      setUploadData({ title: '', description: '' });
      setVideoFile(null);
      setThumbnail(null);
      fetchDashboardData();
    } catch (error) {
      console.error('Upload failed:', error);
      if(error.response?.status == 410) {
        alert("session expired....please restart");
        return;
      }
      alert(error.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleTogglePublish = async (videoId) => {
    try {
      await videoAPI.togglePublish(videoId);
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to toggle publish status:', error);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    if (!window.confirm('Are you sure you want to delete this video?')) return;
    
    try {
      await videoAPI.deleteVideo(videoId);
      fetchDashboardData();
    } catch (error) {
      console.error('Failed to delete video:', error);
    }
  };

  if (loading) return <div className="loading">Loading dashboard...</div>;

  return (
    <div className="dashboard-page">
      <h1>Channel Dashboard</h1>

      <div className="dashboard-stats">
        <div className="stat-card">
          <h3>Total Videos</h3>
          <p className="stat-number">{stats?.numberOfVideos || 0}</p>
        </div>
        <div className="stat-card">
          <h3>Total Subscribers</h3>
          <p className="stat-number">{stats?.numberOfSubs || 0}</p>
        </div>
      </div>

      <div className="dashboard-actions">
        <button 
          onClick={() => setUploadFormOpen(!uploadFormOpen)} 
          className="btn btn-primary"
        >
          {uploadFormOpen ? 'Cancel Upload' : 'Upload New Video'}
        </button>
      </div>

      {uploadFormOpen && (
        <form onSubmit={handleUploadVideo} className="upload-form">
          <h2>Upload Video</h2>
          
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={uploadData.title}
              onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={uploadData.description}
              onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>Video File</label>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideoFile(e.target.files[0])}
              required
            />
          </div>

          <div className="form-group">
            <label>Thumbnail</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnail(e.target.files[0])}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading...' : 'Upload Video'}
          </button>
        </form>
      )}

      <div className="dashboard-videos">
        <h2>Your Videos</h2>
        <div className="videos-list">
          {videos.map((video) => (
            <div key={video._id} className="dashboard-video-item">
              <img src={video.thumbnail} alt={video.title} className="video-thumb" />
              <div className="video-details">
                <h3>{video.title}</h3>
                <p>{video.description}</p>
                <span className={`status ${video.isPublished ? 'published' : 'draft'}`}>
                  {video.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
              <div className="video-actions">
                <button 
                  onClick={() => handleTogglePublish(video._id)}
                  className="btn btn-secondary btn-small"
                >
                  {video.isPublished ? 'Unpublish' : 'Publish'}
                </button>
                <button 
                  onClick={() => handleDeleteVideo(video._id)}
                  className="btn btn-danger btn-small"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
