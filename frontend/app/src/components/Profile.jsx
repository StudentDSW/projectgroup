import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import PostFeed from "./PostFeed";
import "./profile.css";

const API_URL = "http://localhost:8000";

export const Profile = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token") || "";
  
  // Decode once:
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
  const [myPosts, setMyPosts] = useState([]);
  const [commentedPosts, setCommentedPosts] = useState([]);
  const [likedPosts, setLikedPosts] = useState([]);
  const [dislikedPosts, setDislikedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("posts");

  const getAvatarUrl = (avatarData) => {
    if (!avatarData) return "/default-avatar.jpg";
    if (avatarData.startsWith("data:image")) {
      return avatarData;
    }
    if (avatarData.startsWith("http")) {
      return avatarData;
    }
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

  const fetchUserContent = async (userId) => {
    if (!token || !userId) return;
    
    try {
      // 1) get this user's groups
      const groupsRes = await fetch(`${API_URL}/group/mygroups`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!groupsRes.ok) throw new Error("Failed to fetch groups");
      const groups = await groupsRes.json();
      
      // 2) collect all posts+reactions+comments in those groups
      const allPosts = [];
      for (const group of groups) {
        const postsRes = await fetch(`${API_URL}/posts/group/${group.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!postsRes.ok) continue;

        const { posts } = await postsRes.json();
        // Ensure each post has the full data structure
        const withDetails = posts.map(p => ({
          ...p,
          reactions: Array.isArray(p.reactions) ? p.reactions : [],
          comments: Array.isArray(p.comments) ? p.comments : [],
          user: p.user || { username: "Unknown", avatar: null }
        }));
        allPosts.push(...withDetails);
      }

      // 3) Filter into four separate arrays with proper data structure
      setMyPosts(
        allPosts
          .filter(p => p.user_id === userId)
          .map(p => ({ ...p }))
      );

      setCommentedPosts(
        allPosts
          .filter(p => p.comments.some(c => c.user_id === userId))
          .map(p => ({ ...p }))
      );

      setLikedPosts(
        allPosts
          .filter(p => p.reactions.some(r => r.user_id === userId && r.type === "like"))
          .map(p => ({ ...p }))
      );

      setDislikedPosts(
        allPosts
          .filter(p => p.reactions.some(r => r.user_id === userId && r.type === "dislike"))
          .map(p => ({ ...p }))
      );

    } catch (err) {
      console.error("Error fetching user content:", err);
    }
  };

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
  }, [token, navigate, currentUserId]);

  // Update avatar if some global "avatarChanged" event is dispatched
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

  const handleReaction = async (postId, type, responseData) => {
    if (!token) {
      console.error("No token available");
      return;
    }

    try {
      // Find the post in our lists to get its group ID
      const allPosts = [...myPosts, ...commentedPosts, ...likedPosts, ...dislikedPosts];
      const post = allPosts.find(p => p.id === postId);
      if (!post) return;

      // Fetch the updated post from the database using the group ID
      const updatedPostRes = await fetch(`${API_URL}/posts/group/${post.group_id}?post_id=${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!updatedPostRes.ok) throw new Error("Failed to fetch updated post");
      const { posts: [updatedPost] } = await updatedPostRes.json();

      // Update all lists with the fresh data from the database
      const updatePostInList = (list, setList) => {
        setList(prev => prev.map(p => p.id === postId ? updatedPost : p));
      };

      // Update all lists with the fresh data
      updatePostInList(myPosts, setMyPosts);
      updatePostInList(commentedPosts, setCommentedPosts);
      updatePostInList(likedPosts, setLikedPosts);
      updatePostInList(dislikedPosts, setDislikedPosts);

      // Refresh the lists based on the updated post data
      const hasLiked = updatedPost.reactions?.some(r => r.user_id === currentUserId && r.type === 'like');
      const hasDisliked = updatedPost.reactions?.some(r => r.user_id === currentUserId && r.type === 'dislike');
      const isOwnPost = updatedPost.user_id === currentUserId;
      const hasCommented = updatedPost.comments?.some(c => c.user_id === currentUserId);

      // Update liked posts list
      setLikedPosts(prev => {
        if (hasLiked) {
          return prev.some(p => p.id === postId) ? prev : [...prev, updatedPost];
        }
        return prev.filter(p => p.id !== postId);
      });

      // Update disliked posts list
      setDislikedPosts(prev => {
        if (hasDisliked) {
          return prev.some(p => p.id === postId) ? prev : [...prev, updatedPost];
        }
        return prev.filter(p => p.id !== postId);
      });

      // Update my posts list
      setMyPosts(prev => {
        if (isOwnPost) {
          return prev.some(p => p.id === postId) ? prev : [...prev, updatedPost];
        }
        return prev.filter(p => p.id !== postId);
      });

      // Update commented posts list
      setCommentedPosts(prev => {
        if (hasCommented) {
          return prev.some(p => p.id === postId) ? prev : [...prev, updatedPost];
        }
        return prev.filter(p => p.id !== postId);
      });

    } catch (err) {
      console.error("Error handling reaction:", err);
      alert("Failed to update reaction. Please try again.");
    }
  };

  const handleComment = async (postId, commentText) => {
    if (!commentText?.trim()) return;
    
    try {
      // Send comment to database
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

      // Find the post in our lists to get its group ID
      const allPosts = [...myPosts, ...commentedPosts, ...likedPosts, ...dislikedPosts];
      const post = allPosts.find(p => p.id === postId);
      if (!post) return;

      // Fetch the updated post from the database using the group ID
      const updatedPostRes = await fetch(`${API_URL}/posts/group/${post.group_id}?post_id=${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!updatedPostRes.ok) throw new Error("Failed to fetch updated post");
      const { posts: [updatedPost] } = await updatedPostRes.json();

      // Update all lists with the fresh data
      const updatePostInList = (list, setList) => {
        setList(prev => prev.map(p => p.id === postId ? updatedPost : p));
      };

      updatePostInList(myPosts, setMyPosts);
      updatePostInList(commentedPosts, setCommentedPosts);
      updatePostInList(likedPosts, setLikedPosts);
      updatePostInList(dislikedPosts, setDislikedPosts);

      // Ensure post is in commented posts list if user has commented
      const hasCommented = updatedPost.comments?.some(c => c.user_id === currentUserId);
      if (hasCommented) {
        setCommentedPosts(prev => {
          if (!prev.some(p => p.id === postId)) {
            return [...prev, updatedPost];
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Error adding comment:", err);
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      const res = await fetch(`${API_URL}/posts/post/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete post");

      // Remove the post from all lists
      const removePost = (list, setList) => {
        setList(prev => prev.filter(post => post.id !== postId));
      };

      removePost(myPosts, setMyPosts);
      removePost(commentedPosts, setCommentedPosts);
      removePost(likedPosts, setLikedPosts);
      removePost(dislikedPosts, setDislikedPosts);
    } catch (err) {
      console.error("Error deleting post:", err);
      alert("Failed to delete post. Please try again.");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comment/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete comment");

      // Remove the comment from the post in all lists
      const removeComment = (list, setList) => {
        setList(prev => prev.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              comments: post.comments.filter(comment => comment.id !== commentId)
            };
          }
          return post;
        }));
      };

      // Update post in all lists
      removeComment(myPosts, setMyPosts);
      removeComment(commentedPosts, setCommentedPosts);
      removeComment(likedPosts, setLikedPosts);
      removeComment(dislikedPosts, setDislikedPosts);

      // Check if post should be removed from commented posts
      const post = [...myPosts, ...commentedPosts, ...likedPosts, ...dislikedPosts]
        .find(p => p.id === postId);
      
      if (post) {
        const hasOtherComments = post.comments?.some(c => c.user_id === currentUserId && c.id !== commentId);
        if (!hasOtherComments) {
          setCommentedPosts(prev => prev.filter(p => p.id !== postId));
        }
      }
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Failed to delete comment. Please try again.");
    }
  };

  const handleCommentReaction = async (commentId, type) => {
    try {
      // Send comment reaction to database
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

      // Find the post containing this comment
      const allPosts = [...myPosts, ...commentedPosts, ...likedPosts, ...dislikedPosts];
      const post = allPosts.find(p => p.comments?.some(c => c.id === commentId));
      if (!post) return;

      // Fetch the updated post from the database using the group ID
      const updatedPostRes = await fetch(`${API_URL}/posts/group/${post.group_id}?post_id=${post.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!updatedPostRes.ok) throw new Error("Failed to fetch updated post");
      const { posts: [updatedPost] } = await updatedPostRes.json();

      // Update all lists with the fresh data
      const updatePostInList = (list, setList) => {
        setList(prev => prev.map(p => p.id === post.id ? updatedPost : p));
      };

      updatePostInList(myPosts, setMyPosts);
      updatePostInList(commentedPosts, setCommentedPosts);
      updatePostInList(likedPosts, setLikedPosts);
      updatePostInList(dislikedPosts, setDislikedPosts);
    } catch (err) {
      console.error("Error adding comment reaction:", err);
    }
  };

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
            {/* Menu Tabs */}
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

            {/* Tab Content */}
            <div className="profile-content">
              {activeTab === 'posts' && (
                <PostFeed
                  posts={myPosts}
                  groups={groups}
                  onLike={handleReaction}
                  onDelete={handleDeletePost}
                  userRole="user"
                  onCommentAdded={handleComment}
                  onCommentReaction={handleCommentReaction}
                  onDeleteComment={handleDeleteComment}
                  currentUserId={currentUserId}
                />
              )}
              {activeTab === 'comments' && (
                <PostFeed
                  posts={commentedPosts}
                  groups={groups}
                  onLike={handleReaction}
                  onDelete={handleDeletePost}
                  userRole="user"
                  onCommentAdded={handleComment}
                  onCommentReaction={handleCommentReaction}
                  onDeleteComment={handleDeleteComment}
                  currentUserId={currentUserId}
                />
              )}
              {activeTab === 'likes' && (
                <PostFeed
                  posts={likedPosts}
                  groups={groups}
                  onLike={handleReaction}
                  onDelete={handleDeletePost}
                  userRole="user"
                  onCommentAdded={handleComment}
                  onCommentReaction={handleCommentReaction}
                  onDeleteComment={handleDeleteComment}
                  currentUserId={currentUserId}
                />
              )}
              {activeTab === 'dislikes' && (
                <PostFeed
                  posts={dislikedPosts}
                  groups={groups}
                  onLike={handleReaction}
                  onDelete={handleDeletePost}
                  userRole="user"
                  onCommentAdded={handleComment}
                  onCommentReaction={handleCommentReaction}
                  onDeleteComment={handleDeleteComment}
                  currentUserId={currentUserId}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};