import { useState } from "react";
import "./AddGroupPopup.css";

export const AddGroupPopup = ({ closePopup, onGroupCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const groupData = new FormData();
    groupData.append("name", name);
    groupData.append("description", description);
    groupData.append("public", isPublic);

    const token = localStorage.getItem("access_token");

    if (!token) {
      alert("Please log in");
      return;
    }

    console.log("Token:", token);

    try {
      const response = await fetch("http://localhost:8000/group/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: groupData,
      });

      const data = await response.json();

      if (response.ok) {
        if (onGroupCreated) {
          onGroupCreated({
            id: data.result,
            name,
            description,
            public: isPublic,
          });
        }
        closePopup();
      } else {
        console.error("Error data:", data);
        alert(data.detail || "Wystąpił błąd!");
      }
    } catch (error) {
      console.error("Błąd podczas tworzenia grupy:", error);
      alert("Coś poszło nie tak. Spróbuj ponownie.");
    }
  };

  return (
    <div className="popup">
      <div className="popup-content">
        <h2>Create New Group</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="groupName">Group Name</label>
            <input
              type="text"
              id="groupName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="groupDescription">Description</label>
            <textarea
              id="groupDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                id="groupPublic"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
              />
              Public Group
            </label>
            <small>Public groups can be found and joined by anyone</small>
          </div>

          <div className="button-group">
            <button type="submit" className="submit-button">
              Create Group
            </button>
            <button type="button" className="cancel-button" onClick={closePopup}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
