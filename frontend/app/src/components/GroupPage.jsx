import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import CreatePostPopup from "./CreatePostPopup";
import { AddGroupPopup } from "./AddGroupPopup";
import { Navbar } from "./Navbar";
import { FaCog } from "react-icons/fa";
import "./GroupPage.css";

const GroupPage = () => {
  const { groupName } = useParams();
  const [groupData, setGroupData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [showPostPopup, setShowPostPopup] = useState(false);
  const [isGroupPopupOpen, setIsGroupPopupOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [error, setError] = useState(null);
  const [newComment, setNewComment] = useState({});
  const [groups, setGroups] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const token = localStorage.getItem("access_token");
  const navigate = useNavigate();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  const fetchGroupData = async () => {
    try {
      if (!groupName) {
        setError("Invalid group name");
        return;
      }

      // Try to fetch by name first
      let res = await fetch(`http://localhost:8000/group/name/${groupName}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // If not found by name, try to fetch by ID
      if (!res.ok && !isNaN(parseInt(groupName))) {
        res = await fetch(`http://localhost:8000/group/${groupName}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      
      if (!res.ok) {
        if (res.status === 404) {
          setError("Group not found");
          return;
        }
        if (res.status === 403) {
          setError("You don't have permission to access this group");
          return;
        }
        throw new Error(`Failed to fetch group: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      setGroupData(data);
      setError(null);
    } catch (error) {
      console.error("Error fetching group:", error);
      setError("Error loading group. Please try again.");
    }
  };

  const fetchUserRole = async () => {
    try {
      if (!groupData?.id) return;

      const res = await fetch(`http://localhost:8000/group/members/${groupData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 404) {
          setUserRole(null);
          return;
        }
        throw new Error("Failed to fetch members");
      }
      
      const members = await res.json();
      const currentUserId = JSON.parse(atob(token.split('.')[1])).id;
      const currentUser = members.find(member => member.id === currentUserId);
      setUserRole(currentUser?.role_in_group || null);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
    }
  };

  const fetchPosts = async () => {
    try {
      if (!groupData?.id) {
        console.log("No group ID available for fetching posts");
        return;
      }

      console.log("Fetching posts for group:", groupData.id);
      const res = await fetch(`http://localhost:8000/posts/group/${groupData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          setPosts([]);
          return;
        }
        throw new Error("Failed to fetch posts");
      }
      
      const data = await res.json();
      console.log("Fetched posts:", data);
      setPosts(data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error("Error fetching posts:", error);
      setPosts([]);
    }
  };

  const fetchGroupMembers = async () => {
    try {
      if (!groupData?.id) {
        console.log("No group ID available for fetching members");
        return;
      }

      console.log("Fetching members for group:", groupData.id);
      const response = await fetch(`http://localhost:8000/group/members/${groupData.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch group members");
      }
      
      const members = await response.json();
      console.log("Fetched members:", members);
      setGroupMembers(members);
    } catch (error) {
      console.error("Error fetching group members:", error);
      setGroupMembers([]);
    }
  };

  const handleLeaveGroup = async () => {
    if (!window.confirm("Are you sure you want to leave this group?")) return;
    
    try {
      const res = await fetch(`http://localhost:8000/group/leave/${groupData.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 404) {
          alert("You are not a member of this group.");
          return;
        }
        throw new Error("Failed to leave group");
      }
      navigate("/dashboard");
    } catch (error) {
      console.error("Error leaving group:", error);
      alert("Failed to leave group. Please try again.");
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) return;
    
    try {
      const res = await fetch(`http://localhost:8000/group/${groupData.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete group");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error deleting group:", error);
      alert("Failed to delete group");
    }
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    
    try {
      const res = await fetch(`http://localhost:8000/posts/post/${postId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete post");
      fetchPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post");
    }
  };

  const handleLike = async (postId) => {
    try {
      const formData = new FormData();
      formData.append('reaction_type', 'like');

      const res = await fetch(`http://localhost:8000/posts/${postId}/reaction`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) throw new Error("Failed to like post");
      fetchPosts();
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleComment = async (postId) => {
    if (!newComment[postId]?.trim()) return;

    try {
      const formData = new FormData();
      formData.append('text', newComment[postId]);

      const res = await fetch(`http://localhost:8000/posts/${postId}/comment`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (!res.ok) throw new Error("Failed to add comment");
      setNewComment(prev => ({ ...prev, [postId]: '' }));
      fetchPosts();
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handlePostCreated = () => {
    console.log("Post created, refreshing posts");
    fetchPosts();
  };

  const handleGroupUpdated = () => {
    fetchGroupData();
    fetchGroupMembers();
  };

  const handleMemberUpdated = () => {
    fetchGroupMembers();
    fetchUserRole();
  };

  useEffect(() => {
    const loadData = async () => {
      if (!token) {
        alert("Please log in");
        navigate("/");
        return;
      }

      setIsLoading(true);
      setError(null);
      
      try {
        // First fetch group data
        await fetchGroupData();
        
        // Only proceed with other fetches if we have group data
        if (groupData?.id) {
          await Promise.all([
            fetchPosts(),
            fetchUserRole(),
            fetchGroupMembers()
          ]);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        setError("Error loading group data");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [groupName, token, navigate]);

  // Add a useEffect to handle groupData changes
  useEffect(() => {
    if (groupData?.id) {
      console.log("Group data updated, fetching data for group:", groupData.id);
      Promise.all([
        fetchPosts(),
        fetchGroupMembers()
      ]);
    }
  }, [groupData]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await fetch("http://localhost:8000/group/mygroups", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Failed to fetch groups");
        }
        const data = await response.json();
        setGroups(data);
      } catch (error) {
        console.error("Fetch groups error:", error);
      }
    };

    fetchGroups();
  }, [token]);

  const openGroupPopup = () => setIsGroupPopupOpen(true);
  const closeGroupPopup = () => setIsGroupPopupOpen(false);

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [...prev, newGroup]);
    handleGroupUpdated();
  };

  const handleGroupClick = (group) => {
    navigate(`/group/${group.name}`);
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

  if (!groupData) {
    return (
      <div className="wrapper-dashboard">
        <Navbar />
        <div className="dashboard-error">
          <div className="error-message">Error: Could not load group data</div>
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

  const renderPost = (post) => {
    const currentUserId = JSON.parse(atob(token.split('.')[1])).id;
    const hasLiked = post.reactions?.some(r => r.user_id === currentUserId && r.type === 'like');
    const likeCount = post.reactions?.filter(r => r.type === 'like').length || 0;
    const commentCount = post.comments?.length || 0;

    return (
      <div key={post.id} className="post-card">
        <div className="post-header">
          <div>
            <h3>{post.title || "Post"}</h3>
            <small>Posted by {post.user?.username || "Unknown User"}</small>
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
        <p className="post-content">{post.content}</p>
        {post.image && (
          <img 
            src={post.image}
            alt="Post" 
            className="post-image"
          />
        )}
        
        <div className="post-actions">
          <button
            onClick={() => handleLike(post.id)}
            className={`like-button ${hasLiked ? 'liked' : ''}`}
          >
            👍 {likeCount}
          </button>
          <span className="comment-count">💬 {commentCount}</span>
        </div>

        <div className="comments-section">
          <h4>Comments</h4>
          {post.comments?.map(comment => (
            <div key={comment.id} className="comment">
              <strong>{comment.user?.username || "Unknown User"}:</strong> {comment.text}
              <div className="comment-time">
                {new Date(comment.created_at).toLocaleString()}
              </div>
            </div>
          ))}
          
          <div className="add-comment">
            <textarea
              value={newComment[post.id] || ''}
              onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
              placeholder="Write a comment..."
              className="comment-input"
            />
            <button
              onClick={() => handleComment(post.id)}
              className="comment-button"
            >
              Comment
            </button>
          </div>
        </div>

        <div className="post-time">
          Posted on {new Date(post.created_at).toLocaleString()}
        </div>
      </div>
    );
  };

  const renderMembersSection = () => {
    console.log("Rendering members section with:", groupMembers);
    // Sort members by role
    const owner = groupMembers.find(member => member.role_in_group === "admin");
    const moderators = groupMembers.filter(member => member.role_in_group === "moderator");
    const members = groupMembers.filter(member => member.role_in_group === "user");

    return (
      <div className="members-section">
        <h2>Group Members</h2>
        
        <div className="members-category">
          <h3>Owner</h3>
          {owner ? (
            <div className="member-item">
              <span className="member-name">{owner.username}</span>
              <span className="member-role">Admin</span>
            </div>
          ) : (
            <p className="no-members">No owner assigned</p>
          )}
        </div>

        <div className="members-category">
          <h3>Moderators</h3>
          {moderators.length > 0 ? (
            <div className="members-list">
              {moderators.map((mod) => (
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
          {members.length > 0 ? (
            <div className="members-list">
              {members.map((member) => (
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
    );
  };

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
              onClick={openGroupPopup}
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
                  onClick={openGroupPopup}
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
                      className={`group-item ${group.name === groupName ? 'active' : ''}`}
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
              {showSettingsMenu && (
                <div className="settings-menu">
                  {userRole === "admin" && (
                    <button 
                      onClick={() => {
                        setShowSettingsMenu(false);
                        handleDeleteGroup();
                      }}
                      className="settings-menu-item delete"
                    >
                      Delete Group
                    </button>
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
              )}
            </div>
          </div>

          <div className="posts-section">
            <h2>{groupData.name} Posts ({posts.length})</h2>
            {posts.length === 0 ? (
              <div className="no-posts">
                <p>No posts yet.</p>
              </div>
            ) : (
              <div className="posts-grid">
                {posts.map(renderPost)}
              </div>
            )}
          </div>
        </div>

        <div className="right-sidebar">
          {renderMembersSection()}
        </div>
      </div>

      {isGroupPopupOpen && (
        <AddGroupPopup
          closePopup={closeGroupPopup}
          onGroupCreated={handleGroupCreated}
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
    </div>
  );
};

export default GroupPage; 