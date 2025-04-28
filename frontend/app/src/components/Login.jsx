import { useState } from "react";
import "./login.css"
import { Link } from 'react-router-dom'


export const Login = () => {
    
 const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
 })

 const [errors, setErrors] = useState({})

 const handleChange = e => {
    const {name, value} = e.target
    setFormData({
        ...formData, [name] : value
    })
 }

 const handleSubmit = e => {
    e.preventDefault()
    const validationErrors = {}

    if(!formData.email.trim()) {
        validationErrors.email = "Wpisz prawidłowy adres e-mail"
    } else if(!/\S+@\S+\.\S+/.test(formData.email)){
        validationErrors.email = "Wpisz prawidłowy adres e-mail"
    }

    if(!formData.password.trim()) {
        validationErrors.password = "To pole jest obowiązkowe"
    } else if(formData.password.length < 6){
        validationErrors.password = "To pole jest obowiązkowe"
    }

    setErrors(validationErrors)
    if(Object.keys(validationErrors).length === 0) {
        alert("elo burdelo")
    }
 }

    return (
        <>
            <div className="wrapper">
                <form onSubmit={handleChange} action="">
                    <h2>Zaloguj się</h2>
                    <div className="form-box">
                        <label htmlFor="email">Email</label>
                        <input 
                            type="email" 
                            name="email"
                            placeholder="Twój adres email"
                            onChange={handleChange}
                            />
                            {errors.email && <span className='errors'>{errors.email}</span>}
                           
                    </div>
                    <div className="form-box">
                        <label htmlFor="password">Hasło</label>
                        <input 
                            type="password"
                            name="password" 
                            placeholder="Hasło"
                            onChange={handleChange}
                            />
                        {errors.password && <span className='errors'>{errors.password}</span>}
                    </div>
                    <button onClick={handleSubmit} type="submit" className="buttons login__button">Zaloguj się</button>
                    <Link to="/reset-password" className="link link__password"><span>Nie pamiętasz hasła?</span></Link>
                    <div className="register">Nie masz konta? <Link to="/registration" className="link register-link">Zarejestruj się</Link></div>
                </form>
            </div>
        </>
    )
}

