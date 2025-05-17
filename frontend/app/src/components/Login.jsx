import { useState } from "react";
import "./login.css";
import { Link, useNavigate } from "react-router-dom";

export const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = {};

    if (!formData.username.trim()) {
      validationErrors.username = "Wpisz swoją nazwę użytkownika";
    }

    if (!formData.password.trim()) {
      validationErrors.password = "To pole jest obowiązkowe";
    }

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length !== 0) return;

    const loginData = new FormData();
    loginData.append("username", formData.username);
    loginData.append("password", formData.password);

    fetch("http://localhost:8000/user/login", {
      method: "POST",
      body: loginData,
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.detail || "Błąd logowania");
          });
        }
        return res.json();
      })
      .then((data) => {
        console.log("Zalogowano:", data);
        localStorage.setItem("username", data.username);
        localStorage.setItem("access_token", data.access_token);
        console.log(localStorage.getItem("access_token"));
        navigate("/dashboard"); //
      })
      .catch((err) => {
        console.error("Błąd:", err.message);
        setErrors((prev) => ({
          ...prev,
          login: "Nieprawidłowa nazwa użytkownika lub hasło",
        }));
      });
  };

  return (
    <div className="body">
      <div className="wrapper">
        <form onSubmit={handleSubmit}>
          <h2>Zaloguj się</h2>
          <div className="form-box">
            <label htmlFor="username">Nazwa użytkownika</label>
            <input
              type="text"
              name="username"
              placeholder="Twój login"
              onChange={handleChange}
            />
            {errors.username && (
              <span className="errors">{errors.username}</span>
            )}
          </div>
          <div className="form-box">
            <label htmlFor="password">Hasło</label>
            <input
              type="password"
              name="password"
              placeholder="Hasło"
              onChange={handleChange}
            />
            {errors.password && (
              <span className="errors">{errors.password}</span>
            )}
            {errors.login && <span className="errors">{errors.login}</span>}
          </div>
          <button type="submit" className="buttons login__button">
            Zaloguj się
          </button>
          <Link to="/reset-password" className="link link__password">
            <span>Nie pamiętasz hasła?</span>
          </Link>
          <div className="register">
            Nie masz konta?{" "}
            <Link to="/registration" className="link register-link">
              Zarejestruj się
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};
