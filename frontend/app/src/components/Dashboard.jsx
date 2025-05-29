import { useState, useEffect, useMemo, useCallback } from "react";
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

  const token = useMemo(() => localStorage.getItem("access_token"), []);
  
  // Get current user ID from token
  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split('.')[1])).id;
    } catch (err) {
      console.error("Error decoding token:", err);
      return null;
    }
  }, [token]);

  // Fetch user's groups
  const fetchGroups = useCallback(async () => {
    if (!token) {
      alert("Please log in to continue.");
      navigate("/");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/group/mygroups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch groups");
      setGroups(await res.json());
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load groups. Please try again.");
    }
  }, [token, navigate]);

  // Fetch posts (paginated)
  const fetchPosts = useCallback(
    async (page = 1) => {
      if (!token) return;
      try {
        const res = await fetch(
          `${API_URL}/posts/my-groups?page=${page}&per_page=${POSTS_PER_PAGE}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error("Failed to fetch posts");
        const { posts: fetchedPosts, total_pages } = await res.json();

        setPosts((prev) =>
          page === 1
            ? fetchedPosts
            : [
                ...prev,
                ...fetchedPosts.filter((p) => !prev.some((old) => old.id === p.id)),
              ]
        );
        setHasMore(page < total_pages);

        // Initialize showComments for any newly loaded posts
        setShowComments((prev) => {
          const next = { ...prev };
          fetchedPosts.forEach((p) => {
            if (!(p.id in next)) next[p.id] = false;
          });
          return next;
        });
      } catch (err) {
        console.error("Fetch error:", err);
        setError("Failed to load posts. Please try again.");
      }
    },
    [token]
  );

  // Load groups + first page of posts once
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchGroups();
        await fetchPosts(1);
      } catch {
        // errors handled inside fetchGroups/fetchPosts
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    loadAll();
    return () => {
      mounted = false;
    };
  }, [fetchGroups, fetchPosts]);

  const fetchMorePosts = useCallback(async () => {
    if (!hasMore || isLoading) return;
    const next = currentPage + 1;
    setCurrentPage(next);
    await fetchPosts(next);
  }, [currentPage, hasMore, isLoading, fetchPosts]);

  // Handlers memoized
  const handleGroupCreated = useCallback(
    async (newGroup) => {
      setGroups((prev) => [...prev, newGroup]);
      await fetchGroups();
    },
    [fetchGroups]
  );

  const handleGroupClick = useCallback(
    (group) => {
      setPosts([]);
      navigate(`/group/${group.name}`);
    },
    [navigate]
  );

  const handleReaction = useCallback(
    async (postId, reactionType) => {
      if (!token) return;
      try {
        const res = await fetch(
          `${API_URL}/posts/${postId}/reaction?reaction_type=${reactionType}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) {
          const { detail } = await res.json();
          throw new Error(detail || "Failed to update reaction");
        }
        // Optimistically update local state
        const data = await res.json();
        setPosts((prev) =>
          prev.map((p) => {
            if (p.id !== postId) return p;
            const updated = [...(p.reactions || [])];
            const idx = updated.findIndex((r) => r.user_id === currentUserId);
            if (data.status === "removed" && idx !== -1) {
              updated.splice(idx, 1);
            } else if (idx !== -1) {
              updated[idx] = { ...updated[idx], type: reactionType };
            } else {
              updated.push({
                id: Date.now(),
                post_id: postId,
                user_id: currentUserId,
                type: reactionType,
              });
            }
            return { ...p, reactions: updated };
          })
        );
      } catch (err) {
        console.error("Error updating reaction:", err);
        alert(err.message || "Failed to update reaction. Please try again.");
      }
    },
    [token, currentUserId]
  );

  const handleDeletePost = useCallback(
    async (postId) => {
      if (!window.confirm("Are you sure you want to delete this post?")) return;
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/posts/post/${postId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to delete post");
        setPosts((prev) => prev.filter((p) => p.id !== postId));
      } catch (err) {
        console.error("Error deleting post:", err);
      }
    },
    [token]
  );

  const handleComment = useCallback(
    async (postId, commentText) => {
      if (!token || !commentText?.trim()) return;
      try {
        const formData = new FormData();
        formData.append('text', commentText.trim());

        const res = await fetch(`${API_URL}/posts/${postId}/comment`, {
          method: "POST",
          headers: { 
            Authorization: `Bearer ${token}`
          },
          body: formData
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || "Failed to add comment");
        }

        const newComment = await res.json();
        // insert comment into local post
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, comments: [...(p.comments || []), newComment] }
              : p
          )
        );
        setShowComments((prev) => ({ ...prev, [postId]: true }));
      } catch (err) {
        console.error("Error adding comment:", err);
        alert(err.message || "Failed to add comment. Please try again.");
      }
    },
    [token]
  );

  const toggleComments = useCallback((postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

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

  const handleCommentReaction = useCallback(
    async (commentId, reactionType) => {
      if (!token) return;
      try {
        const res = await fetch(
          `${API_URL}/posts/comments/${commentId}/reaction?reaction_type=${reactionType}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) {
          const { detail } = await res.json();
          throw new Error(detail || "Failed to update reaction");
        }
        // simply refresh posts for updated reactions
        await fetchPosts(currentPage);
      } catch (err) {
        console.error("Error updating comment reaction:", err);
        alert(err.message || "Failed to update reaction. Please try again.");
      }
    },
    [token, fetchPosts, currentPage]
  );

  const handleDeleteComment = useCallback(
    async (postId, commentId) => {
      if (!token || !window.confirm("Are you sure you want to delete this comment?")) return;
      try {
        const res = await fetch(
          `${API_URL}/posts/${postId}/comment/${commentId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) {
          const { detail } = await res.json();
          throw new Error(detail || "Failed to delete comment");
        }
        // refresh comments via fetchPosts
        await fetchPosts(currentPage);
      } catch (err) {
        console.error("Error deleting comment:", err);
        alert(err.message || "Failed to delete comment. Please try again.");
      }
    },
    [token, fetchPosts, currentPage]
  );

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
                showComments={showComments}
                toggleComments={toggleComments}
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
