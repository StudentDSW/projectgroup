import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { AddGroupPopup } from "./AddGroupPopup";
import CreatePostPopup from "./CreatePostPopup";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

export const Dashboard = () => {
  const [isGroupPopupOpen, setIsGroupPopupOpen] = useState(false);
  const [isPostPopupOpen, setIsPostPopupOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Please log in to continue.");
        navigate("/");
        return;
      }

      setIsLoading(true);
      setError(null);

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
        setError("Failed to load groups. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
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
  };

  const handleGroupClick = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  if (isLoading) {
    return (
      <div className="wrapper-dashboard">
        <Navbar />
        <div className="dashboard-loading">
          Loading your groups...
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
            onClick={() => window.location.reload()}
            className="retry-button"
          >
            Retry
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
                      className="group-item"
                      onClick={() => handleGroupClick(group.id)}
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
          <div className="welcome-message">
            <h1>Welcome to Your Dashboard</h1>
            <p>Select a group from the sidebar to view its content, or create a new group to get started.</p>
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
          onClose={closePostPopup}
          defaultGroupId={selectedGroupId}
        />
      )}
    </div>
  );
};
