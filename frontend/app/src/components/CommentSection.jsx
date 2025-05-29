import { useState, useEffect, useMemo } from "react";

const CommentSection = ({ postId, onCommentAdded }) => {
  const [newComment, setNewComment] = useState("");
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const token = localStorage.getItem("access_token");
  
  // Simplified authentication check
  const isLoggedIn = useMemo(() => {
    return !!token;
  }, [token]);

  const getAvatarUrl = (avatar) => {
    if (!avatar) return "/default-avatar.jpg";
    if (avatar.startsWith("data:image")) return avatar;
    return `data:image/png;base64,${avatar}`;
  };

  const fetchComments = async () => {
    try {
      const response = await fetch(`http://localhost:8000/posts/${postId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch comments');
      }

      const data = await response.json();
      setComments(data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [postId]);

  const handleComment = async () => {
    if (!newComment.trim() || !isLoggedIn) return;

    try {
      const formData = new FormData();
      formData.append('text', newComment.trim());

      const res = await fetch(`http://localhost:8000/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to add comment");
      }

      const commentData = await res.json();
      
      // Add the new comment to the list
      setComments(prevComments => [...prevComments, commentData]);
      
      // Call the parent component's callback
      if (onCommentAdded) {
        onCommentAdded(postId, commentData);
      }

      // Clear the comment input
      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
      alert(error.message || "Failed to add comment. Please try again.");
    }
  };

  return (
    <div className="comments-section" onClick={(e) => e.stopPropagation()}>
      <h4>Comments</h4>
      <div className="comments-list">
        {isLoading ? (
          <p>Loading comments...</p>
        ) : comments.length === 0 ? (
          <p>No comments yet. Be the first to comment!</p>
        ) : (
          comments.map(comment => (
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
                <span className="comment-time">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <p className="comment-text">{comment.text}</p>
            </div>
          ))
        )}
      </div>
      <div className="add-comment">
        <textarea
          id="comment-text"
          name="comment-text"
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
        />
        <button
          onClick={handleComment}
          className="submit-comment"
          disabled={!newComment.trim()}
        >
          Comment
        </button>
      </div>
    </div>
  );
};

export default CommentSection; 