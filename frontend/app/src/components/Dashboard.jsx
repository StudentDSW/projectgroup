import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { AddGroupPopup } from "./AddGroupPopup";
import CreatePostPopup from "./CreatePostPopup";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const API_URL = "http://localhost:8000";

export const Dashboard = () => {
  const [isGroupPopupOpen, setIsGroupPopupOpen] = useState(false);
  const [isPostPopupOpen, setIsPostPopupOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const [comments, setComments] = useState({});
  const [newComment, setNewComment] = useState({});
  const [showComments, setShowComments] = useState({});
  const [userRole, setUserRole] = useState(null);

  const fetchGroups = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      alert("Please log in to continue.");
      navigate("/");
      return;
    }

    try {
      const groupsResponse = await fetch("http://localhost:8000/group/mygroups", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      
      if (!groupsResponse.ok) {
        throw new Error("Failed to fetch groups");
      }
      
      const groupsData = await groupsResponse.json();
      setGroups(groupsData);
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Failed to load groups. Please try again.");
    }
  };

  const fetchPosts = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const postsResponse = await fetch("http://localhost:8000/posts/my-groups", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!postsResponse.ok) {
        throw new Error("Failed to fetch posts");
      }

      const postsData = await postsResponse.json();
      
      // Initialize showComments state for each post
      const initialShowComments = {};
      postsData.forEach(post => {
        initialShowComments[post.id] = false;
      });
      setShowComments(initialShowComments);
      
      setPosts(postsData);
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Failed to load posts. Please try again.");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        await fetchGroups();
        await fetchPosts();
      } catch (error) {
        console.error("Fetch error:", error);
        setError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  const openGroupPopup = () => setIsGroupPopupOpen(true);
  const closeGroupPopup = () => setIsGroupPopupOpen(false);
  
  const openPostPopup = (groupId = null) => {
    setSelectedGroupId(groupId);
    setIsPostPopupOpen(true);
  };
  
  const closePostPopup = () => {
    setIsPostPopupOpen(false);
    setSelectedGroupId(null);
  };

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [...prev, newGroup]);
    fetchGroups();
  };

  const handleGroupClick = (group) => {
    navigate(`/group/${group.name}`);
  };

  const handleReaction = async (postId, reactionType) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/posts/${postId}/reaction?reaction_type=${reactionType}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update reaction");
      }
      
      // Refresh posts to get updated reaction counts
      await fetchPosts();
    } catch (error) {
      console.error("Error updating reaction:", error);
      alert(error.message || "Failed to update reaction. Please try again.");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/posts/post/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete post");
      
      setPosts(posts.filter(post => post.id !== postId));
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleComment = async (postId) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const commentText = newComment[postId];
    if (!commentText?.trim()) return;

    try {
      const formData = new FormData();
      formData.append('text', commentText.trim());

      const res = await fetch(`http://localhost:8000/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to add comment");
      }

      const commentData = await res.json();
      
      // Update the posts state with the new comment
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: [...(post.comments || []), commentData]
            };
          }
          return post;
        })
      );

      // Clear the comment input
      setNewComment({ ...newComment, [postId]: "" });
      
      // Keep the comments section visible
      setShowComments(prev => ({ ...prev, [postId]: true }));
    } catch (error) {
      console.error("Error adding comment:", error);
      alert(error.message || "Failed to add comment. Please try again.");
    }
  };

  const toggleComments = (postId) => {
    setShowComments({ ...showComments, [postId]: !showComments[postId] });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const handleCommentReaction = async (commentId, reactionType) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/posts/comments/${commentId}/reaction?reaction_type=${reactionType}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to update reaction');
      }

      // Refresh posts to get updated reaction counts
      await fetchPosts();
    } catch (error) {
      console.error('Error updating comment reaction:', error);
      alert(error.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/posts/comment/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to delete comment");
      }
      
      await fetchPosts();
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert(error.message || "Failed to delete comment. Please try again.");
    }
  };

  const renderPost = (post) => {
    const currentUserId = JSON.parse(atob(localStorage.getItem("access_token").split('.')[1])).id;
    const hasLiked = post.reactions?.some(r => r.user_id === currentUserId && r.type === 'like');
    const hasDisliked = post.reactions?.some(r => r.user_id === currentUserId && r.type === 'dislike');
    const likeCount = post.reactions?.filter(r => r.type === 'like').length || 0;
    const dislikeCount = post.reactions?.filter(r => r.type === 'dislike').length || 0;
    const commentCount = post.comments?.length || 0;
    const group = groups.find(g => g.id === post.group_id);

    return (
      <div key={post.id} className="post-card">
        <div className="post-header">
          <div>
            <h3 
              onClick={(e) => {
                if (group) {
                  e.stopPropagation();
                  handleGroupClick(group);
                }
              }}
              style={{ cursor: group ? 'pointer' : 'default' }}
            >
              {post.user?.username || "Unknown User"}
              {group && <span className="group-name"> in {group.name}</span>}
            </h3>
            <small>{formatDate(post.created_at)}</small>
          </div>
          {post.user_id === currentUserId && (
            <button
              onClick={() => handleDeletePost(post.id)}
              className="delete-button"
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

        <div className="post-actions">
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

        {showComments[post.id] && (
          <div className="comments-section">
            <div className="comments-list">
              {post.comments?.map((comment) => {
                const hasLikedComment = comment.reactions?.some(r => r.user_id === currentUserId && r.type === 'like');
                const hasDislikedComment = comment.reactions?.some(r => r.user_id === currentUserId && r.type === 'dislike');
                const commentLikeCount = comment.reactions?.filter(r => r.type === 'like').length || 0;
                const commentDislikeCount = comment.reactions?.filter(r => r.type === 'dislike').length || 0;

                return (
                  <div key={comment.id} className="comment">
                    <div className="comment-header">
                      <strong>{comment.user?.username || "Unknown User"}:</strong>
                      {comment.user_id === currentUserId && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="delete-comment-btn"
                          title="Delete comment"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <p>{comment.text}</p>
                    <div className="comment-actions">
                      <button
                        onClick={() => handleCommentReaction(comment.id, 'like')}
                        className={`reaction-btn like-btn ${hasLikedComment ? "active" : ""}`}
                      >
                        👍 {commentLikeCount}
                      </button>
                      <button
                        onClick={() => handleCommentReaction(comment.id, 'dislike')}
                        className={`reaction-btn dislike-btn ${hasDislikedComment ? "active" : ""}`}
                      >
                        👎 {commentDislikeCount}
                      </button>
                      <small className="comment-time">
                        {formatDate(comment.created_at)}
                      </small>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="add-comment">
              <textarea
                value={newComment[post.id] || ""}
                onChange={(e) => setNewComment({ ...newComment, [post.id]: e.target.value })}
                placeholder="Write a comment..."
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleComment(post.id);
                  }
                }}
              />
              <button
                onClick={() => handleComment(post.id)}
                className="submit-comment"
                disabled={!newComment[post.id]?.trim()}
              >
                Comment
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleGroupJoined = (newGroup) => {
    setGroups((prev) => {
      if (prev.some((g) => g.id === newGroup.id)) return prev;
      return [...prev, newGroup];
    });
    fetchGroups();
  };

  const handlePostCreated = () => {
    fetchPosts();
  };

  if (isLoading) {
    return (
      <div className="wrapper-dashboard">
        <Navbar />
        <div className="dashboard-loading">
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrapper-dashboard">
        <Navbar />
        <div className="dashboard-error">
          <div className="error-message">{error}</div>
          <button 
            onClick={() => navigate("/dashboard")}
            className="return-button"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapper-dashboard">
      <Navbar onJoinGroup={handleGroupJoined} />
      <div className="dashboard-container">
        <div className="sidebar">
          <div className="action-buttons">
            <button 
              className="add-group" 
              onClick={openGroupPopup}
              title="Create a new group"
            >
              <span className="icon">+</span>
              <span className="text">Create Group</span>
            </button>
            <button 
              className="create-post" 
              onClick={() => openPostPopup()}
              title="Create a new post"
            >
              <span className="icon">+</span>
              <span className="text">Create Post</span>
            </button>
          </div>
          
          <div className="groups-section">
            <h2 className="group-title">Your Groups</h2>
            {groups.length === 0 ? (
              <div className="no-groups">
                <p>You haven't joined any groups yet.</p>
              </div>
            ) : (
              <div className="group-list">
                {[...groups]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((group) => (
                    <div 
                      key={group.id} 
                      className="group-item"
                      onClick={() => handleGroupClick(group)}
                      title={`View ${group.name}`}
                    >
                      <span className="group-name">{group.name}</span>
                      <span className="group-arrow">→</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-content">
          <div className="posts-section">
            <h2>Recent Posts from Your Groups</h2>
            {posts.length === 0 ? (
              <div className="no-posts">
                <p>No posts yet. Join a group to see posts here.</p>
              </div>
            ) : (
              <div className="posts-grid">
                {posts.map(renderPost)}
              </div>
            )}
          </div>
        </div>
      </div>

      {isGroupPopupOpen && (
        <AddGroupPopup
          closePopup={closeGroupPopup}
          onGroupCreated={handleGroupCreated}
        />
      )}

      {isPostPopupOpen && (
        <CreatePostPopup
          onClose={() => {
            closePostPopup();
            handlePostCreated();
          }}
          defaultGroupId={selectedGroupId}
        />
      )}
    </div>
  );
};
