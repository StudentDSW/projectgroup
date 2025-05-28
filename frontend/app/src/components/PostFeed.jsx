import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CommentSection from "./CommentSection";
import "./PostFeed.css";

const PostFeed = ({ 
  posts, 
  groups, 
  onLike, 
  onDelete, 
  userRole, 
  groupId = null,
  onCommentAdded 
}) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const currentUserId = token ? JSON.parse(atob(token.split('.')[1])).id : null;
  const [showComments, setShowComments] = useState({});

  // Filter posts if groupId is provided
  const filteredPosts = groupId 
    ? posts.filter(post => post.group_id === groupId)
    : posts;

  const toggleComments = (postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleReaction = async (postId, reactionType) => {
    try {
      const formData = new FormData();
      formData.append('reaction_type', reactionType);

      const response = await fetch(`http://localhost:8000/posts/${postId}/reaction`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to update reaction');
      }

      // Call the parent component's callback to refresh posts
      if (onLike) {
        onLike(postId);
      }
    } catch (error) {
      console.error('Error updating reaction:', error);
      alert('Failed to update reaction. Please try again.');
    }
  };

  const renderPost = (post) => {
    if (!post) return null;

    const hasLiked = post.reactions?.some(r => r.user_id === currentUserId && r.type === 'like');
    const hasDisliked = post.reactions?.some(r => r.user_id === currentUserId && r.type === 'dislike');
    const likeCount = post.reactions?.filter(r => r.type === 'like').length || 0;
    const dislikeCount = post.reactions?.filter(r => r.type === 'dislike').length || 0;
    const commentCount = post.comments?.length || 0;
    const group = groups?.find(g => g.id === post.group_id);

    return (
      <div key={post.id} className="post">
        <div className="post-header">
          <div className="post-author">
            <img
              src={post.user?.avatar || "/default-avatar.png"}
              alt={post.user?.username || "User"}
              className="author-avatar"
            />
            <div className="post-info">
              <span className="author-name">{post.user?.username || "Unknown User"}</span>
              {!groupId && group && (
                <span 
                  className="group-name"
                  onClick={() => navigate(`/group/${group.name}`)}
                >
                  in {group.name}
                </span>
              )}
            </div>
          </div>
          {(post.user_id === currentUserId || userRole === "admin") && (
            <button
              onClick={() => onDelete(post.id)}
              className="delete-post-btn"
            >
              Delete
            </button>
          )}
        </div>

        <div className="post-content">
          <p>{post.content}</p>
          {post.image && (
            <img src={post.image} alt="Post" className="post-image" />
          )}
        </div>

        <div className="post-footer">
          <button
            onClick={() => handleReaction(post.id, 'like')}
            className={`reaction-btn like-btn ${hasLiked ? "active" : ""}`}
          >
            👍 {likeCount}
          </button>
          <button
            onClick={() => handleReaction(post.id, 'dislike')}
            className={`reaction-btn dislike-btn ${hasDisliked ? "active" : ""}`}
          >
            👎 {dislikeCount}
          </button>
          <button
            onClick={() => toggleComments(post.id)}
            className={`reaction-btn comment-btn ${showComments[post.id] ? "active" : ""}`}
          >
            💬 {commentCount}
          </button>
        </div>

        <div className="post-timestamp">
          Posted on {new Date(post.created_at).toLocaleString()}
        </div>

        {showComments[post.id] && (
          <CommentSection 
            postId={post.id} 
            onCommentAdded={onCommentAdded}
          />
        )}
      </div>
    );
  };

  if (!Array.isArray(posts)) {
    console.error("Posts prop is not an array:", posts);
    return (
      <div className="posts-grid">
        <div className="no-posts">
          <p>Error loading posts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="posts-grid">
      {filteredPosts.length === 0 ? (
        <div className="no-posts">
          <p>{groupId ? "No posts in this group yet." : "No posts yet. Join a group to see posts here."}</p>
        </div>
      ) : (
        filteredPosts.map(renderPost)
      )}
    </div>
  );
};

export default PostFeed; 