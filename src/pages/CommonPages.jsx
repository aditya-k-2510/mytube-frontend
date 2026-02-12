import { useState, useEffect } from 'react';
import { likeAPI } from '../utils/api';
import VideoCard from '../components/VideoCard';

export function LikedVideos() {
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

// Subscriptions.jsx
import { Link } from 'react-router-dom';
import { subscriptionAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

export function Subscriptions() {
  const { user } = useAuth();
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchSubscriptions();
  }, [user]);

  const fetchSubscriptions = async () => {
    try {
      const { data } = await subscriptionAPI.getSubscribedChannels(user._id);
      setChannels(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      setLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="subscriptions-page">
      <h1>Subscriptions</h1>
      {channels.length === 0 ? (
        <p>Not subscribed to any channels</p>
      ) : (
        <div className="channels-grid">
          {channels.map((channel) => (
            <Link key={channel._id} to={`/channel/${channel.username}`} className="channel-card">
              <img src={channel.avatar} alt={channel.username} />
              <div>
                <h3>{channel.fullName}</h3>
                <p>@{channel.username}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// Playlists.jsx
import { playlistAPI } from '../utils/api';

export function Playlists() {
  const { user } = useAuth();
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylist, setNewPlaylist] = useState({ name: '', description: '' });

  useEffect(() => {
    if (user) fetchPlaylists();
  }, [user]);

  const fetchPlaylists = async () => {
    try {
      const { data } = await playlistAPI.getUserPlaylists(user._id);
      setPlaylists(data.data);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch playlists:', error);
      setLoading(false);
    }
  };

  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    try {
      await playlistAPI.createPlaylist(newPlaylist);
      setNewPlaylist({ name: '', description: '' });
      setShowCreateForm(false);
      fetchPlaylists();
    } catch (error) {
      console.error('Failed to create playlist:', error);
      alert(error.response?.data?.message || 'Failed to create playlist');
    }
  };

  if (loading) return <div className="loading">Loading...</div>;

  return (
    <div className="playlists-page">
      <h1>Your Playlists</h1>
      
      <button onClick={() => setShowCreateForm(!showCreateForm)} className="btn btn-primary">
        {showCreateForm ? 'Cancel' : 'Create Playlist'}
      </button>

      {showCreateForm && (
        <form onSubmit={handleCreatePlaylist} className="create-playlist-form">
          <input
            type="text"
            placeholder="Playlist name (max 15 chars)"
            value={newPlaylist.name}
            onChange={(e) => setNewPlaylist({...newPlaylist, name: e.target.value})}
            maxLength={15}
            required
          />
          <input
            type="text"
            placeholder="Description (max 50 chars)"
            value={newPlaylist.description}
            onChange={(e) => setNewPlaylist({...newPlaylist, description: e.target.value})}
            maxLength={50}
            required
          />
          <button type="submit" className="btn btn-primary">Create</button>
        </form>
      )}

      {playlists.length === 0 ? (
        <p>No playlists yet</p>
      ) : (
        <div className="playlists-grid">
          {playlists.map((playlist) => (
            <Link key={playlist._id} to={`/playlist/${playlist._id}`} className="playlist-card">
              <h3>{playlist.name}</h3>
              <p>{playlist.description}</p>
              <span>{playlist.videoCount} videos</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
