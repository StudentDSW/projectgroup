from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from passlib.context import CryptContext
from app.dbmodels import User
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from sqlalchemy import Select
from fastapi import Depends, HTTPException



oauth2_scheme = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = "7f3c9e6b8a4d1f57e2b8c6d3a9e4f781c2d5b6a7f8e9c0d1b2a3c4d5e6f7g8h9"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 600

def authenticate_user(username: str, password: str, db: Session):
    stmt = Select(User).where(User.username == username)
    user = db.execute(stmt).scalar_one_or_none()
    if not user:
        return False
    if not pwd_context.verify(password, user.hashed_password):
        return False
    return user

def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

    
def verify_token(token: HTTPAuthorizationCredentials = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("sub") is None:
            raise HTTPException(status_code=403, detail="Token is invalid or expired 1")
        return payload
    except JWTError:
        raise HTTPException(status_code=403, detail="Token is invelid or expired 2")
    
# def admin_verification(user: dict = Depends(verify_token)):
#     try:
#         if user.get("role") != "admin":
#             raise HTTPException(status_code=403, detail="Insufficient permissions")
#         return user
#     except JWTError:
#         raise HTTPException(status_code=403, detail="Insufficient permissions")