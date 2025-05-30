import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import PostFeed from "./PostFeed";
import "./profile.css";

const API_URL = "http://localhost:8000";

export const Profile = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token") || "";
  
  const currentUserId = useMemo(() => {
    if (!token) return null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload?.id || null;
    } catch (err) {
      console.error("Error decoding token:", err);
      return null;
    }
  }, [token]);

  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [groups, setGroups] = useState([]);
  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  // Unified post update function
  const updatePostInState = useCallback(async (postId) => {
    try {
      // Find the post to get group ID
      const post = allPosts.find(p => p.id === postId);
      if (!post) return;
      
      const res = await fetch(
        `${API_URL}/posts/group/${post.group_id}?post_id=${postId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (!res.ok) throw new Error("Failed to fetch updated post");
      
      const { posts: fetchedPosts } = await res.json();
      const updatedPost = fetchedPosts.find(p => p.id === postId);
      
      if (!updatedPost) return;
      
      setAllPosts(prev => 
        prev.map(p => p.id === postId ? updatedPost : p)
      );
    } catch (err) {
      console.error("Error updating post:", err);
    }
  }, [allPosts, token]);

  // Derived posts based on active tab
  const filteredPosts = useMemo(() => {
    switch (activeTab) {
      case "posts":
        return allPosts.filter(p => p.user_id === currentUserId);
      case "comments":
        return allPosts.filter(p => 
          p.comments?.some(c => c.user_id === currentUserId)
        );
      case "likes":
        return allPosts.filter(p => 
          p.reactions?.some(r => 
            r.user_id === currentUserId && r.type === "like"
          )
        );
      case "dislikes":
        return allPosts.filter(p => 
          p.reactions?.some(r => 
            r.user_id === currentUserId && r.type === "dislike"
          )
        );
      default:
        return allPosts;
    }
  }, [allPosts, activeTab, currentUserId]);

  const getAvatarUrl = (avatarData) => {
    if (!avatarData) return "/default-avatar.jpg";
    if (avatarData.startsWith("data:image")) return avatarData;
    if (avatarData.startsWith("http")) return avatarData;
    if (/^[A-Za-z0-9+/=]+$/.test(avatarData)) {
      return `data:image/png;base64,${avatarData}`;
    }
    return "/default-avatar.jpg";
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch user data");
      }
      const data = await res.json();
      setUserId(data.id);
      setUsername(data.username);
      setEmail(data.email);
      setAvatar(getAvatarUrl(data.avatar));

      localStorage.setItem("user_id", data.id);
      localStorage.setItem("username", data.username);
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await fetch(`${API_URL}/group/mygroups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch groups");
      }
      setGroups(await res.json());
    } catch (err) {
      console.error("Fetch groups error:", err);
    }
  };

  const fetchUserContent = useCallback(async (userId) => {
    if (!token || !userId) return;
    
    try {
      // Get user's groups
      const groupsRes = await fetch(`${API_URL}/group/mygroups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!groupsRes.ok) throw new Error("Failed to fetch groups");
      const groups = await groupsRes.json();
      
      // Collect all posts from these groups
      const allPosts = [];
      for (const group of groups) {
        const postsRes = await fetch(`${API_URL}/posts/group/${group.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!postsRes.ok) continue;

        const { posts } = await postsRes.json();
        const withDetails = posts.map(p => ({
          ...p,
          reactions: Array.isArray(p.reactions) ? p.reactions : [],
          comments: Array.isArray(p.comments) ? p.comments : [],
          user: p.user || { username: "Unknown", avatar: null }
        }));
        allPosts.push(...withDetails);
      }

      // Deduplicate posts
      const uniquePosts = Array.from(
        new Map(allPosts.map(post => [post.id, post])).values()
      );
      
      setAllPosts(uniquePosts);
    } catch (err) {
      console.error("Error fetching user content:", err);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/");
      return;
    }

    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchProfile(),
        fetchGroups(),
        currentUserId && fetchUserContent(currentUserId)
      ]);
      setLoading(false);
    };

    loadAll();
  }, [token, navigate, currentUserId, fetchUserContent]);

  useEffect(() => {
    const handleAvatarChange = (event) => {
      setAvatar(event.detail.avatar);
    };
    window.addEventListener("avatarChanged", handleAvatarChange);
    return () => {
      window.removeEventListener("avatarChanged", handleAvatarChange);
    };
  }, []);

  const handleGroupClick = (group) => {
    navigate(`/group/${group.name}`);
  };

  const handleReaction = useCallback(
    async (postId, type) => {
      try {
        const res = await fetch(
          `${API_URL}/posts/${postId}/reaction?reaction_type=${type}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) throw new Error("Failed to add reaction");
        
        await updatePostInState(postId);
      } catch (err) {
        console.error("Error handling reaction:", err);
      }
    },
    [token, updatePostInState]
  );

  const handleComment = useCallback(
    async (postId, commentText) => {
      if (!commentText?.trim()) return;
      
      try {
        const formData = new FormData();
        formData.append('text', commentText.trim());

        const res = await fetch(`${API_URL}/posts/${postId}/comment`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!res.ok) throw new Error("Failed to add comment");

        await updatePostInState(postId);
      } catch (err) {
        console.error("Error adding comment:", err);
      }
    },
    [token, updatePostInState]
  );

  const handleDeletePost = useCallback(
    async (postId) => {
      if (!window.confirm("Are you sure you want to delete this post?")) return;
      
      try {
        const res = await fetch(`${API_URL}/posts/post/${postId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to delete post");

        setAllPosts(prev => prev.filter(p => p.id !== postId));
      } catch (err) {
        console.error("Error deleting post:", err);
        alert("Failed to delete post. Please try again.");
      }
    },
    [token]
  );

  const handleDeleteComment = useCallback(
    async (postId, commentId) => {
      if (!window.confirm("Are you sure you want to delete this comment?")) return;
      
      try {
        const post = allPosts.find(p => p.id === postId);
        if (!post) {
          throw new Error("Post not found");
        }

        const comment = post.comments?.find(c => c.id === commentId);
        if (!comment) {
          throw new Error("Comment not found");
        }

        if (comment.user_id !== currentUserId) {
          throw new Error("You don't have permission to delete this comment");
        }

        const res = await fetch(`${API_URL}/posts/comment/${commentId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.detail || "Failed to delete comment");
        }

        await updatePostInState(postId);
      } catch (err) {
        console.error("Error deleting comment:", err);
        alert(err.message || "Failed to delete comment. Please try again.");
      }
    },
    [token, allPosts, currentUserId, updatePostInState]
  );

  const handleCommentReaction = useCallback(
    async (commentId, type) => {
      try {
        const res = await fetch(
          `${API_URL}/posts/comments/${commentId}/reaction?reaction_type=${type}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!res.ok) throw new Error("Failed to add comment reaction");

        const post = allPosts.find(p => p.comments?.some(c => c.id === commentId));
        if (!post) return;

        await updatePostInState(post.id);
      } catch (err) {
        console.error("Error adding comment reaction:", err);
      }
    },
    [token, allPosts, updatePostInState]
  );

  if (loading) {
    return (
      <div className="wrapper-dashboard">
        <Navbar />
        <div className="dashboard-container">
          <div className="group-content">
            <div style={{ textAlign: "center", padding: 32 }}>Loading…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="wrapper-dashboard">
      <Navbar />

      <div className="dashboard-container">
        <div className="sidebar">
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

        <div className="group-content">
          <div className="group-header">
            <div className="profile-info">
              <img
                src={avatar}
                alt="avatar"
                className="profile-avatar"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = "/default-avatar.jpg";
                }}
              />
              <div className="profile-details">
                <div className="profile-username">{username}</div>
                <div className="profile-email">{email}</div>
              </div>
            </div>
          </div>

          <div className="profile-container">
            <h2 className="profile-header">Account Activity</h2>
            <div className="profile-tabs">
              <button
                className={activeTab === 'posts' ? 'profile-tab active' : 'profile-tab'}
                onClick={() => setActiveTab('posts')}
              >
                My Posts
              </button>
              <button
                className={activeTab === 'comments' ? 'profile-tab active' : 'profile-tab'}
                onClick={() => setActiveTab('comments')}
              >
                My Comments
              </button>
              <button
                className={activeTab === 'likes' ? 'profile-tab active' : 'profile-tab'}
                onClick={() => setActiveTab('likes')}
              >
                My Likes
              </button>
              <button
                className={activeTab === 'dislikes' ? 'profile-tab active' : 'profile-tab'}
                onClick={() => setActiveTab('dislikes')}
              >
                My Dislikes
              </button>
            </div>

            <div className="profile-content">
              <PostFeed
                posts={filteredPosts}
                groups={groups}
                onLike={handleReaction}
                onDislike={handleReaction}
                onDelete={handleDeletePost}
                userRole="user"
                onCommentAdded={handleComment}
                onCommentReaction={handleCommentReaction}
                onDeleteComment={handleDeleteComment}
                currentUserId={currentUserId}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};