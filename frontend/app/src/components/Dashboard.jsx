import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Navbar } from "./Navbar";
import { AddGroupPopup } from "./AddGroupPopup";
import CreatePostPopup from "./CreatePostPopup";
import PostFeed from "./PostFeed";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

const API_URL = "http://localhost:8000";
const POSTS_PER_PAGE = 10;

export const Dashboard = () => {
  const navigate = useNavigate();
  const token = useMemo(() => localStorage.getItem("access_token"), []);
  const [groups, setGroups] = useState([]);
  const [posts, setPosts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const observerTarget = useRef(null);

  const [isGroupPopupOpen, setIsGroupPopupOpen] = useState(false);
  const [isPostPopupOpen, setIsPostPopupOpen] = useState(false);
  const [showComments, setShowComments] = useState({});

  // Decode user ID from token:
  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      return JSON.parse(atob(token.split(".")[1])).id;
    } catch {
      return null;
    }
  }, [token]);

  // 1) Fetch all groups once on mount
  const fetchGroups = useCallback(async () => {
    if (!token) {
      navigate("/");
      return;
    }
    try {
      const res = await fetch(`${API_URL}/group/mygroups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch groups");
      const data = await res.json();
      setGroups(data);
    } catch (err) {
      console.error("Error fetching groups:", err);
      setError("Could not load groups.");
    }
  }, [token, navigate]);

  // 2) Fetch a single page of posts
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

        // Ensure each post has a reactions array
        const processedPosts = fetchedPosts.map(post => ({
          ...post,
          reactions: post.reactions || []
        }));

        setPosts((prev) => {
          if (page === 1) return processedPosts;
          const existingIds = new Set(prev.map((p) => p.id));
          const newOnes = processedPosts.filter((p) => !existingIds.has(p.id));
          return [...prev, ...newOnes];
        });
        setHasMore(page < total_pages);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError("Could not load posts.");
      }
    },
    [token]
  );

  // 3) On mount, load groups + first page of posts
  useEffect(() => {
    let isMounted = true;
    const loadInitial = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Load groups and first page of posts in parallel
        const [groupsRes, postsRes] = await Promise.all([
          fetch(`${API_URL}/group/mygroups`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/posts/my-groups?page=1&per_page=${POSTS_PER_PAGE}`, {
            headers: { Authorization: `Bearer ${token}` },
          })
        ]);

        if (!groupsRes.ok) throw new Error("Failed to fetch groups");
        if (!postsRes.ok) throw new Error("Failed to fetch posts");

        const groupsData = await groupsRes.json();
        const { posts: fetchedPosts, total_pages } = await postsRes.json();

        if (isMounted) {
          setGroups(groupsData);
          // Ensure each post has a reactions array
          const processedPosts = fetchedPosts.map(post => ({
            ...post,
            reactions: post.reactions || []
          }));
          setPosts(processedPosts);
          setHasMore(1 < total_pages);
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading initial data:", err);
        if (isMounted) {
          setError("Could not load initial data.");
          setIsLoading(false);
        }
      }
    };

    loadInitial();
    return () => {
      isMounted = false;
    };
  }, [token]);

  // 4) Set up intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          const nextPage = currentPage + 1;
          setIsLoading(true);
          fetchPosts(nextPage).then(() => {
            setCurrentPage(nextPage);
            setIsLoading(false);
          });
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [currentPage, hasMore, isLoading, fetchPosts]);

  // 5) Handlers for create/join/leave group
  const handleGroupCreated = useCallback(
    (newGroup) => {
      setGroups((prev) => [...prev, newGroup]);
      // We do not re-fetch all groups—just append the new one locally.
      // Then reload only page 1 of posts to include any new‐group posts:
      setCurrentPage(1);
      fetchPosts(1);
    },
    [fetchPosts]
  );

  const handleGroupJoined = useCallback(
    (newGroup) => {
      if (!groups.some((g) => g.id === newGroup.id)) {
        setGroups((prev) => [...prev, newGroup]);
      }
      // Reload page 1 of posts so you see posts from this newly joined group:
      setCurrentPage(1);
      fetchPosts(1);
    },
    [groups, fetchPosts]
  );

  const handleGroupLeft = useCallback(
    (leftGroup) => {
      setGroups((prev) => prev.filter((g) => g.id !== leftGroup.id));
      // Reload page 1, since you no longer see that group's posts:
      setCurrentPage(1);
      fetchPosts(1);
    },
    [fetchPosts]
  );

  // 6) Reaction: POST then fetch updated post data
  const handleReaction = useCallback(
    async (postId, reactionType) => {
      if (!token) return;
      
      try {
        // Send reaction request
        const res = await fetch(
          `${API_URL}/posts/${postId}/reaction?reaction_type=${reactionType}`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (!res.ok) throw new Error("Failed to add reaction");

        // Find the post's group_id first
        const post = posts.find((p) => p.id === postId);
        if (!post) return;

        // Fetch updated post data
        const updatedPostRes = await fetch(
          `${API_URL}/posts/group/${post.group_id}?post_id=${postId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!updatedPostRes.ok) throw new Error("Failed to fetch updated post");
        
        // Find the specific post in the response array
        const { posts: fetchedPosts } = await updatedPostRes.json();
        const updatedPost = fetchedPosts.find(p => p.id === postId);
        
        if (!updatedPost) {
          console.error("Updated post not found in response");
          return;
        }

        // Update the posts state with the new post data
        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? updatedPost : p))
        );
      } catch (err) {
        console.error("Error adding reaction:", err);
      }
    },
    [token, posts]
  );

  // 7) Delete post: DELETE then remove it from state
  const handleDeletePost = useCallback(
    async (postId) => {
      if (!window.confirm("Delete this post?")) return;
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

  // 8) Add a comment: POST then fetch only that post's updated data
  const handleComment = useCallback(
    async (postId, commentText) => {
      if (!commentText.trim() || !token) return;
      try {
        const formData = new FormData();
        formData.append("text", commentText.trim());

        const res = await fetch(`${API_URL}/posts/${postId}/comment`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!res.ok) throw new Error("Failed to add comment");

        const post = posts.find((p) => p.id === postId);
        if (!post) return;

        const updatedPostRes = await fetch(
          `${API_URL}/posts/group/${post.group_id}?post_id=${postId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!updatedPostRes.ok) throw new Error("Failed to fetch updated post");
        
        // Find the specific post in the response array
        const { posts: fetchedPosts } = await updatedPostRes.json();
        const updatedPost = fetchedPosts.find(p => p.id === postId);
        
        if (!updatedPost) {
          console.error("Updated post not found in response");
          return;
        }

        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? updatedPost : p))
        );
      } catch (err) {
        console.error("Error adding comment:", err);
      }
    },
    [token, posts]
  );

  // 9) Comment reaction: POST then fetch only that post's updated data
  const handleCommentReaction = useCallback(
    async (commentId, type) => {
      if (!token) return;
      try {
        const res = await fetch(
          `${API_URL}/posts/comments/${commentId}/reaction?reaction_type=${type}`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Failed to add comment reaction");

        const post = posts.find((p) =>
          p.comments?.some((c) => c.id === commentId)
        );
        if (!post) return;

        const updatedPostRes = await fetch(
          `${API_URL}/posts/group/${post.group_id}?post_id=${post.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!updatedPostRes.ok) throw new Error("Failed to fetch updated post");
        
        // Find the specific post in the response array
        const { posts: fetchedPosts } = await updatedPostRes.json();
        const updatedPost = fetchedPosts.find(p => p.id === post.id);
        
        if (!updatedPost) {
          console.error("Updated post not found in response");
          return;
        }

        setPosts((prev) =>
          prev.map((p) => (p.id === post.id ? updatedPost : p))
        );
      } catch (err) {
        console.error("Error reacting to comment:", err);
      }
    },
    [token, posts]
  );

  // 10) Delete comment: DELETE then fetch only that post's updated data
  const handleDeleteComment = useCallback(
    async (postId, commentId) => {
      if (!token) return;
      if (!window.confirm("Are you sure you want to delete this comment?")) return;
      try {
        // Find the post and comment to check permissions
        const post = posts.find((p) => p.id === postId);
        if (!post) {
          throw new Error("Post not found");
        }

        const comment = post.comments?.find((c) => c.id === commentId);
        if (!comment) {
          throw new Error("Comment not found");
        }

        // Check if user is comment owner or admin
        const currentUserId = token ? JSON.parse(atob(token.split('.')[1])).id : null;
        const isCommentOwner = comment.user_id === currentUserId;
        const isAdmin = post.userRole === "admin" || (typeof userRole !== 'undefined' && userRole === "admin");
        if (!isCommentOwner && !isAdmin) {
          throw new Error("You don't have permission to delete this comment");
        }

        const res = await fetch(
          `${API_URL}/posts/comment/${commentId}`,
          {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || "Failed to delete comment");
        }

        const updatedPostRes = await fetch(
          `${API_URL}/posts/group/${post.group_id}?post_id=${postId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!updatedPostRes.ok) throw new Error("Failed to fetch updated post");
        const { posts: [updatedPost] } = await updatedPostRes.json();

        setPosts((prev) =>
          prev.map((p) => (p.id === postId ? updatedPost : p))
        );
      } catch (err) {
        console.error("Error deleting comment:", err);
        alert(err.message || "Failed to delete comment. Please try again.");
      }
    },
    [token, posts]
  );

  // Toggle visibility of the comment section for a given post:
  const toggleComments = useCallback((postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  // Format ISO timestamp to dd/mm/yyyy HH:MM:SS
  const formatDate = useCallback((iso) => {
    const d = new Date(iso);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }, []);

  if (isLoading && posts.length === 0) {
    return (
      <div className="wrapper-dashboard">
        <Navbar
          onJoinGroup={handleGroupJoined}
          onLeaveGroup={handleGroupLeft}
        />
        <div className="dashboard-loading">Loading…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrapper-dashboard">
        <Navbar
          onJoinGroup={handleGroupJoined}
          onLeaveGroup={handleGroupLeft}
        />
        <div className="dashboard-error">
          <div className="error-message">{error}</div>
          <button
            className="return-button"
            onClick={() => navigate("/dashboard")}
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
        onJoinGroup={handleGroupJoined}
        onLeaveGroup={handleGroupLeft}
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
                {groups
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((g) => (
                    <div
                      key={g.id}
                      className="group-item"
                      onClick={() => navigate(`/group/${g.name}`)}
                      title={`View ${g.name}`}
                    >
                      <span className="group-name">{g.name}</span>
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
              <>
                <PostFeed
                  posts={posts}
                  groups={groups}
                  onLike={handleReaction}
                  onDislike={handleReaction}
                  onDelete={handleDeletePost}
                  onCommentAdded={handleComment}
                  onCommentReaction={handleCommentReaction}
                  onDeleteComment={handleDeleteComment}
                  currentUserId={currentUserId}
                  showComments={showComments}
                  toggleComments={toggleComments}
                  formatDate={formatDate}
                />
                <div ref={observerTarget} className="observer-target">
                  {isLoading && <div className="loading-more">Loading more posts...</div>}
                </div>
              </>
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
            // Reload only page 1 after creating a post:
            setCurrentPage(1);
            fetchPosts(1);
          }}
        />
      )}
    </div>
  );
};
