import { useState, useEffect } from 'react';
import { likeAPI } from '../utils/api';
import VideoCard from '../components/VideoCard';

function LikedVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLikedVideos();
  }, []);

  const fetchLikedVideos = async () => {
    try {
      const { data } = await likeAPI.getLikedVideos({ page: 1 });
      setVideos(data.data.videos);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch liked videos:', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="liked-videos-page">
      <h1>Liked Videos</h1>
      {videos.length === 0 ? (
        <p>No liked videos</p>
      ) : (
        <div className="videos-grid">
          {videos.map((video) => (
            <VideoCard key={video._id} video={video} />
          ))}
        </div>
      )}
    </div>
  );
}

export default LikedVideos;
