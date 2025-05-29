
import { useState } from 'react';
import './comment-section.css';

const CommentSection = ({ 
  postId, 
  comments = [], 
  currentUserId, 
  userRole,
  onComment,
  onDeleteComment,
  isLoggedIn 
}) => {
  const [newComment, setNewComment] = useState('');

  const handleComment = async () => {
    const text = newComment.trim();
    if (!text || !isLoggedIn) return;
    
    try {
      await onComment(postId, text);
      setNewComment('');
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await onDeleteComment(postId, commentId);
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return "/default-avatar.jpg";
    if (avatar.startsWith("data:image")) return avatar;
    if (avatar.startsWith("http")) return avatar;
    if (avatar.match(/^[A-Za-z0-9+/=]+$/)) {
      return `data:image/png;base64,${avatar}`;
    }
    return "/default-avatar.jpg";
  };

  return (
    <div className="comments-section">
      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment.id} className="comment">
            <div className="comment-header">
              <img
                src={getAvatarUrl(comment.user?.avatar)}
                alt={`${comment.user?.username || "User"}'s avatar`}
                className="avatar-image"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default-avatar.jpg";
                }}
              />
              <span className="comment-author">{comment.user?.username || "Unknown User"}</span>
              <span className="comment-time">{new Date(comment.created_at).toLocaleString()}</span>
              {(comment.user_id === currentUserId || userRole === 'admin') && (
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="delete-comment-btn"
                  title="Delete comment"
                >
                  ×
                </button>
              )}
            </div>
            <p className="comment-text">{comment.text}</p>
          </div>
        ))}
      </div>
      <div className="add-comment">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleComment();
            }
          }}
          disabled={!isLoggedIn}
        />
        <button
          onClick={handleComment}
          className="submit-comment"
          disabled={!newComment.trim() || !isLoggedIn}
        >
          Comment
        </button>
      </div>
    </div>
  );
};

export default CommentSection;
