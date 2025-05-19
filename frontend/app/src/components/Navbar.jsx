import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./navbar.css"

export const Navbar = () => {
  const username = localStorage.getItem("username");
  const [searchText, setSearchText] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const navigate = useNavigate();

  const handleSearch = (e) => {
    setSearchText(e.target.value);
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

  const showProfile = () => {
    navigate("/account")
  }

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("access_token");
    navigate("/login");
  };

  return (
      <div className="wrapper-navbar">
        <div className="navbar">
          <div className="logo">
            <div className="logo-img" />
            <p>nazwa apki</p>
          </div>

          <div className="search-container">
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
          </div>

          <div className="navbar-right" ref={dropdownRef}>
            <div className="navbar-username">
              <p>{username}</p>
              <div className="username-avatar" onClick={toggleDropdown}>
                {username[0]}
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
