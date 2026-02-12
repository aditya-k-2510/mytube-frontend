import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { videoAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import VideoCard from '../components/VideoCard';
import './Home.css';

function Home() {
  const { user, loading: authLoading } = useAuth();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!authLoading) {
      fetchVideos();
    }
  }, [page, searchQuery, authLoading]);

  const fetchVideos = async () => {
    // If user is not logged in and videos require auth, don't fetch
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 12,
        ...(searchQuery && { query: searchQuery }),
      };
      const { data } = await videoAPI.getAllVideos(params);
      setVideos(data.data.videos);
      setTotalPages(data.data.totalPages);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || 'Failed to fetch videos');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchVideos();
  };

  if (authLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="home-page">
        <div className="welcome-section">
          <h1>Welcome to MyTube</h1>
          <p>Please log in to view videos</p>
          <Link to="/login" className="btn btn-primary">Login</Link>
          <Link to="/register" className="btn btn-secondary">Register</Link>
        </div>
      </div>
    );
  }

  if (loading && page === 1) {
    return <div className="loading">Loading videos...</div>;
  }

  return (
    <div className="home-page">
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="videos-grid">
        {videos.map((video) => (
          <VideoCard key={video._id} video={video} />
        ))}
      </div>

      {videos.length === 0 && !loading && (
        <div className="no-results">No videos found</div>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn btn-secondary"
          >
            Previous
          </button>
          <span className="page-info">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default Home;
