import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './Navbar.css';

function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          📺 MyTube
        </Link>

        <div className="navbar-menu">
          {user ? (
            <>
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/subscriptions" className="nav-link">Subscriptions</Link>
              <Link to="/history" className="nav-link">History</Link>
              <Link to="/liked-videos" className="nav-link">Liked Videos</Link>
              <Link to="/playlists" className="nav-link">Playlists</Link>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              
              <div className="user-menu">
                <button 
                  onClick={toggleTheme} 
                  className="theme-toggle"
                  title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                  {theme === 'light' ? '🌙' : '☀️'}
                </button>
                <Link to={`/channel/${user.username}`} className="user-info">
                  <img 
                    src={user.avatar || '/default-avatar.png'} 
                    alt={user.username}
                    className="user-avatar"
                  />
                  <span>{user.username}</span>
                </Link>
                <button onClick={handleLogout} className="btn btn-secondary">
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <button 
                onClick={toggleTheme} 
                className="theme-toggle"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
              <Link to="/login" className="btn btn-primary">Login</Link>
              <Link to="/register" className="btn btn-secondary">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
