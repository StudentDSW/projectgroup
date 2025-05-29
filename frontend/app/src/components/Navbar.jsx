import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import "./navbar.css";

export const Navbar = ({ onJoinGroup, onLeaveGroup }) => {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const searchRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  const [username, setUsername] = useState(
    localStorage.getItem("username") || ""
  );
  const [avatar, setAvatar] = useState("/default-avatar.jpg");

  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [searchError, setSearchError] = useState(null);

  const handleSearch = async (e) => {
    const text = e.target.value;
    setSearchText(text);
    setSearchError(null);

    if (text.trim() === "") {
      setFilteredGroups([]);
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        setSearchError("Zaloguj się, aby wyszukiwać grupy");
        return;
      }

      const res = await fetch(`http://localhost:8000/group/search?name=${encodeURIComponent(text)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Nie udało się wyszukać grup');
      }

      const searchResults = await res.json();
      setFilteredGroups(searchResults);
    } catch (err) {
      console.error("Błąd wyszukiwania grup:", err);
      setSearchError("Wystąpił błąd podczas wyszukiwania");
    } finally {
      setIsLoading(false);
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
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setFilteredGroups([]);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      try {
        const res = await fetch("http://localhost:8000/user/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Błąd pobierania profilu");

        const data = await res.json();
        setUsername(data.username);
        setAvatar(data.avatar || "/default-avatar.jpg");
        localStorage.setItem("user_id", data.id);
        localStorage.setItem("username", data.username);
        localStorage.setItem(`avatar_${data.id}`, data.avatar || "");
      } catch (err) {
        console.error("Błąd ładowania profilu:", err);
      }
    };

    fetchProfile();
  }, []);

  const handleJoinGroup = async (group) => {
    const token = localStorage.getItem("access_token");
    const userId = localStorage.getItem("user_id");

    if (!token || !userId) {
      setSearchError("Zaloguj się, aby dołączyć do grupy");
      return;
    }

    try {
      setFilteredGroups(prevGroups => 
        prevGroups.map(g => 
          g.id === group.id 
            ? { ...g, is_member: true, role: 'user' }
            : g
        )
      );

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
        setFilteredGroups(prevGroups => 
          prevGroups.map(g => 
            g.id === group.id 
              ? { ...g, is_member: false, role: null }
              : g
          )
        );
        throw new Error("Nie udało się dołączyć do grupy");
      }

      const data = await res.json();
      
      if (data.result === "Already a member") {
        setGroups(prevGroups => 
          prevGroups.map(g => 
            g.id === group.id 
              ? { ...g, is_member: true, role: 'user' }
              : g
          )
        );
      }
      
      if (typeof onJoinGroup === "function") {
        onJoinGroup(group);
      }
    } catch (err) {
      console.error("Błąd dołączania do grupy:", err);
      setSearchError("Nie udało się dołączyć do grupy");
    }
  };

  const handleLeaveGroup = async (group) => {
    const token = localStorage.getItem("access_token");
    if (!token) {
      setSearchError("Zaloguj się, aby opuścić grupę");
      return;
    }

    try {
      setFilteredGroups(prevGroups => 
        prevGroups.map(g => 
          g.id === group.id 
            ? { ...g, is_member: false, role: null }
            : g
        )
      );

      const res = await fetch(
        `http://localhost:8000/group/leave/${group.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        setFilteredGroups(prevGroups => 
          prevGroups.map(g => 
            g.id === group.id 
              ? { ...g, is_member: true, role: 'user' }
              : g
          )
        );
        throw new Error("Nie udało się opuścić grupy");
      }

      if (typeof onLeaveGroup === "function") {
        onLeaveGroup(group);
      }
    } catch (err) {
      console.error("Błąd opuszczania grupy:", err);
      setSearchError("Nie udało się opuścić grupy");
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
        <Link to="/dashboard" className="logo" style={{ cursor: 'pointer' }}>
          <div className="logo-img" />
          <p>GroupApp</p>
        </Link>

        <div className="search-container" ref={searchRef}>
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Wyszukaj grupę..."
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
            <div className="search-results">
              {isLoading ? (
                <div className="search-loading">Wyszukiwanie...</div>
              ) : searchError ? (
                <div className="search-error">{searchError}</div>
              ) : (
                <ul className="group-list">
                  {filteredGroups.map((group) => (
                    <li
                      key={group.id}
                      className="group-item"
                      onClick={() => !group.is_member && handleJoinGroup(group)}
                    >
                      <div className="group-info">
                        <span className="group-name">{group.name}</span>
                        {group.is_member && (
                          <span className="member-badge">
                            {group.role === 'admin' ? 'Admin' : 'Member'}
                          </span>
                        )}
                      </div>
                      {group.is_member ? (
                        <button
                          className="leave-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLeaveGroup(group);
                          }}
                        >
                          Leave
                        </button>
                      ) : (
                        <button
                          className="join-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinGroup(group);
                          }}
                        >
                          Join
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="navbar-right" ref={dropdownRef}>
          <div className="navbar-username">
            <p>{username}</p>
            <button 
              className="profile-button" 
              onClick={toggleDropdown}
              aria-expanded={dropdownOpen}
              aria-label="Menu profilu"
            >
              <img src={avatar} alt={`${username}'s avatar`} className="avatar-image" />
            </button>

            {dropdownOpen && (
              <div className="dropdown-menu">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    showProfile();
                    setDropdownOpen(false);
                  }}
                >
                  Profil
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLogout();
                    setDropdownOpen(false);
                  }}
                >
                  Wyloguj
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};