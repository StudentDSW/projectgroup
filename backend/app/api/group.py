from fastapi import APIRouter, Depends, File, UploadFile, Form
from app.db import db_dependency
from app.dbmodels import Group, GroupMember
from datetime import datetime, timezone
from app.api.auth import pwd_context
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import Optional
import app.api.auth as auth
import base64
from pydantic import BaseModel
from app.api.user import get_user, HTTPError


router = APIRouter(
    prefix='/group',
    tags=['Groups']
)

class AddGroupBM(BaseModel):
    name: str
    description: str
    public: bool

def get_group(db: Session, id: int = None, name: str = None):
    filters = []
    if id:
        filters.append(Group.id == id)
    if name:
        filters.append(Group.name == name)
    stmt = select(Group).where(*filters)
    return db.execute(stmt).scalar_one_or_none()

def search_groups(db: Session, name: str, user_id: int):
    stmt = select(Group).where(Group.name.ilike(f"%{name}%"))
    groups = db.execute(stmt).scalars().all()
    
    result = []
    for group in groups:
        group_dict = group.__dict__.copy()
        # Check if user is a member
        member = db.execute(
            select(GroupMember)
            .where(GroupMember.group_id == group.id)
            .where(GroupMember.user_id == user_id)
        ).scalar_one_or_none()
        
        group_dict["is_member"] = member is not None
        if member:
            group_dict["role"] = member.role
        result.append(group_dict)
    
    return result

def is_group_admin(db: Session, user_id: int, group_id: int) -> bool:
    stmt = select(GroupMember).where(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id,
        GroupMember.role == "admin"
    )
    return db.execute(stmt).scalar_one_or_none() is not None

def base64_encode(img_bytes: bytes):
    if img_bytes is None:
        return None
    base64_str = base64.b64encode(img_bytes).decode("utf-8")
    return f"data:image/png;base64,{base64_str}"

def is_user_in_group(db: Session, user_id: int, group_id: int):
    stmt = select(GroupMember).where(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id
    )
    result = db.execute(stmt).scalar_one_or_none()
    return result


@router.post("/")
async def add_group(
    db: db_dependency, 
    name: str = Form(...),
    description: str = Form(...),
    public: bool = Form(...),
    avatar: Optional[UploadFile] = File(None),
    current_user: dict = Depends(auth.verify_token)
):
    user = get_user(db=db,id=current_user.get("id"))
    if not user:
        raise HTTPError(404, "User does not exist")
    group = get_group(db=db, name=name)
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


@router.post("/join/{group_id}/{user_id}")
async def join_group(
    db: db_dependency,
    group_id: int,
    user_id: int,
    current_user: dict = Depends(auth.verify_token)
):
    if current_user.get("role") != "admin" and current_user.get("id") != user_id:
        raise HTTPError(403, "Insufficient permissions")
    group = get_group(db=db, id=group_id)
    if not group:
        raise HTTPError(404, "Group not found")
    user = get_user(db, id=user_id)
    if not user:
        raise HTTPError(404, "User not found")

    # Check if user is already a member
    existing_member = is_user_in_group(db, user_id, group_id)
    if existing_member:
        return {"status": "Success", "result": "Already a member"}

    group_member = GroupMember(
        user_id = user.id,
        group_id = group.id,
        role = "user"
    )
    db.add(group_member)
    db.commit()
    db.refresh(group_member)

    return {"status": "Success", "result": f"{group_member.group_id} - {group_member.user_id}"}

    

@router.get("/all")
async def get_all_groups(
    db: db_dependency,
    limit: Optional[int] = 500,
    offset: Optional[int] = 0,
    current_user: dict = Depends(auth.verify_token)
):
    stmt = select(Group).offset(offset).limit(limit)
    groups_result = db.execute(stmt).scalars().all()

    if not groups_result:
        raise HTTPError(404, "Group not found")

    groups_list = []
    for group in groups_result:
        group_dict = group.__dict__.copy()
        group_dict["avatar"] = base64_encode(group.avatar)
        groups_list.append(group_dict)

    return groups_list



@router.get("/mygroups")
async def get_current_user_groups(
    db: db_dependency,
    current_user: dict = Depends(auth.verify_token)
):
    user = get_user(db, id=current_user.get("id"))
    if not user:
        HTTPError(404, "User not found")

    groups = [
        {
            "id": membership.group.id,
            "name": membership.group.name,
            "description": membership.group.description,
            "avatar": base64_encode(membership.group.avatar),
            "role": membership.role
        }
        for membership in user.group_associations
    ]
    return groups




