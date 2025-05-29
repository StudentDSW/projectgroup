import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "./Navbar";
import "./profile.css";

const API_URL = "http://localhost:8000";

export const Profile = () => {
  const navigate = useNavigate();
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

  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(null);
  const [groups, setGroups] = useState([]);

  const getAvatarUrl = (avatarData) => {
    if (!avatarData) return "/default-avatar.jpg";
    if (avatarData.startsWith("data:image")) {
      return avatarData;
    }
    if (avatarData.startsWith("http")) {
      return avatarData;
    }
    if (avatarData.match(/^[A-Za-z0-9+/=]+$/)) {
      return `data:image/png;base64,${avatarData}`;
    }
    return "/default-avatar.jpg";
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/user/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch user data");

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
        if (!res.ok) throw new Error("Failed to fetch groups");
        setGroups(await res.json());
      } catch (err) {
        console.error("Fetch groups error:", err);
      }
    };

    if (token) {
      fetchProfile();
      fetchGroups();
    } else {
      navigate("/");
    }
  }, [token, navigate]);

  // Add event listener for avatar changes
  useEffect(() => {
    const handleAvatarChange = (event) => {
      setAvatar(event.detail.avatar);
    };

    window.addEventListener('avatarChanged', handleAvatarChange);
    return () => {
      window.removeEventListener('avatarChanged', handleAvatarChange);
    };
  }, []);

  const handleGroupClick = (group) => {
    navigate(`/group/${group.name}`);
  };

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
            <div className="breadcrumb">
              <span>Profile</span>
            </div>
          </div>

          <div className="profile-container">
            <img
              src={avatar}
              alt="avatar"
              className="profile-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/default-avatar.jpg";
              }}
            />
            <div className="profile-username">{username}</div>
            <div className="profile-email">{email}</div>
          </div>
        </div>
      </div>
    </div>
  );
};