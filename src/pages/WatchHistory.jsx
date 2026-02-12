import { useState, useEffect } from 'react';
import { userAPI } from '../utils/api';
import VideoCard from '../components/VideoCard';

function WatchHistory() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const { data } = await userAPI.getWatchHistory();
      setVideos(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading history...</div>;

  return (
    <div className="watch-history-page">
      <h1>Watch History</h1>
      {videos.length === 0 ? (
        <p>No videos in history</p>
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

export default WatchHistory;