@router.get("/search")
async def get_groups(
    db: db_dependency,
    name: str,
    current_user: dict = Depends(auth.verify_token)
):
    groups_result = search_groups(db, name, current_user.get("id"))

    if not groups_result:
        raise HTTPError(404, "Group not found")
    
    groups_list = []
    for group in groups_result:
        if group.get("avatar"):
            avatar_base64 = base64.b64encode(group["avatar"]).decode("utf-8")
            group["avatar"] = f"data:image/png;base64,{avatar_base64}"
        
        groups_list.append(group)
    return groups_list


@router.get("/{group_id}")
async def get_group_by_id(
    db: db_dependency,
    group_id: int,
    current_user: dict = Depends(auth.verify_token)
):
    group = get_group(db=db, id=group_id)
    if not group:
        raise HTTPError(404, "Group not found")
    group_dict = group.__dict__.copy()
    group_dict["avatar"] = base64_encode(group.avatar)
    return group_dict


@router.put("/{group_id}")
async def update_group(
    db: db_dependency,
    group_id: int,
    name: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    public: Optional[bool] = Form(None),
    avatar: Optional[UploadFile] = File(None),
    current_user: dict = Depends(auth.verify_token)
):
    group = get_group(db, group_id)
    if not group:
        raise HTTPError(404, "Group not found")
    
    if name:
        group_exist = get_group(db=db,name=name)
        if group_exist:
            raise HTTPError(400, "Group already exist")
        group.name = name
    if description:
        group.description = description
    if public:
        group.public = public
    if avatar:
        avatar_bytes = await avatar.read()
        group.avatar = avatar_bytes

    db.commit()
    db.refresh(group)

    return {"status": "Success", "result": group.id}


@router.delete("/{group_id}")
async def delete_group(
    db: db_dependency,
    group_id: int,
    current_user: dict = Depends(auth.verify_token)
):
    user = get_user(db=db, id= current_user.get("id"))
    if not user:
        raise HTTPError(404, "User not found")
    group = get_group(db=db, id=group_id)
    if not group:
        raise HTTPError(404, "Group not found")
    if not is_group_admin(db, user.id, group.id):
        raise HTTPError(403, "Insufficient permissions")
    
    db.delete(group)
    db.commit()

    return {"status": "Success", "result": "Deleted"}



@router.post("/join/{group_id}")
async def add_current_user_to_group(
    db: db_dependency,
    group_id: int,
    current_user: dict = Depends(auth.verify_token)
):
    group = get_group(db=db, id=group_id)
    if not group:
        raise HTTPError(404, "Group not found")
    user = get_user(db, id=current_user.get("id"))
    if not user:
        raise HTTPError(404, "User not found")

    group_member = GroupMember(
        user_id = user.id,
        group_id = group.id,
        role = "user"
    )
    db.add(group_member)
    db.commit()
    db.refresh(group_member)

    return {"status": "Success", "result": "Joined"}


@router.post("/leave/{group_id}")
async def add_current_user_to_group(
    db: db_dependency,
    group_id: int,
    current_user: dict = Depends(auth.verify_token)
):
    group = get_group(db=db, id=group_id)
    if not group:
        raise HTTPError(404, "Group not found")
    user = get_user(db, id=current_user.get("id"))
    if not user:
        raise HTTPError(404, "User not found")
    group_member = is_user_in_group(db,user.id,group_id)
    if not group_member:
        raise HTTPError(404, "User does not belong to the group")
    
    db.delete(group_member)
    db.commit()

    return {"status": "Success", "result": "Removed"}



@router.get("/members/{group_id}")
async def users_in_group(
    db: db_dependency,
    group_id: int,
    current_user: dict = Depends(auth.verify_token)
):
    group = get_group(db=db, id=group_id)
    if not group:
        raise HTTPError(404, "Group not found")

    members = [
        {
            "id": membership.user.id,
            "username": membership.user.username,
            "email": membership.user.email,
            "avatar": membership.user.avatar,
            "registration_date": membership.user.registration_date,
            "role_in_group": membership.role,
        }
        for membership in group.member_associations
    ]

    return members


@router.get("/name/{group_name}")
async def get_group_by_name(
    db: db_dependency,
    group_name: str,
    current_user: dict = Depends(auth.verify_token)
):
    group = get_group(db=db, name=group_name)
    if not group:
        raise HTTPError(404, "Group not found")
    group_dict = group.__dict__.copy()
    group_dict["avatar"] = base64_encode(group.avatar)
    return group_dict



    














