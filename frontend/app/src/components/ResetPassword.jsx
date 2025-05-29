import { useState } from "react"
import "./resetpassword.css"
import { useNavigate } from "react-router-dom";


export const ResetPassword = () => {


     const [formData, setFormData] = useState({
        email: '',
     })

     const [isPopupVisible, setIsPopupVisible] = useState(false);
    
     const [errors, setErrors] = useState({})
    
     const handleChange = e => {
        const {name, value} = e.target
        setFormData({
            ...formData, [name] : value
        })
     }

     const navigate = useNavigate()
    
     const handleSubmit = e => {
        e.preventDefault()
        const validationErrors = {}
    
        if(!formData.email.trim()) {
            validationErrors.email = "Wpisz prawidłowy adres e-mail"
        } else if(!/\S+@\S+\.\S+/.test(formData.email)){
            validationErrors.email = "Wpisz prawidłowy adres e-mail"
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
        <form onSubmit={handleSubmit} className="wrapper">
            <div className="reset-password__box">
                <h2>Przypomnienie hasła</h2>
                <div className="form-box">
                    <label htmlFor="reset-email">Adres email, na który utworzono konto</label>
                    <input 
                        id="reset-email"
                        type="email" 
                        name="email"
                        placeholder="jan.kowalski@gmail.com"
                        onChange={handleChange}
                        />
                        {errors.email && <span className='errors'>{errors.email}</span>}
                        <button className="buttons reset-password__button">Wyślij instrukcje resetowania</button>
                        
                </div>
            </div>  
        </form>
        {isPopupVisible && (
        <div className='reset-password__popup'>
            <p className="reset-password__message">Jeśli podany e-mail jest u nas zarejestrowany, to wysłaliśmy na niego instrukcję dotyczącą zmiany hasła.</p>
            <button className='create-account__popup-close' onClick={handleClosePopup}>Ok</button>
        </div>
      )}
        </>
    )
}