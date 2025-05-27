from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from pydantic import BaseModel
from app.db import db_dependency
from app.dbmodels import User
from datetime import datetime, timezone, timedelta
from app.api.auth import pwd_context
from sqlalchemy.orm import Session
from sqlalchemy import Select, or_
from typing import Optional
import app.api.auth as auth
from fastapi.security import OAuth2PasswordRequestForm
import base64


router = APIRouter(
    prefix='/user',
    tags=['Users']
)

class UserCreateBM(BaseModel):
    username: str 
    password: str
    email: str

class UserUpdateBM(BaseModel):
    password: Optional[str] = None
    email: Optional[str] = None

def get_user(db: Session, username: str = None, email: str = None, id: int = None):
    filters = []

    if email:
        filters.append(User.email == email)
    if username:
        filters.append(User.username == username)
    if id:
        filters.append(User.id == id)

    if not filters:
        return None
    stmt = Select(User).where(or_(*filters))

    return db.execute(stmt).scalar_one_or_none()

def HTTPError(code: int, detail:str):
    return HTTPException(status_code=code, detail=detail)



@router.post("/register")
async def add_user(user: UserCreateBM, db: db_dependency):
    userdb = get_user(db=db, username=user.username)
    if userdb:
        raise HTTPError(400, "Username is already taken")
    userdb = get_user(db=db, email=user.email)
    if userdb:
        raise HTTPError(400, "email is already taken")
    hashed_password = pwd_context.hash(user.password)
    db_user = User(
        username = user.username,
        hashed_password = hashed_password,
        email = user.email,
        registration_date = datetime.now(timezone.utc)
    )
    db.add(db_user)
    db.commit()
    return {"username": user.username, "message": "user created"}


@router.post("/login")
def login(db: db_dependency, form_data: OAuth2PasswordRequestForm = Depends()):
    user = auth.authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPError(401, "Invalid user or password")
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.username,
              "id": user.id,
              "role": user.role},
        expires_delta = access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer", "username": user.username}



@router.get("/")
async def get_users(
    db: db_dependency,
    username: Optional[str] = None,
    email: Optional[str] = None,
    role: Optional[str] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(auth.verify_token)
    ):
    if current_user.get("role") != "admin":
        raise HTTPError(403, "Insufficient permissions")
    
    filters = []
    if username:
        filters.append(User.username == username)
    if email:
        filters.append(User.email == email)
    if role:
        filters.append(User.role == role)
    if status:
        filters.append(User.status == status)
    
    stmt = Select(User).where(*filters)
    users = db.execute(stmt).scalars().all()

    users_list = []
    for user in users:
        user_dict = user.__dict__.copy()
        user_dict.pop("hashed_password", None)

        if user.avatar:
            avatar_base64 = base64.b64encode(user.avatar).decode("utf-8")
            user_dict["avatar"] = f"data:image/png;base64,{avatar_base64}"
        
        users_list.append(user_dict)

    return users_list


@router.get("/me")
async def user_me(
    db: db_dependency, 
    current_user: dict = Depends(auth.verify_token)
):
    try:
        user = get_user(db=db,id=current_user.get("id"))
        if not user:
            raise HTTPError(404,"User does not exist")
        
        user_dict = user.__dict__.copy()
        user_dict.pop("hashed_password", None)
        if user.avatar:
            avatar_base64 = base64.b64encode(user.avatar).decode("utf-8")
            user_dict["avatar"] = f"data:image/png;base64,{avatar_base64}"

        return user_dict
    except Exception as e:
        raise HTTPError(500, f"Internal server error: {str(e)}")



@router.get("/{user_id}")
async def get_specific_user(
    user_id: int,
    db: db_dependency, 
    current_user: dict = Depends(auth.verify_token) 
):
    if current_user.get("role") != "admin" and current_user.get("id") != user_id:
        raise HTTPError(403, "Insufficient permissions")
    user = get_user(db=db, id=user_id)
    if not user:
        raise HTTPError(404,"User does not exist")
    
    user_dict = user.__dict__.copy()
    user_dict.pop("hashed_password", None)
    if user.avatar:
        avatar_base64 = base64.b64encode(user.avatar).decode("utf-8")
        user_dict["avatar"] = f"data:image/png;base64,{avatar_base64}"

    return user_dict



@router.put("/{user_id}")
async def get_specific_user(
    user_id: int,
    db: db_dependency,
    current_user: dict = Depends(auth.verify_token),
    password: Optional[str] = Form(None),
    email: Optional[str] = Form(None),
    avatar: Optional[UploadFile] = File(None) 
):
    if current_user.get("role") != "admin" and current_user.get("id") != user_id:
        raise HTTPError(403, "Insufficient permissions")
    user = get_user(db=db,id=user_id)
    if not user:
        raise HTTPError(404, "User does not exist")
    if email:
        email_in_use = get_user(db=db,email=email)
        if email_in_use:
            raise HTTPError(400,"Email is already in use")
        user.email = email
    if password:
        hashed_password = pwd_context.hash(password)
        user.hashed_password = hashed_password
    if avatar:
        avatar_bytes = await avatar.read()
        user.avatar = avatar_bytes
    db.commit()
    db.refresh(user)
    return {"message": f"User {user.id} updated"}


@router.delete("/{user_id}")
async def user_delete(
    user_id: int,
    db: db_dependency,
    current_user: dict = Depends(auth.verify_token)
):
    if current_user.get("role") != "admin" and current_user.get("id") != user_id:
        raise HTTPError(403, "Insufficient permissions")
    user = get_user(db=db,id=user_id)
    if not user:
        raise HTTPError(404, "User does not exist")
    db.delete(user)
    db.commit()
    return {"message": "User deleted"}
    
