import { useState } from "react";

const CommentSection = ({ postId, onCommentAdded }) => {
  const [newComment, setNewComment] = useState("");
  const token = localStorage.getItem("access_token");

  const handleComment = async () => {
    if (!newComment.trim()) return;

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