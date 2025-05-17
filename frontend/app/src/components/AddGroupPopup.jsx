
import { useState } from "react";
import "./AddGroupPopup.css";

export const AddGroupPopup = ({ closePopup, onGroupCreated }) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const groupData = new FormData();
    groupData.append("name", name);
    groupData.append("description", description);
    groupData.append("public", isPublic);

    const token = localStorage.getItem("access_token");

    if (!token) {
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
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="groupName">Nazwa grupy</label>
          <input
            type="text"
            id="groupName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="groupDescription">Opis</label>
          <textarea
            id="groupDescription"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="groupPublic">
            Publiczna:
            <input
              type="checkbox"
              id="groupPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
          </label>
        </div>

        <button type="submit">Utwórz grupę</button>
      </form>
    </div>
  );
};
