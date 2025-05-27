import { useState } from "react";
import "./login.css";
import { Link, useNavigate } from "react-router-dom";
import { AiOutlineCheck } from "react-icons/ai";


export const Registration = () => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [isPopupVisible, setIsPopupVisible] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validationErrors = {};

    if (!formData.email.trim()) {
      validationErrors.email = "Wpisz prawidłowy adres e-mail";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      validationErrors.email = "Wpisz prawidłowy adres e-mail";
    }

    if (!formData.username.trim()) {
      validationErrors.username = "Nazwa użytkownika jest wymagana";
    }

    if (!formData.password.trim()) {
      validationErrors.password = "To pole jest obowiązkowe";
    } else if (formData.password.length < 6) {
      validationErrors.password = "Hasło musi mieć co najmniej 6 znaków";
    }

    if (!formData.confirmPassword.trim()) {
      validationErrors.confirmPassword = "To pole jest obowiązkowe";
    } else if (formData.confirmPassword !== formData.password) {
      validationErrors.confirmPassword = "Hasła muszą się zgadzać";
    }

    setErrors(validationErrors);
    if (Object.keys(validationErrors).length !== 0) return;

    const registrationData = {
      username: formData.username,
      email: formData.email,
      password: formData.password,
    };

    fetch("http://localhost:8000/user/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(registrationData),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((data) => {
            throw new Error(data.detail || "Błąd rejestracji");
          });
        }
        return res.json();
      })
      .then((data) => {
        console.log("Rejestracja zakończona sukcesem", data);
        localStorage.setItem("username", formData.username);
        localStorage.setItem("email", formData.email);
        setIsPopupVisible(true);
      })
      .catch((err) => {
        setErrors((prev) => ({
          ...prev,
          registration: err.message,
        }));
      });
    console.log(formData.username);
  };

  const handleClosePopup = () => {
    setIsPopupVisible(false);
    navigate("/login");
  };

  return (
    <>
      <div className="body">
        <div className="container left">
          <div className="wrapper-left">
            <h2 className="title">Nasza Grupa</h2>
            <p className="desc">
              Łączymy ludzi. Wspieramy współpracę. Budujemy społeczność
            </p>
            <div className="dashes">
              <div className="dash">
                <AiOutlineCheck /> Bezpieczna komunikacja
              </div>
              <div className="dash">
                <AiOutlineCheck /> Wydajne zarządzanie projektami
              </div>
              <div className="dash">
                <AiOutlineCheck /> Dostęp z dowolnego urządzenia
              </div>
            </div>
          </div>
        </div>
        <div className="container right">
          <div className="wrapper">
            <form onSubmit={handleSubmit}>
              <h2>Zarejestruj się</h2>
              <div className="form-box">
                <label htmlFor="username">Nazwa użytkownika</label>
                <input
                  type="text"
                  name="username"
                  placeholder="Nazwa użytkownika"
                  onChange={handleChange}
                  value={formData.username}
                />
                {errors.username && (
                  <span className="errors">{errors.username}</span>
                )}
              </div>

              <div className="form-box">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="Twój adres email"
                  onChange={handleChange}
                  value={formData.email}
                />
                {errors.email && <span className="errors">{errors.email}</span>}
              </div>

              <div className="form-box">
                <label htmlFor="password">Hasło</label>
                <input
                  type="password"
                  name="password"
                  placeholder="Hasło"
                  onChange={handleChange}
                  value={formData.password}
                />
                {errors.password && (
                  <span className="errors">{errors.password}</span>
                )}
              </div>

              <div className="form-box">
                <label htmlFor="confirmPassword">Potwierdź hasło</label>
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Potwierdź hasło"
                  onChange={handleChange}
                  value={formData.confirmPassword}
                />
                {errors.confirmPassword && (
                  <span className="errors">{errors.confirmPassword}</span>
                )}
              </div>

              <button type="submit" className="buttons login__button">
                Zarejestruj się
              </button>

              {errors.registration && (
                <span className="errors">{errors.registration}</span>
              )}

              <div className="register">
                Masz już konto?{" "}
                <Link to="/login" className="link register-link">
                  Zaloguj się
                </Link>
              </div>
            </form>
          </div>
        </div>
        {isPopupVisible && (
          <div className="create-account__popup">
            <h3 className="account__created">Konto utworzone pomyślnie</h3>
            <button
              className="create-account__popup-close"
              onClick={handleClosePopup}
            >
              Ok
            </button>
          </div>
        )}
      </div>
    </>
  );
};
