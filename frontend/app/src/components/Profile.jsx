
import { useState, useEffect } from "react";
import "./profile.css";

export const Profile = () => {
  const [userId, setUserId] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatar, setAvatar] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:8000/user/me", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        if (!res.ok) throw new Error("Nie udało się pobrać danych użytkownika");

        const data = await res.json();
        setUserId(data.id);
        setUsername(data.username);
        setEmail(data.email);
        setAvatar(data.avatar || null);

        localStorage.setItem("user_id", data.id);
        localStorage.setItem("username", data.username);
        localStorage.setItem(`avatar_${data.id}`, data.avatar || "");
      } catch (err) {
        console.error("Błąd pobierania profilu:", err);
      }
    };

    fetchProfile();
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !userId) return;

    const formData = new FormData();
    formData.append("avatar", file);

    fetch(`http://localhost:8000/user/${userId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: formData,
    })
      .then((res) => {
        if (!res.ok) throw new Error("Nie udało się zapisać avatara");

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result;
          setAvatar(base64);
          localStorage.setItem(`avatar_${userId}`, base64);
        };
        reader.readAsDataURL(file);
      })
      .catch((err) => console.error("Błąd zapisu avatara:", err));
  };

  return (
    <div className="profile-container">
      <img
        src={avatar || "/default-avatar.jpg"}
        alt="avatar"
        className="profile-avatar"
      />
      <label className="profile-label" htmlFor="avatar-upload">
        Zmień avatar
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