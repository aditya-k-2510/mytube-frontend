import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { playlistAPI } from '../utils/api';
import VideoCard from '../components/VideoCard';

function PlaylistDetail() {
  const { playlistId } = useParams();
  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlaylist();
  }, [playlistId]);

  const fetchPlaylist = async () => {
    try {
      const { data } = await playlistAPI.getPlaylistById(playlistId);
      setPlaylist(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch playlist:', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading playlist...</div>;
  if (!playlist) return <div>Playlist not found</div>;

  return (
    <div className="playlist-detail-page">
      <div className="playlist-header">
        <h1>{playlist.name}</h1>
        <p>{playlist.description}</p>
        <span>{playlist.videos.length} videos</span>
      </div>

      <div className="playlist-videos">
        {playlist.videos.length === 0 ? (
          <p>No videos in this playlist</p>
        ) : (
          <div className="videos-grid">
            {playlist.videos.map((video) => (
              <VideoCard key={video._id} video={video} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default PlaylistDetail;
