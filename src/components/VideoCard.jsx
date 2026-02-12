import { Link } from 'react-router-dom';
import './VideoCard.css';

function VideoCard({ video }) {
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatViews = (views) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views;
  };

  return (
    <div className="video-card">
      <Link to={`/video/${video._id}`} className="video-thumbnail-link">
        <div className="video-thumbnail">
          <img src={video.thumbnail} alt={video.title} />
          {video.duration && (
            <span className="video-duration">{formatDuration(video.duration)}</span>
          )}
        </div>
      </Link>
      
      <div className="video-info">
        <Link to={`/channel/${video.channelName || video.owner?.username}`} className="channel-avatar">
          <img 
            src={video.channelAvatar || video.owner?.avatar || '/default-avatar.png'} 
            alt="Channel" 
          />
        </Link>
        
        <div className="video-details">
          <Link to={`/video/${video._id}`} className="video-title">
            {video.title}
          </Link>
          <Link to={`/channel/${video.channelName || video.owner?.username}`} className="channel-name">
            {video.channelName || video.owner?.username || video.ownerName}
          </Link>
          <div className="video-meta">
            <span>{formatViews(video.views)} views</span>
            {video.numberOfLikes !== undefined && (
              <span>• {video.numberOfLikes} likes</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default VideoCard;
