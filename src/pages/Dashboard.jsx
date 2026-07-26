import { useState, useEffect, useRef } from 'react';
import { dashboardAPI, videoAPI } from '../utils/api';
import VideoCard from '../components/VideoCard';
import './Dashboard.css';

const CHUNK_SIZE = 1024 * 1024;

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
  const [uploadProgress, setUploadProgress] = useState(0);
  const uploadedChunks = useRef(0);

  // useEffect(() => {
  //   let pending = JSON.parse(localStorage.getItem("pendingUpload") || "{}");
  //   if (pending.createdAt) {
  //     const twoMinutes = 5 * 60 * 1000;
  //     if (Date.now() - pending.createdAt > twoMinutes) {
  //       localStorage.removeItem("pendingUpload");
  //     }
  //   }
  // }, []);
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

  const uploadWithRetry = async (chunkForm, fileId, chunkIndex) => {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await videoAPI.uploadChunk(chunkForm, fileId, chunkIndex);
      } catch (err) {
        if (attempt === 3) throw err; // all retries exhausted, bubble up
        console.log(`retrying chunk ${chunkIndex}`)
        await new Promise(r => setTimeout(r, 1000 * attempt)); // 1s, 2s, 3s backoff
      }
    }
  }

  const handleUploadVideo = async (e) => {
    e.preventDefault();
    uploadedChunks.current = 0;
    setUploadProgress(0);
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
      let uploadedChunksList = [];
      let fileId;
      let pending = JSON.parse(localStorage.getItem("pendingUpload")||"{}");
      const hasPending = Object.keys(pending).length !== 0;
      if (hasPending && 
          pending.title == uploadData.title && 
          pending.description == uploadData.description && 
          thumbnail.name==pending.thumbnailName && 
          videoFile.name == pending.videoFileName) {

        fileId = pending.fileId;
        const { data } = await videoAPI.getUploadStatus(fileId)
        uploadedChunksList = data.data
        console.log(uploadedChunksList)
      }
      else {
        const initRes = await videoAPI.initUpload(initForm);
        fileId = initRes.data.data;
        pending = {
              fileId,
              thumbnailName: thumbnail.name,
              videoFileName: videoFile.name,
              title: uploadData.title,
              description: uploadData.description,
              createdAt: Date.now()
        };
        localStorage.setItem("pendingUpload", JSON.stringify(pending))
      }
      const totalChunks = Math.ceil(videoFile.size / CHUNK_SIZE);
      const BATCH_SIZE = 5;
      uploadedChunks.current = Math.max(Math.floor(uploadedChunksList.length/BATCH_SIZE)-1, 0)*BATCH_SIZE;
      let currentChunkIndex = uploadedChunks.current;
      while(currentChunkIndex<totalChunks) {
        const chunkPromises = [];
        for (let i = 0; i < BATCH_SIZE && currentChunkIndex<totalChunks; i++) {
            const start = currentChunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, videoFile.size);
            const chunk = videoFile.slice(start, end);
            const chunkForm = new FormData();
            chunkForm.append('chunk', chunk);
            const promise = uploadWithRetry(chunkForm, fileId, currentChunkIndex).then(() => {
              uploadedChunks.current++;
              const progress = Math.round((uploadedChunks.current/totalChunks)*100);
              setUploadProgress(progress);
            });
            chunkPromises.push(promise);
            currentChunkIndex++;
        }
        await Promise.all(chunkPromises);
      }
      console.log("ok");
      await videoAPI.finishVideoUpload({
        totalChunks,
        fileName: videoFile.name
      }, fileId);
      alert("video added for processing");
      localStorage.removeItem("pendingUpload")
      setUploadFormOpen(false);
      setUploadProgress(0);
      setUploadData({ title: '', description: '' });
      setVideoFile(null);
      setThumbnail(null);
      fetchDashboardData();
    } catch (error) {
      console.error('Upload failed:', error);
      if(error.response?.status == 410) {
        localStorage.removeItem("pendingUpload")
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
          onClick={() => {
            if (!uploadFormOpen) {
            const pending = JSON.parse(localStorage.getItem("pendingUpload"));
            if (pending) {
                setUploadData({
                    title: pending.title || "",
                    description: pending.description || ""
                });
              }
            }
            setUploadFormOpen(!uploadFormOpen)
          }
        } 
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
          {uploading && (
          <div className="upload-progress">
            <div className="progress-bar-container">
              <div
                className="progress-bar"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p>{uploadProgress}% uploaded</p>
          </div>
          )}
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