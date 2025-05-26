import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { AddGroupPopup } from "./AddGroupPopup";
import CreatePostPopup from "./CreatePostPopup";
import "./dashboard.css";

export const Dashboard = () => {
  const [isGroupPopupOpen, setIsGroupPopupOpen] = useState(false);
  const [isPostPopupOpen, setIsPostPopupOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);

  useEffect(() => {
    const fetchGroups = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Brak tokena, proszę się zalogować.");
        return;
      }
      try {
        const response = await fetch("http://localhost:8000/group/mygroups", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error("Błąd podczas pobierania grup");
        }
        const data = await response.json();
        setGroups(data);
      } catch (error) {
        console.error("Fetch groups error:", error);
      }
    };

    fetchGroups();
  }, []);

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
            <button className="add-group" onClick={openGroupPopup}>
              + Utwórz nową grupę
            </button>
            <button className="create-post" onClick={() => openPostPopup()}>
              + Utwórz nowy post
            </button>
          </div>
          
          <h2 className="group-title">Twoje grupy</h2>
          <div className="group-list">
            {[...groups]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((group) => (
                <div key={group.id} className="group-item">
                  <h4>{group.name}</h4>
                </div>
              ))}
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
