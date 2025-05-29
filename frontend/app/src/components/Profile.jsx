import { useState, useEffect } from "react";
import "./profile.css";

const API_URL = "http://localhost:8000";

export const Profile = () => {
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`${API_URL}/user/me`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        if (!res.ok) throw new Error("Failed to fetch user data");

        const data = await res.json();
        setUserId(data.id);
        setUsername(data.username);
        setEmail(data.email);
        setAvatar(data.avatar ? `${API_URL}/user/avatar/${data.id}` : null);

        localStorage.setItem("user_id", data.id);
        localStorage.setItem("username", data.username);
      } catch (err) {
        console.error("Error fetching profile:", err);
      }
    };

    fetchProfile();
  }, []);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file || !userId) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch(`${API_URL}/user/${userId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to save avatar");

      // Update avatar URL after successful upload
      setAvatar(`${API_URL}/user/avatar/${userId}?t=${Date.now()}`);
    } catch (err) {
      console.error("Error saving avatar:", err);
      alert("Failed to update avatar. Please try again.");
    }
  };

  return (
    <div className="profile-container">
      <img
        src={avatar || "/default-avatar.jpg"}
        alt="avatar"
        className="profile-avatar"
      />
      <label className="profile-label" htmlFor="avatar-upload">
        Change Avatar
      </label>
      <input
        id="avatar-upload"
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="profile-file-input"
      />
      <div className="profile-username">{username}</div>
      <div className="profile-email">{email}</div>
    </div>
  );
};