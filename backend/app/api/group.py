from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from pydantic import BaseModel
from app.db import db_dependency
from app.dbmodels import User, Group, GroupMember
from datetime import datetime, timezone, timedelta
from app.api.auth import pwd_context
from sqlalchemy.orm import Session
from sqlalchemy import select, or_
from typing import Optional
import app.api.auth as auth
from fastapi.security import OAuth2PasswordRequestForm
import base64
from app.api.user import get_user, HTTPError


router = APIRouter(
    prefix='/group',
    tags=['Groups']
)


def get_group(db: Session, id: int):
    stmt = select(Group).where(Group.id == id)
    return db.execute(stmt).scalar_one_or_none()

def search_groups(db: Session, name: str):
    stmt = select(Group).where(Group.name.ilike(f"%{name}%"))
    return db.execute(stmt).scalars().all()




@router.post("/")
async def add_group(
    db: db_dependency, 
    name: str,
    description: str,
    public: bool,
    avatar: Optional[UploadFile] = File(None),
    current_user: dict = Depends(auth.verify_token)
):
    user = get_user(db=db,id=current_user.get("id"))
    if not user:
        raise HTTPError(404, "User does not exist")
    group = get_group(db=db, name = name)
    if group:
        raise HTTPError(400, "Group already exist")
    db_group = Group(
        name = name,
        description = description,
        creation_date = datetime.now(timezone.utc),
        public = public
    )
    if avatar:
        avatar_bytes = await avatar.read()
        db_group.avatar = avatar_bytes

    db.add(db_group)
    db.commit()
    db.refresh(db_group)
    group_member = GroupMember(
        user_id = user.id,
        group_id = db_group.id,
        role = "admin"
    )
    db.add(group_member)
    db.commit()
    return {"status": "Success", "result": db_group.id}

@router.get("/all")
async def get_all_groups(
    db: db_dependency,
    limit: Optional[int] = 100,
    offset: Optional[int] = 0,
    current_user: dict = Depends(auth.verify_token)
):
    stmt = select(Group).offset(offset).limit(limit)
    groups_result = db.execute(stmt).scalars().all()
    return groups_result

@router.get("/search")
async def get_groups(
    db: db_dependency,
    name: str,
    current_user: dict = Depends(auth.verify_token)
):
    groups_result = search_groups(db,name)
    return groups_result

@router.get("/{group_id}")
async def get_group_by_id(
    db: db_dependency,
    group_id: int,
    current_user: dict = Depends(auth.verify_token)
):
    group = get_group(db, group_id)
    if not group:
        raise HTTPError(404, "Group not found")
    return group

# TBD
@router.put("/{group_id}")
async def update_group(
    db: db_dependency,
    name: Optional[str] = None,
    description: Optional[str] = None,
    public: Optional[bool] = None,
    avatar: Optional[UploadFile] = File(None)
):
    return True

