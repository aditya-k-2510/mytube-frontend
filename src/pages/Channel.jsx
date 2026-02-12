import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { userAPI, videoAPI, subscriptionAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';
import './Channel.css';

function Channel() {
  const { username } = useParams();
  const { user } = useAuth();
  const [channel, setChannel] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChannelData();
  }, [username]);

  const fetchChannelData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get channel profile
      const channelRes = await userAPI.getChannelProfile(username);
      const channelData = channelRes.data.data;
      setChannel(channelData);
      
      // Get channel's videos using the channel ID
      const videosRes = await videoAPI.getAllVideos({ 
        userId: channelData._id,
        page: 1,
        limit: 20
      });
      setVideos(videosRes.data.data.videos);
      
    } catch (error) {
      console.error('Failed to fetch channel:', error);
      setError(error.response?.data?.message || 'Failed to load channel');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    if (!user) {
      alert('Please login to subscribe');
      return;
    }
    
    try {
      await subscriptionAPI.toggleSubscription(channel._id);
      // Refresh channel data to update subscriber count
      fetchChannelData();
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
      alert(error.response?.data?.message || 'Failed to update subscription');
    }
  };

  if (loading) return <div className="loading">Loading channel...</div>;
  if (error) return <div className="error-message">{error}</div>;
  if (!channel) return <div className="error-message">Channel not found</div>;

  return (
    <div className="channel-page">
      <div className="channel-header">
        {channel.coverImage && (
          <img src={channel.coverImage} alt="Cover" className="cover-image" />
        )}
        <div className="channel-info-container">
          <div className="channel-profile">
            <img 
              src={channel.avatar} 
              alt={channel.username} 
              className="channel-avatar-large" 
            />
            <div className="channel-details">
              <h1>{channel.fullName}</h1>
              <p className="channel-username">@{channel.username}</p>
              <p className="channel-stats">
                <span>{channel.subscriberCount} subscribers</span>
                <span> • </span>
                <span>{videos.length} videos</span>
              </p>
            </div>
          </div>
          
          {user && user._id !== channel._id && (
            <button 
              onClick={handleSubscribe} 
              className={`btn ${channel.isSubscribed ? 'btn-secondary' : 'btn-primary'}`}
            >
              {channel.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
            </button>
          )}
        </div>
      </div>
      
      <div className="channel-videos-section">
        <h2>Videos</h2>
        {videos.length === 0 ? (
          <p className="no-videos">This channel hasn't uploaded any videos yet.</p>
        ) : (
          <div className="videos-grid">
            {videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Channel;
