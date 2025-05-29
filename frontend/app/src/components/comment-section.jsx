import { useState } from 'react';
import './comment-section.css';

const CommentSection = ({ 
  postId, 
  comments = [], 
  currentUserId, 
  userRole,
  onComment,
  onDeleteComment,
  onCommentReaction,
  isLoggedIn 
}) => {
  const [newComment, setNewComment] = useState('');

  const handleComment = async () => {
    const text = newComment.trim();
    if (!text || !isLoggedIn) return;
    
    try {
      await onComment(postId, text);
      setNewComment(''); // Clear the input after successful comment
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

  const handleCommentReaction = async (commentId, type) => {
    try {
      await onCommentReaction(commentId, type);
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  return (
    <div className="comments-section">
      <div className="comments-list">
        {comments.map((comment) => {
          const hasLikedComment = comment.reactions?.some(
            r => r.user_id === currentUserId && r.type === 'like'
          );
          const hasDislikedComment = comment.reactions?.some(
            r => r.user_id === currentUserId && r.type === 'dislike'
          );
          const commentLikeCount = comment.reactions?.filter(r => r.type === 'like').length || 0;
          const commentDislikeCount = comment.reactions?.filter(r => r.type === 'dislike').length || 0;

          return (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <img
                  src={comment.user?.avatar || "/default-avatar.jpg"}
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
              <div className="comment-actions">
                <button
                  onClick={() => handleCommentReaction(comment.id, 'like')}
                  className={`comment-action-btn like ${hasLikedComment ? "active" : ""}`}
                >
                  👍 {commentLikeCount}
                </button>
                <button
                  onClick={() => handleCommentReaction(comment.id, 'dislike')}
                  className={`comment-action-btn dislike ${hasDislikedComment ? "active" : ""}`}
                >
                  👎 {commentDislikeCount}
                </button>
              </div>
            </div>
          );
        })}
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