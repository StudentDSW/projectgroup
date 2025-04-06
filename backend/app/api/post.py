from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from typing import Optional
from datetime import datetime, timezone
from app.db import db_dependency 
from app.dbmodels import User, Group, GroupMember, Post, Comment, Reaction
from app.api.auth import verify_token
from app.api.user import get_user, HTTPError
import app.api.auth as auth


router = APIRouter(
    prefix='/posts',
    tags=['Posts']
)

def get_group_member(db: Session, user_id: int, group_id: int):
    stmt = select(GroupMember).where(GroupMember.user.id == user_id, GroupMember.group_id == group_id)
    return db.execute(stmt).scalar_one_or_none()


@router.post('/')
async def create_post(
    db:db_dependency,
    group_id: int,
    content: str,
    image: Optional[UploadFile] = File(None),
    current_user : dict = Depends(auth.verify_token)
):
    user_id = current_user['id']
    member = get_group_member(db, user_id, group_id)
    if not member:
        raise HTTPError(403,'Your are not member of this group')
    
    image_data = await image.read() if image else None

    post = Post(
        group_id = group_id,
        user_id = user_id,
        content=content,
        image=image_data,
        created_at=datetime.now(timezone.utc)
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return {"status": "success", "post_id": post.id}

@router.post('/{post_id}/comment')
async def comment_on_post(
    db: db_dependency,
    post_id:int,
    text: str,
    current_user: dict = Depends(verify_token)  
):
    user_id = current_user['id']
    post = db.get(Post, post_id)
    if not post:
        raise HTTPError(404,'Post does not exists')
    
    member = get_group_member(db, user_id, post.group_id)
    if not member:
        raise HTTPError(403, ' U have to belong to group to comment')
    
    comment = Comment(
        post_id=post_id,
        user_id=user_id,
        text=text,
        created_at=datetime.now(timezone.utc)
    )
    db.add(comment)
    db.commit()
    return {"status": "Comment was added"}


@router.post("/{post_id}/reaction")
async def react_to_post(
    db: db_dependency,
    post_id: int,
    reaction_type: str,
    current_user: dict = Depends(verify_token)
):
    user_id = current_user["id"]
    post = db.get(Post, post_id)
    if not post:
        raise HTTPError(404, "Post does not exists")

    member = get_group_member(db, user_id, post.group_id)
    if not member:
        raise HTTPError(403, "U have to belong to the group to give reaction")

    reaction = Reaction(
        post_id=post_id,
        user_id=user_id,
        type=reaction_type,
        created_at=datetime.now(timezone.utc)
    )
    db.add(reaction)
    db.commit()
    return {"status": "Reation was added"}

@router.delete("/group/{group_id}")
async def delete_group_with_posts(
    db: db_dependency,
    group_id: int,
    current_user: dict = Depends(verify_token)
):
    group = db.get(Group, group_id)
    if not group:
        raise HTTPError(404, "Group does not exists")

    user_id = current_user["id"]
    member = get_group_member(db, user_id, group_id)

    if not member or member.role not in ["admin", "owner"]:
        raise HTTPError(403, "U dont have permisison to delete this group")

    # Usuwanie wszystkiego po ID
    post_ids_stmt = select(Post.id).where(Post.group_id == group_id)
    post_ids = [row[0] for row in db.execute(post_ids_stmt).all()]

    db.execute(delete(Reaction).where(Reaction.post_id.in_(post_ids)))
    db.execute(delete(Comment).where(Comment.post_id.in_(post_ids)))
    db.execute(delete(Post).where(Post.id.in_(post_ids)))
    db.execute(delete(GroupMember).where(GroupMember.group_id == group_id))
    db.delete(group)

    db.commit()
    return {"status": "Group and all datas are delete"}

    