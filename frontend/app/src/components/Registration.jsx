
import { useState } from 'react';
import "./registration.css"
import { Link, useNavigate } from 'react-router-dom'

export const Registration = () => {

    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: '',
     })

     const [errors, setErrors] = useState({})

     const [isPopupVisible, setIsPopupVisible] = useState(false);
    
    
     const handleChange = e => {
        const {name, value} = e.target
        setFormData({
            ...formData, [name] : value
        })
     }
    
     const handleSubmit = e => {
        e.preventDefault()
        const validationErrors = {}
        if(!formData.username.trim()) {
            validationErrors.username = "Podaj nazwę użytkownika"
        }
    
        if(!formData.email.trim()) {
            validationErrors.email = "Wpisz prawidłowy adres e-mail"
        } else if(!/\S+@\S+\.\S+/.test(formData.email)){
            validationErrors.email = "Wpisz prawidłowy adres e-mail"
        }
    
        if(!formData.password.trim()) {
            validationErrors.password = "To pole jest obowiązkowe"
        } else if(formData.password.length < 6){
            validationErrors.password = "Hasło musi mieć conajmniej 6 znaków"
        }

        if(formData.confirmPassword !== formData.password) {
            validationErrors.confirmPassword = "podane hasła się nie zgadzają"
        }

    
        setErrors(validationErrors)
        if(Object.keys(validationErrors).length === 0) {
            setIsPopupVisible(true);
        }

     }

     const handleClosePopup = () => {
        setIsPopupVisible(false);
        navigate('/')
      };
    

    return (
        <>
        <div className="wrapper">
            <form  onSubmit={handleSubmit} action="">
                <h2>Zarejestruj się</h2>
                <div className="form-box">
                    <label htmlFor="username">Nazwa użytkownika</label>
                    <input 
                        type="username" 
                        name="username"
                        onChange={handleChange}
                        />
                        {errors.username && <span className='errors'>{errors.username}</span>} 
                </div>
                <div className="form-box">
                    <label htmlFor="email">Email</label>
                    <input 
                        type="email" 
                        name="email"
                        onChange={handleChange}
                        /> 
                        {errors.email && <span className='errors'>{errors.email}</span>} 
                </div>
                <div className="form-box">
                    <label htmlFor="password">Hasło</label>
                    <input 
                        type="password"
                        name="password"
                        onChange={handleChange} 
                        />
                        {errors.password && <span className='errors'>{errors.password}</span>} 
                </div>
                <div className="form-box">
                    <label htmlFor="confirmPassword">Powtórz hasło</label>
                    <input 
                        type="password"
                        name="confirmPassword" 
                        onChange={handleChange}
                        />
                        {errors.confirmPassword && <span className='errors'>{errors.confirmPassword}</span>} 
                </div>
                <button type="submit" onClick={handleSubmit} className="buttons login__button">Zarejestruj się</button>
                <div className="register">Masz już konto? <Link to="/" className="register-link">Zaloguj się</Link></div>
            </form>
        </div>
        {isPopupVisible && (
        <div className='create-account__popup'>
          <h3 className='account__created'>Konto utworzone pomyślnie</h3>
          <button className='create-account__popup-close' onClick={handleClosePopup}>Ok</button>
        </div>
      )}
    </>
    );
  };
  