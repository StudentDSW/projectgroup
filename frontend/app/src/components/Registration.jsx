import { useState, useEffect } from "react";
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
  const [countdown, setCountdown] = useState(3);

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

  useEffect(() => {
    let timeoutId;
    let countdownInterval;
    
    if (isPopupVisible) {
      countdownInterval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      timeoutId = setTimeout(() => {
        setIsPopupVisible(false);
        navigate("/login");
      }, 3000); // Redirect after 3 seconds
    }
    
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [isPopupVisible, navigate]);

  return (
    <>
      <div className="body">
        {isPopupVisible && (
          <div className="create-account__popup" style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: '#4CAF50',
            color: 'white',
            padding: '15px 30px',
            borderRadius: '5px',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px'
          }}>
            <h3 className="account__created" style={{ margin: 0 }}>Konto utworzone pomyślnie</h3>
            <p style={{ margin: 0 }}>Przekierowanie do strony logowania za {countdown} sekund...</p>
          </div>
        )}
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
                  id="username"
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
                  id="email"
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
                  id="password"
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
                  id="confirmPassword"
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
      </div>
    </>
  );
};
