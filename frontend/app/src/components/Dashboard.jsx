import { useState, useEffect, useMemo } from "react";
import { Navbar } from "./Navbar";
import { AddGroupPopup } from "./AddGroupPopup";
import CreatePostPopup from "./CreatePostPopup";
import PostFeed from "./PostFeed";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";
import CommentSection from './comment-section';

const API_URL = "http://localhost:8000";
const POSTS_PER_PAGE = 10;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const token = localStorage.getItem("access_token");
  
  // Get current user ID from token
  const currentUserId = useMemo(() => {
    try {
      if (!token) return null;
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload?.id || null;
    } catch (err) {
      console.error("Error decoding token:", err);
      return null;
    }
  }, [token]);

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

  const fetchPosts = async (page = 1) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const postsResponse = await fetch(`${API_URL}/posts/my-groups?page=${page}&per_page=${POSTS_PER_PAGE}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!postsResponse.ok) {
        throw new Error("Failed to fetch posts");
      }

      const responseData = await postsResponse.json();
      const postsData = responseData.posts;
      
      // Update posts state while preserving showComments state
      setPosts(prevPosts => {
        if (page === 1) {
          return postsData;
        }
        // For pagination, merge new posts with existing ones
        const existingIds = new Set(prevPosts.map(post => post.id));
        const newPosts = postsData.filter(post => !existingIds.has(post.id));
        return [...prevPosts, ...newPosts];
      });

      // Check if we have more posts to load
      setHasMore(page < responseData.total_pages);
      
      // Preserve showComments state for existing posts
      setShowComments(prev => {
        const newState = { ...prev };
        postsData.forEach(post => {
          if (!newState.hasOwnProperty(post.id)) {
            newState[post.id] = false;
          }
        });
        return newState;
      });
    } catch (error) {
      console.error("Fetch error:", error);
      setError("Failed to load posts. Please try again.");
    }
  };

  const fetchMorePosts = async () => {
    if (!hasMore || isLoading) return;
    
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    await fetchPosts(nextPage);
  };

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      setPosts([]); // Reset posts when loading new data

      try {
        await fetchGroups();
        await fetchPosts(1);
      } catch (error) {
        console.error("Fetch error:", error);
        setError("Failed to load data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [navigate]);

  // Add a cleanup effect
  useEffect(() => {
    return () => {
      setPosts([]);
      setGroups([]);
    };
  }, []);

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
    setPosts([]); // Reset posts before navigation
    navigate(`/group/${group.name}`);
  };

  const handleReaction = async (postId, reactionType, responseData) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      // If responseData is not provided, fetch it
      if (!responseData) {
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

        responseData = await res.json();
      }

      // Get current user ID from token
      const currentUserId = JSON.parse(atob(token.split('.')[1])).id;

      // Update the posts state immediately based on the response
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            const updatedReactions = [...(post.reactions || [])];
            const existingReactionIndex = updatedReactions.findIndex(
              r => r.user_id === currentUserId
            );

            if (responseData.status === "removed") {
              // Remove the reaction if it was toggled off
              if (existingReactionIndex !== -1) {
                updatedReactions.splice(existingReactionIndex, 1);
              }
            } else {
              // Add or update the reaction
              if (existingReactionIndex !== -1) {
                updatedReactions[existingReactionIndex] = {
                  ...updatedReactions[existingReactionIndex],
                  type: reactionType
                };
              } else {
                updatedReactions.push({
                  id: Date.now(), // Temporary ID
                  post_id: postId,
                  user_id: currentUserId,
                  type: reactionType
                });
              }
            }

            return {
              ...post,
              reactions: updatedReactions
            };
          }
          return post;
        })
      );
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

  const handleComment = async (postId, commentText) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    if (!commentText?.trim()) return;

    try {
      const formData = new FormData();
      formData.append('text', commentText.trim());

      const res = await fetch(`${API_URL}/posts/${postId}/comment`, {
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

      // Get the response data which includes the new comment
      const responseData = await res.json();
      
      // Update posts state immediately with the new comment
      setPosts(prevPosts => 
        prevPosts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: [...(post.comments || []), responseData]
            };
          }
          return post;
        })
      );

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
      const res = await fetch(`${API_URL}/posts/comments/${commentId}/reaction?reaction_type=${reactionType}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update reaction");
      }

      // Refresh posts to get updated reactions
      await fetchPosts(currentPage);
    } catch (error) {
      console.error("Error updating comment reaction:", error);
      alert(error.message || "Failed to update reaction. Please try again.");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    if (!window.confirm("Are you sure you want to delete this comment?")) return;

    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comment/${commentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to delete comment");
      }

      // Refresh posts to get updated comments
      await fetchPosts(currentPage);
    } catch (error) {
      console.error("Error deleting comment:", error);
      alert(error.message || "Failed to delete comment. Please try again.");
    }
  };

  const handleGroupUpdated = () => {
    // Reset states
    setPosts([]);
    setGroups([]);
    setError(null);
    setIsLoading(true);

    // Fetch fresh data
    Promise.all([
      fetchGroups(),
      fetchPosts(1)
    ]).catch(error => {
      console.error("Error updating data:", error);
      setError("Error updating data");
    }).finally(() => {
      setIsLoading(false);
    });
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
      <Navbar
        onJoinGroup={(newGroup) => {
          setGroups((prev) => {
            if (prev.some((g) => g.id === newGroup.id)) return prev;
            return [...prev, newGroup];
          });
          fetchPosts(1);
        }}
        onLeaveGroup={(leftGroup) => {
          setGroups((prev) => prev.filter(g => g.id !== leftGroup.id));
          fetchPosts(1);
        }}
      />
      <div className="dashboard-container">
        <div className="sidebar">
          <div className="action-buttons">
            <button 
              className="add-group" 
              onClick={() => setIsGroupPopupOpen(true)}
              title="Create a new group"
            >
              <span className="icon">+</span>
              <span className="text">Create Group</span>
            </button>
            <button 
              className="create-post" 
              onClick={() => setIsPostPopupOpen(true)}
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
              <PostFeed
                posts={posts}
                groups={groups}
                onLike={handleReaction}
                onDelete={handleDeletePost}
                userRole={userRole}
                onCommentAdded={handleComment}
                onCommentReaction={handleCommentReaction}
                onDeleteComment={handleDeleteComment}
                fetchMorePosts={fetchMorePosts}
                currentUserId={currentUserId}
              />
            )}
          </div>
        </div>
      </div>

      {isGroupPopupOpen && (
        <AddGroupPopup
          closePopup={() => setIsGroupPopupOpen(false)}
          onGroupCreated={handleGroupCreated}
        />
      )}

      {isPostPopupOpen && (
        <CreatePostPopup
          onClose={() => {
            setIsPostPopupOpen(false);
            fetchPosts(1);
          }}
          defaultGroupId={selectedGroupId}
        />
      )}
    </div>
  );
};
