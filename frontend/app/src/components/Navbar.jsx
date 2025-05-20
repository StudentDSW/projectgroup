
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./navbar.css";

export const Navbar = ({ onJoinGroup }) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [avatar, setAvatar] = useState("/default-avatar.jpg");

  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [fetchError, setFetchError] = useState(null);

  const handleSearch = (e) => {
    const text = e.target.value;
    setSearchText(text);

    if (text.trim() === "") {
      setFilteredGroups([]);
    } else {
      const filtered = groups.filter((group) =>
        group.name.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredGroups(filtered);
    }
  };

  const toggleDropdown = () => {
    setDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch("http://localhost:8000/user/me", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
        });

        if (!res.ok) throw new Error("Błąd pobierania użytkownika");

        const data = await res.json();

        setUsername(data.username);
        setAvatar(data.avatar || "/default-avatar.jpg");

        localStorage.setItem("user_id", data.id);
        localStorage.setItem("username", data.username);
        localStorage.setItem(`avatar_${data.id}`, data.avatar || "");
      } catch (err) {
        console.error("Błąd ładowania profilu w navbarze:", err);
      }
    };

    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchGroups = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        alert("Brak tokena, proszę się zalogować.");
        return;
      }
      try {
        const res = await fetch("http://localhost:8000/group/all", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error(`Błąd pobierania grup: ${res.status}`);

        const data = await res.json();
        setGroups(data);
        setFetchError(null);
      } catch (err) {
        console.error("Błąd pobierania grup:", err);
        setFetchError(err.message);
      }
    };

    fetchGroups();
  }, []);

  const handleJoinGroup = async (group) => {
    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");

    if (!token || !userId) {
      alert("Brak danych użytkownika. Zaloguj się ponownie.");
      return;
    }

    try {
      const res = await fetch(
        `http://localhost:8000/group/join/${group.id}/${userId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errText = await res.text();
        console.error("Błąd dołączania:", errText);
        alert("Nie udało się dołączyć do grupy.");
        return;
      }

      if (typeof onJoinGroup === "function") {
        onJoinGroup(group);
      }

      setSearchText("");
      setFilteredGroups([]);
      console.log(`Dołączono do grupy: ${group.name}`);
    } catch (err) {
      console.error("Błąd sieci:", err);
      alert("Wystąpił błąd sieci podczas dołączania do grupy.");
    }
  };

  const showProfile = () => {
    navigate("/account");
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    navigate("/login");
  };

  return (
    <div className="wrapper-navbar">
      <div className="navbar">
        <div className="logo">
          <div className="logo-img" />
          <p>nazwa apki</p>
        </div>

        <div className="search-container" style={{ position: "relative" }}>
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Wyszukaj grupę.."
              value={searchText}
              onChange={handleSearch}
              className="search-input"
            />
            <div className="search-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>

          {searchText && filteredGroups.length > 0 && (
            <ul className="autocomplete-dropdown">
              {filteredGroups.map((group) => (
                <li
                  key={group.id}
                  className="autocomplete-item"
                  onClick={() => handleJoinGroup(group)}
                >
                  <span className="group-name">{group.name}</span>
                  <button
                    className="join-button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinGroup(group);
                    }}
                  >
                    Dołącz
                  </button>
                </li>
              ))}
            </ul>
          )}

          {searchText && filteredGroups.length === 0 && (
            <div className="autocomplete-dropdown no-results">Brak wyników</div>
          )}

          {fetchError && (
            <div
              className="autocomplete-dropdown no-results"
              style={{ color: "red" }}
            >
              {fetchError}
            </div>
          )}
        </div>

        <div className="navbar-right" ref={dropdownRef}>
          <div className="navbar-username">
            <p>{username}</p>
            <div className="username-avatar" onClick={toggleDropdown}>
              <img src={avatar} alt="avatar" className="username-avatar" />
            </div>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <button onClick={showProfile}>Pokaż profil</button>
                <button onClick={handleLogout}>Wyloguj się</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};