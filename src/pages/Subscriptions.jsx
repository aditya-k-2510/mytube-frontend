import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscriptionAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

function Subscriptions() {
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

export default Subscriptions;
