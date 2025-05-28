import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import CreatePostPopup from "./CreatePostPopup";
import { AddGroupPopup } from "./AddGroupPopup";
import { Navbar } from "./Navbar";
import { FaCog, FaUserCog } from "react-icons/fa";
import "./GroupPage.css";

const API_URL = "http://localhost:8000";

const GroupPage = () => {
  const { groupName } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("access_token") || "";
  
  // Decode once:
  const currentUserId = useMemo(() => {
    try {
      if (!token) return null;
      const payload = JSON.parse(atob(token.split(".")[1]));
      return payload?.id || null;
    } catch (err) {
      console.error("Error decoding token:", err);
      return null;
    }
  }, [token]);

  // Add isLoggedIn check
  const isLoggedIn = useMemo(() => {
    return !!token && !!currentUserId;
  }, [token, currentUserId]);

  // State with split loading flags
  const [groupData, setGroupData] = useState(location.state?.groupData || null);
  const [isGroupLoading, setIsGroupLoading] = useState(!location.state?.groupData);
  const [posts, setPosts] = useState([]);
  const [isPostsLoading, setIsPostsLoading] = useState(true);
  const [groupMembers, setGroupMembers] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [groups, setGroups] = useState([]);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState({});
  const [showPostPopup, setShowPostPopup] = useState(false);
  const [isGroupPopupOpen, setIsGroupPopupOpen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showComments, setShowComments] = useState({});
  const [showMembershipPopup, setShowMembershipPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const POSTS_PER_PAGE = 5;

  // Memoized fetch functions
  const fetchGroupData = useCallback(async (signal) => {
    if (!groupName) {
      setError("Invalid group name");
      return null;
    }
    try {
      let res = await fetch(`${API_URL}/group/name/${groupName}`, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
      if (!res.ok && !isNaN(parseInt(groupName))) {
        res = await fetch(`${API_URL}/group/${groupName}`, {
          headers: { Authorization: `Bearer ${token}` },
          signal,
        });
      }
      if (!res.ok) {
        if (res.status === 404) {
          setError("Group not found");
          return null;
        }
        if (res.status === 403) {
          setError("You don't have permission to access this group");
          return null;
        }
        throw new Error(`Failed to fetch group: ${res.status}`);
      }
      const data = await res.json();
      setGroupData(data);
      setError(null);
      return data;
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error fetching group:", err);
        setError("Error loading group. Please try again.");
      }
      return null;
    }
  }, [groupName, token]);

  const fetchPosts = useCallback(async (page = 1) => {
    if (!groupData?.id) return;
    setIsPostsLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/posts/group/${groupData.id}?page=${page}&limit=${POSTS_PER_PAGE}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        if (res.status === 403) {
          setPosts([]);
          return;
        }
        throw new Error("Failed to fetch posts");
      }
      const { posts: postsArray = [] } = await res.json();
      setPosts((prev) => (page === 1 ? postsArray : [...prev, ...postsArray]));
      setHasMore(postsArray.length === POSTS_PER_PAGE);
      setCurrentPage(page);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setPosts([]);
    } finally {
      setIsPostsLoading(false);
    }
  }, [groupData?.id, token]);

  const fetchMembers = useCallback(async () => {
    if (!groupData?.id) return;
    try {
      const res = await fetch(`${API_URL}/group/members/${groupData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 404) {
          setGroupMembers([]);
          setUserRole(null);
          return;
        }
        throw new Error("Failed to fetch group members");
      }
      const members = await res.json();
      setGroupMembers(members);
      const currentUser = members.find((m) => m.id === currentUserId);
      setUserRole(currentUser?.role_in_group?.toLowerCase() || null);
    } catch (err) {
      console.error("Error fetching members:", err);
      setGroupMembers([]);
      setUserRole(null);
    }
  }, [groupData?.id, token, currentUserId]);

  // Main effect for initial load
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadGroupAndData = async () => {
      if (!token) {
        navigate("/");
        return;
      }
      if (!groupData) {
        setIsGroupLoading(true);
        const data = await fetchGroupData(controller.signal);
        if (!data || !isMounted) return;
        setIsGroupLoading(false);
      }
      // At this point groupData is guaranteed
      await Promise.all([
        fetchPosts(1),
        fetchMembers()
      ]);
    };

    loadGroupAndData();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [groupName, token, groupData, fetchGroupData, fetchPosts, fetchMembers, navigate]);

  // Periodic refresh for both posts and members
  useEffect(() => {
    if (!groupData?.id) return;
    const interval = setInterval(() => {
      Promise.all([
        fetchPosts(currentPage).catch((err) => 
          console.error("Error refreshing posts:", err)
        ),
        fetchMembers().catch((err) =>
          console.error("Error refreshing members:", err)
        )
      ]);
    }, 30000);
    return () => clearInterval(interval);
  }, [groupData?.id, currentPage, fetchPosts, fetchMembers]);

  // Group list fetch
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const res = await fetch(`${API_URL}/group/mygroups`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to fetch groups");
        setGroups(await res.json());
      } catch (err) {
        console.error("Fetch groups error:", err);
      }
    };
    fetchGroups();
  }, [token]);

  /*** HANDLERS ***/
  const handleGroupClick = async (group) => {
    setPosts([]);
    setGroupMembers([]);
    setUserRole(null);
    setGroupData(null);
    setError(null);
    setShowComments({});
    setNewComment({});
    setCurrentPage(1);
    setHasMore(true);
    navigate(`/group/${group.name}`);
  };

  const handlePostCreated = () => {
    setCurrentPage(1);
    setHasMore(true);
    fetchPosts(1);
  };

  const handleGroupUpdated = async () => {
    const newData = await fetchGroupData();
    if (newData) {
      await Promise.all([fetchPosts(1), fetchMembers()]);
    }
  };

  const handleMemberUpdated = async () => {
    await fetchMembers();
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      // Find the post to check permissions
      const post = posts.find(p => p.id === postId);
      if (!post) {
        throw new Error("Post not found");
      }

      // Check if user is post owner or admin
      const isPostOwner = post.user_id === currentUserId;
      const isAdmin = userRole === "admin";
      
      if (!isPostOwner && !isAdmin) {
        throw new Error("You don't have permission to delete this post");
      }

      const res = await fetch(`${API_URL}/posts/post/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to delete post");
      }

      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch (err) {
      console.error("Error deleting post:", err);
      alert(err.message || "Failed to delete post. Please try again.");
    }
  };

  const handleReaction = async (postId, type) => {
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
      fetchPosts(currentPage);
    } catch (err) {
      console.error("Error adding reaction:", err);
    }
  };

  const toggleComments = (postId) => {
    setShowComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCommentChange = (postId, value) => {
    setNewComment(prev => ({ ...prev, [postId]: value }));
  };

  const handleComment = async (postId) => {
    const text = newComment[postId]?.trim();
    if (!text || !isLoggedIn) return;
    try {
      const formData = new FormData();
      formData.append('text', text);

      const res = await fetch(`${API_URL}/posts/${postId}/comment`, {
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
      
      // Update the posts state to include the new comment
      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: [...(post.comments || []), commentData]
          };
        }
        return post;
      }));

      // Clear the comment input
      setNewComment(prev => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Error adding comment:", err);
      alert(err.message || "Failed to add comment. Please try again.");
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/comment/${commentId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete comment");
      // Refresh the posts to update the comments
      fetchPosts(currentPage);
    } catch (err) {
      console.error("Error deleting comment:", err);
      alert("Failed to delete comment. Please try again.");
    }
  };

  const handleCommentReaction = async (commentId, type) => {
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
      if (!res.ok) throw new Error("Failed to add reaction");
      fetchPosts(currentPage);
    } catch (err) {
      console.error("Error adding reaction:", err);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group?")) return;
    try {
      const res = await fetch(`${API_URL}/group/${groupData.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete group");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error deleting group:", err);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    try {
      const res = await fetch(`${API_URL}/group/${groupData.id}/leave`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to leave group");
      navigate("/dashboard");
    } catch (err) {
      console.error("Error leaving group:", err);
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    try {
      const res = await fetch(
        `${API_URL}/group/${groupData.id}/member/${memberId}/role?role=${newRole}`,
        {
          method: "PUT",
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to update member role");
      }
      await fetchMembers();
    } catch (err) {
      console.error("Error updating member role:", err);
      alert(err.message || "Failed to update member role. Please try again.");
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!window.confirm("Are you sure you want to remove this member?")) return;
    try {
      const res = await fetch(
        `${API_URL}/group/${groupData.id}/member/${memberId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to remove member");
      }
      await fetchMembers();
    } catch (err) {
      console.error("Error removing member:", err);
      alert(err.message || "Failed to remove member. Please try again.");
    }
  };

  /*** MEMOIZED RENDER FUNCTIONS ***/
  const renderPost = useMemo(
    () => (post) => {
      const hasLiked = post.reactions?.some(
        (r) => r.user_id === currentUserId && r.type === "like"
      );
      const hasDisliked = post.reactions?.some(
        (r) => r.user_id === currentUserId && r.type === "dislike"
      );
      const likeCount = post.reactions?.filter((r) => r.type === "like")
        .length;
      const dislikeCount = post.reactions?.filter((r) => r.type === "dislike")
        .length;
      const commentCount = post.comments?.length || 0;

      const isAdmin = userRole === "admin";
      const isPostOwner = post.user_id === currentUserId;
      const canDeletePost = isAdmin || isPostOwner;

      return (
        <div key={post.id} className="post-card">
          <div className="post-header">
            <div>
              <h3>{post.user?.username || "Unknown User"}</h3>
              <small>{new Date(post.created_at).toLocaleString()}</small>
            </div>
            {canDeletePost && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeletePost(post.id);
                }}
                className="delete-button"
                title={isAdmin ? "Delete post (Admin)" : "Delete your post"}
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
              onClick={(e) => {
                e.stopPropagation();
                handleReaction(post.id, "like");
              }}
              className={`reaction-btn like-btn ${hasLiked ? "active" : ""}`}
            >
              👍 {likeCount}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleReaction(post.id, "dislike");
              }}
              className={`reaction-btn dislike-btn ${hasDisliked ? "active" : ""}`}
            >
              👎 {dislikeCount}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleComments(post.id);
              }}
              className={`reaction-btn comment-btn ${showComments[post.id] ? "active" : ""}`}
            >
              💬 {commentCount}
            </button>
          </div>

          <div className="comments-section">
            {showComments[post.id] && (
              <div className="comments-list">
                {post.comments?.map((comment) => (
                  <div key={comment.id} className="comment">
                    <div className="comment-header">
                      <span className="comment-author">
                        {comment.user?.username || "Unknown User"}
                      </span>
                      <span className="comment-time">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="comment-text">{comment.text}</p>
                  </div>
                ))}
                <div className="add-comment">
                  <textarea
                    value={newComment[post.id] || ""}
                    onChange={(e) => handleCommentChange(post.id, e.target.value)}
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
                    disabled={!newComment[post.id]?.trim()}
                  >
                    Comment
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    },
    [currentUserId, userRole, showComments, newComment, handleComment, handleReaction, handleDeletePost]
  );

  const renderSettingsMenu = useMemo(() => {
    const isAdmin = userRole === "admin";
    return (
      <div className="settings-menu">
        {isAdmin && (
          <>
            <button
              onClick={() => {
                setShowSettingsMenu(false);
                setShowMembershipPopup(true);
              }}
              className="settings-menu-item"
            >
              <FaUserCog /> Manage Members
            </button>
            <button
              onClick={() => {
                setShowSettingsMenu(false);
                handleDeleteGroup();
              }}
              className="settings-menu-item delete"
            >
              Delete Group
            </button>
          </>
        )}
        <button
          onClick={() => {
            setShowSettingsMenu(false);
            handleLeaveGroup();
          }}
          className="settings-menu-item leave"
        >
          Leave Group
        </button>
      </div>
    );
  }, [userRole]);

  /*** RENDER ***/
  if (isGroupLoading) {
    return (
      <div className="wrapper-dashboard">
        <Navbar />
        <div className="dashboard-loading">Loading group...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrapper-dashboard">
        <Navbar />
        <div className="dashboard-error">
          <div className="error-message">{error}</div>
          <button onClick={() => navigate("/dashboard")} className="return-button">
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="wrapper-dashboard">
        <Navbar />
        <div className="dashboard-error">
          <div className="error-message">Error: Could not load group data</div>
          <button onClick={() => navigate("/dashboard")} className="return-button">
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
          handleGroupUpdated();
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
              onClick={() => setShowPostPopup(true)}
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
                <button
                  className="create-first-group"
                  onClick={() => setIsGroupPopupOpen(true)}
                >
                  Create your first group
                </button>
              </div>
            ) : (
              <div className="group-list">
                {[...groups]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((group) => (
                    <div
                      key={group.id}
                      className={`group-item ${group.name === groupName ? "active" : ""}`}
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

          <div className="members-section">
            <h2>Group Members</h2>

            <div className="members-category">
              <h3>Owner</h3>
              {groupMembers.find((m) => m.role_in_group === "admin") ? (
                <div className="member-item">
                  <span className="member-name">
                    {groupMembers.find((m) => m.role_in_group === "admin").username}
                  </span>
                  <span className="member-role">Admin</span>
                </div>
              ) : (
                <p className="no-members">No owner assigned</p>
              )}
            </div>

            <div className="members-category">
              <h3>Moderators</h3>
              {groupMembers.filter((m) => m.role_in_group === "moderator").length > 0 ? (
                <div className="members-list">
                  {groupMembers
                    .filter((m) => m.role_in_group === "moderator")
                    .map((mod) => (
                      <div key={mod.id} className="member-item">
                        <span className="member-name">{mod.username}</span>
                        <span className="member-role">Moderator</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="no-members">No moderators assigned</p>
              )}
            </div>

            <div className="members-category">
              <h3>Members</h3>
              {groupMembers.filter((m) => m.role_in_group === "user").length > 0 ? (
                <div className="members-list">
                  {groupMembers
                    .filter((m) => m.role_in_group === "user")
                    .map((member) => (
                      <div key={member.id} className="member-item">
                        <span className="member-name">{member.username}</span>
                        <span className="member-role">Member</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="no-members">No members yet</p>
              )}
            </div>
          </div>
        </div>

        <div className="group-content">
          <div className="group-header">
            <div className="breadcrumb">
              <Link to="/dashboard">Dashboard</Link>
              <span className="separator">/</span>
              <strong>{groupData.name}</strong>
            </div>
            <div className="group-settings">
              <button
                className="settings-button"
                onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                title="Group settings"
              >
                <FaCog />
              </button>
              {showSettingsMenu && renderSettingsMenu}
            </div>
          </div>

          <div className="group-description">
            <h3>About</h3>
            <p>{groupData.description || "No description available."}</p>
          </div>

          <div className="posts-section">
            <h2>{groupData.name} Posts</h2>
            {isPostsLoading && currentPage === 1 ? (
              <div className="posts-loading">
                <div className="loading-spinner"></div>
                <p>Loading posts...</p>
              </div>
            ) : posts.length === 0 ? (
              <div className="no-posts">
                <p>No posts yet.</p>
              </div>
            ) : (
              <>
                <div className="posts-grid">{posts.map(renderPost)}</div>
                {hasMore && (
                  <div className="load-more-container">
                    <button
                      onClick={() => fetchPosts(currentPage + 1)}
                      className="load-more-button"
                      disabled={isPostsLoading}
                    >
                      {isPostsLoading ? "Loading..." : "Load More Posts"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {isGroupPopupOpen && (
        <AddGroupPopup
          closePopup={() => setIsGroupPopupOpen(false)}
          onGroupCreated={(newGroup) => {
            setGroups((prev) => {
              if (prev.some((g) => g.id === newGroup.id)) return prev;
              return [...prev, newGroup];
            });
            handleGroupUpdated();
          }}
        />
      )}

      {showPostPopup && (
        <CreatePostPopup
          defaultGroupId={groupData.id}
          onClose={() => {
            setShowPostPopup(false);
            handlePostCreated();
          }}
        />
      )}

      {showMembershipPopup && (
        <div className="popup-overlay">
          <div className="popup-content membership-popup">
            <div className="popup-header">
              <h2>Manage Group Members</h2>
              <button
                className="close-popup-button"
                onClick={() => {
                  setShowMembershipPopup(false);
                  setShowSettingsMenu(false);
                }}
              >
                ×
              </button>
            </div>
            <div className="membership-list">
              {groupMembers.map((member) => (
                <div key={member.id} className="membership-item">
                  <div className="member-info">
                    <span className="member-name">{member.username}</span>
                    <span className="member-role">{member.role_in_group}</span>
                  </div>
                  {userRole === "admin" && member.role_in_group !== "admin" && (
                    <div className="member-actions">
                      <select
                        className="role-select"
                        value={member.role_in_group}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                      >
                        <option value="user">Member</option>
                        <option value="moderator">Moderator</option>
                      </select>
                      <button
                        className="remove-button"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export { GroupPage };