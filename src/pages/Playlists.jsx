import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { playlistAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function Playlists() {
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

export default Playlists;
