import { useState, useEffect } from "react";
import "./CreatePostPopup.css";

const CreatePostPopup = ({ defaultGroupId, onClose }) => {
  const [content, setContent] = useState("");
  const [groupId, setGroupId] = useState(null);
  const [groups, setGroups] = useState([]);
  const [image, setImage] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("Please log in");
          return;
        }
        const res = await fetch("http://localhost:8000/group/mygroups", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Failed to fetch groups");
        const data = await res.json();
        setGroups(data || []);
        
        // Set the default group ID if provided
        if (defaultGroupId) {
          setGroupId(defaultGroupId.toString());
        } else if (data.length > 0) {
          setGroupId(data[0].id.toString());
        }
      } catch (err) {
        console.error("Failed to load groups:", err);
        setError("Failed to load groups. Please try again.");
      }
    };

    fetchGroups();
  }, [defaultGroupId]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError("Image size should be less than 5MB");
        return;
      }
      setImage(file);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    if (!groupId) {
      setError("Please select a group");
      setIsSubmitting(false);
      return;
    }

    if (!content.trim()) {
      setError("Please enter some content");
      setIsSubmitting(false);
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) {
      setError("Please log in");
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append("content", content.trim());
      formData.append("group_id", parseInt(groupId));
      if (image) {
        formData.append("image", image);
      }

      const res = await fetch("http://localhost:8000/posts/", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || "Failed to create post");
      }

      onClose();
    } catch (error) {
      console.error("Error creating post:", error);
      setError(error.message || "Failed to create post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="popup-container">
      <div className="popup">
        <h2>Create New Post</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="post-content">Content</label>
            <textarea
              id="post-content"
              name="post-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={5}
              placeholder="What's on your mind?"
            />
          </div>

          <div className="form-group">
            <label htmlFor="post-image">Image (optional)</label>
            <input
              id="post-image"
              name="post-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="file-input"
            />
            {image && (
              <div className="image-preview">
                <img
                  src={URL.createObjectURL(image)}
                  alt="Preview"
                  className="preview-image"
                />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="remove-image-btn"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="post-group">Group</label>
            <select
              id="post-group"
              name="post-group"
              value={groupId || ""}
              onChange={(e) => setGroupId(e.target.value)}
              required
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>

          <div className="button-container">
            <button 
              type="submit" 
              className="submit-btn"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Posting..." : "Post"}
            </button>
            <button 
              type="button" 
              className="cancel-btn" 
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePostPopup; 