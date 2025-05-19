import { useState, useEffect } from "react";
import { Navbar } from "./Navbar";
import { AddGroupPopup } from "./AddGroupPopup";
import "./dashboard.css";

export const Dashboard = () => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [groups, setGroups] = useState([]);

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

  const openPopup = () => setIsPopupOpen(true);
  const closePopup = () => setIsPopupOpen(false);

  const handleGroupCreated = (newGroup) => {
    setGroups((prev) => [...prev, newGroup]);
  };

  return (
    <div className="wrapper-dashboard">
      <Navbar />
      <button className="add-group" onClick={openPopup}>
        + Utwórz nową grupę
      </button>

      {isPopupOpen && (
        <AddGroupPopup
          closePopup={closePopup}
          onGroupCreated={handleGroupCreated}
        />
      )}

      {/* <div className="group-list">
        {groups.map((group) => (
          <div key={group.id} className="group-item">
            <h3>{group.name}</h3>
            <p>{group.description}</p>
          </div>
        ))}
      </div> */}
      <div className="dashboard-container">
        <div className="sidebar">
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
    </div>
  );
};
