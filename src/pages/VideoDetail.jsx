import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import Hls from 'hls.js';
import { videoAPI, commentAPI, likeAPI, subscriptionAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import './VideoDetail.css';

function VideoDetail() {
  const { videoId } = useParams();
  const { user } = useAuth();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const lastWatchTime = useRef(0);
  const lastVideoDuration = useRef(0);
  const [video, setVideo] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentContent, setCommentContent] = useState('');
  const [liked, setLiked] = useState(false);
  const [streamUrls, setStreamUrls] = useState(null);
  const [videoLoadError, setVideoLoadError] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatBottomRef = useRef(null);

  useEffect(() => {
    setStreamUrls(null);
    setVideoLoadError(false);
    setChatOpen(false);
    setChatHistory([]);
    setChatInput('');
    const loadVideo = async () => {
      const videoData = await fetchVideoData();
      if (videoData?.processingStatus === 'ready') {
        fetchStreamUrls();
      }
    };
    loadVideo();
    fetchComments();
  }, [videoId]);

  useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      const v = videoRef.current;
      if (v && v.duration && v.currentTime>0) {
        navigator.sendBeacon(
          `/api/v1/videos/watch-progress/${videoId}`,
          JSON.stringify(
          {
            watchTime: v.currentTime,
            duration: v.duration
          }
        ));
      }
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);

  return () => {
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}, [videoId]);

  useEffect(() => {
      return () => {
        console.log(lastWatchTime.current);
        console.log(lastVideoDuration.current);
        if (lastVideoDuration.current && lastWatchTime.current > 0) {
          navigator.sendBeacon(
            `/api/v1/videos/watch-progress/${videoId}`,
            JSON.stringify({
              watchTime: lastWatchTime.current,
              duration: lastVideoDuration.current
            })
          );
        }
  };

}, [videoId]);

  useEffect(() => {
   if (!streamUrls || !videoRef.current) return;

   const videoElement = videoRef.current;
   console.log("videoElement:", videoElement);
   console.log("Hls.isSupported():", Hls.isSupported());
   console.log("streamUrls.hls:", streamUrls.hls);

   if (streamUrls.hls && Hls.isSupported()) {
      console.log("→ Taking HLS.js branch");
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(streamUrls.hls);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
         console.log("✅ Manifest parsed successfully, levels:", hls.levels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log("🔄 Quality switched to level:", data.level, hls.levels[data.level]);
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
      console.error("❌ HLS ERROR:", data.type, data.details, data);
      if (data.fatal) {
          console.error("Fatal HLS error, falling back to direct MP4");
          hls.destroy();
          hlsRef.current = null;
          videoElement.src = streamUrls.qualities?.['720p'] || streamUrls.fallback;
        }
      });

   } else if (streamUrls.hls && videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      console.log("→ Taking native Safari HLS branch");
      videoElement.src = streamUrls.hls;
   } else {
      console.log("→ Taking FALLBACK direct MP4 branch");
      videoElement.src = streamUrls.qualities?.['720p'] || streamUrls.fallback;
   }

   return () => {
      if (hlsRef.current) {
         hlsRef.current.destroy();
         hlsRef.current = null;
      }
   };
}, [streamUrls]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const fetchVideoData = async () => {
    try {
      const { data } = await videoAPI.getVideoById(videoId);
      setVideo(data.data);
      setLoading(false);
      return data.data;
    } catch (error) {
      console.error('Failed to fetch video:', error);
      setLoading(false);
      return null;
    }
  };

  const fetchStreamUrls = async () => {
    try {
      const { data } = await videoAPI.getStreamUrls(videoId);
      setStreamUrls(data.data);
    } catch (error) {
      console.error('Failed to fetch stream urls:', error);
    }
  };

  const fetchComments = async () => {
    try {
      const { data } = await commentAPI.getVideoComments(videoId, { page: 1, limit: 20 });
      setComments(data.data.comments);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    }
  };

  const handleLike = async () => {
    try {
      await likeAPI.toggleVideoLike(videoId);
      setLiked(!liked);
      fetchVideoData(); // Refresh to get updated like count
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleSubscribe = async () => {
    if (!video?.owner) return;
    try {
      await subscriptionAPI.toggleSubscription(video.owner._id);
      fetchVideoData(); // Refresh to get updated subscription status
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    try {
      await commentAPI.addComment(videoId, commentContent);
      setCommentContent('');
      fetchComments();
    } catch (error) {
      console.error('Failed to add comment:', error);
      alert(error.response?.data?.message || 'Failed to add comment');
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    
    try {
      await commentAPI.deleteComment(commentId);
      fetchComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  const parseTimeToSeconds = (timeString) => {
    const parts = timeString.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  const seekTo = (seconds) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    videoRef.current.play();
    videoRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const parseMessageWithTimestamps = (text) => {
    const regex = /\[\[(\d+:\d{2}(?::\d{2})?)\]\]/g;
    const matches = [...text.matchAll(regex)];
    if (matches.length === 0) return text;

    const result = [];
    let lastIndex = 0;
    matches.forEach((match, i) => {
      const timeString = match[1];
      if (match.index > lastIndex) {
        result.push(text.slice(lastIndex, match.index));
      }
      result.push(
        <button
          key={`timestamp-${match.index}`}
          className="timestamp-link"
          onClick={() => seekTo(parseTimeToSeconds(timeString))}
        >
          {`▶ ${timeString}`}
        </button>
      );
      lastIndex = match.index + match[0].length;
    });
    if (lastIndex < text.length) {
      result.push(text.slice(lastIndex));
    }
    return result;
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = { role: "user", content: chatInput };
    const updatedHistory = [...chatHistory, userMessage];
    setChatHistory([...updatedHistory, { role: "assistant", content: "", complete: false }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch(`/api/v1/videos/${videoId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          message: userMessage.content,
          history: chatHistory.slice(-6),
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        let streamDone = false;
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              setChatHistory((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: parsed.error, complete: true };
                return next;
              });
              streamDone = true;
              break;
            }
            if (parsed.text) {
              fullResponse += parsed.text;
              setChatHistory((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: fullResponse, complete: false };
                return next;
              });
            }
          } catch (err) {
            // ignore malformed chunk
          }
        }
        if (streamDone) break;
      }

      setChatHistory((prev) => {
        const next = [...prev];
        next[next.length - 1] = { role: "assistant", content: fullResponse, complete: true };
        return next;
      });
    } catch (error) {
      setChatHistory((prev) => {
        const next = [...prev];
        next[next.length - 1] = {
          role: "assistant",
          content: "Something went wrong. Please try again.",
          complete: true,
        };
        return next;
      });
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) return <div className="loading">Loading video...</div>;
  if (!video) return <div className="error">Video not found</div>;

  return (
    <div className="video-detail-page">
      <div className="video-player-section">
        <div className="video-player">
          {video.processingStatus === 'ready' ? (
              videoLoadError ? (
                <div className="video-error-message">
                    This video is temporarily unavailable. Please try again later.
                </div>
              ) : (
                <video
                    ref={videoRef}
                    controls
                    poster={video.thumbnail}
                    onTimeUpdate={(e) => {
                      lastWatchTime.current = e.target.currentTime;
                    }}
                    onLoadedMetadata={(e) => {
                      lastVideoDuration.current = e.target.duration;
                    }}
                    onError={(e) => {
                      console.error('Video element error:', e.target.error);
                      setVideoLoadError(true);
                    }}
                />
              )
          ) : (
              <div className="video-processing-message">
                Video is still processing, please check back soon
              </div>
          )}
        </div>

        <div className="video-info-section">
          <h1 className="video-title">{video.title}</h1>
          
          <div className="video-stats">
            <span>{video.views} views</span>
            <div className="video-actions">
              {user && (
                <button onClick={handleLike} className="btn btn-icon">
                  👍 {video.likesCount}
                </button>
              )}
            </div>
          </div>

          <div className="channel-info">
            <Link to={`/channel/${video.owner.username}`} className="channel-link">
              <img src={video.owner.avatar} alt={video.owner.username} className="channel-avatar" />
              <div>
                <div className="channel-name">{video.owner.username}</div>
                <div className="subscriber-count">{video.owner.subscriberCount} subscribers</div>
              </div>
            </Link>
            
            {user && user._id !== video.owner._id && (
              <button onClick={handleSubscribe} className="btn btn-primary">
                {video.owner.isSubscribed ? 'Unsubscribe' : 'Subscribe'}
              </button>
            )}
          </div>

          <div className="video-description">
            <p>{video.description}</p>
          </div>
        </div>
      </div>

      {video.transcriptStatus === 'ready' && (
        <div className="video-chat-section">
          <button onClick={() => setChatOpen(!chatOpen)} className="btn btn-secondary">
            {chatOpen ? 'Close AI Chat' : '💬 Ask AI About This Video'}
          </button>

          {chatOpen && (
            <div className="chat-panel">
              <div className="chat-header">
                <span>🤖 Ask about this video</span>
                <button
                  onClick={() => setChatHistory([])}
                  className="btn btn-text btn-small"
                >
                  Clear
                </button>
              </div>

              <div className="chat-messages">
                {chatHistory.length === 0 && (
                  <div className="chat-empty">
                    <p>Ask anything about this video</p>
                    <div className="chat-suggestions">
                      <span
                        className="chat-suggestion"
                        onClick={() => setChatInput('Summarize this video')}
                      >
                        Summarize this video
                      </span>
                      <span
                        className="chat-suggestion"
                        onClick={() => setChatInput('What are the main topics covered?')}
                      >
                        What are the main topics covered?
                      </span>
                      <span
                        className="chat-suggestion"
                        onClick={() => setChatInput('What was discussed at the start?')}
                      >
                        What was discussed at the start?
                      </span>
                    </div>
                  </div>
                )}

                {chatHistory.map((msg, index) => (
                  <div key={index} className={`chat-message ${msg.role}`}>
                    <span className="chat-avatar">{msg.role === 'user' ? '👤' : '🤖'}</span>
                    <div className="chat-content">
                      {msg.role === 'user' && msg.content}
                      {msg.role === 'assistant' && !msg.complete && (
                        msg.content ? msg.content : (
                          <span className="chat-thinking">●●●</span>
                        )
                      )}
                      {msg.role === 'assistant' && msg.complete && parseMessageWithTimestamps(msg.content)}
                    </div>
                  </div>
                ))}

                <div ref={chatBottomRef} />
              </div>

              <div className="chat-input-row">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !chatLoading) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask about this video..."
                  disabled={chatLoading}
                  className="chat-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={chatLoading || !chatInput.trim()}
                  className="btn btn-primary"
                >
                  {chatLoading ? '...' : 'Send'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="comments-section">
        <h2>{comments.length} Comments</h2>
        
        {user && (
          <form onSubmit={handleAddComment} className="comment-form">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentContent}
              onChange={(e) => setCommentContent(e.target.value)}
              maxLength={100}
            />
            <button type="submit" className="btn btn-primary">Comment</button>
          </form>
        )}

        <div className="comments-list">
          {comments.map((comment) => (
            <div key={comment._id} className="comment">
              <img src={comment.owner.avatar} alt={comment.owner.username} className="comment-avatar" />
              <div className="comment-content">
                <div className="comment-header">
                  <span className="comment-author">{comment.owner.username}</span>
                  <span className="comment-time">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p>{comment.content}</p>
                {user && user._id === comment.owner._id && (
                  <button 
                    onClick={() => handleDeleteComment(comment._id)}
                    className="btn btn-text btn-small"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VideoDetail;
