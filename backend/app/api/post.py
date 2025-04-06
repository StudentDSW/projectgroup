from fastapi import APIRouter, HTTPException, Depends, File, UploadFile
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from typing import Optional
from datetime import datetime, timezone
from app.db import db_dependency 
from app.dbmodels import User, Group, GroupMember, Post, Comment, Reaction
from app.api.auth import verify_token
from app.api.user import get_user, HTTPError
from app.api.group import is_user_in_group

router = APIRouter(
    prefix='/posts',
    tags=['Posts']
)

def get_group_member(db: Session, user_id: int, group_id: int):
    stmt = select(GroupMember).where(
        GroupMember.user_id == user_id,
        GroupMember.group_id == group_id
    )
    return db.execute(stmt).scalar_one_or_none()

@router.post('/')
async def create_post(
    db: db_dependency,
    group_id: int,
    content: str,
    image: Optional[UploadFile] = File(None),
    current_user: dict = Depends(verify_token)
):
    user = get_user(db=db, id=current_user.get("id"))
    if not user:
        raise HTTPError(403, 'User not found')

    member = get_group_member(db, user.id, group_id)
    if not member:
        raise HTTPError(403, 'You are not a member of this group')

    image_data = await image.read() if image else None

    post = Post(
        group_id=group_id,
        user_id=user.id,
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
    post_id: int,
    text: str,
    current_user: dict = Depends(verify_token)
):
    user_id = current_user['id']
    post = db.get(Post, post_id)
    if not post:
        raise HTTPError(404, 'Post does not exist')

    member = get_group_member(db, user_id, post.group_id)
    if not member:
        raise HTTPError(403, 'You have to belong to the group to comment')

    comment = Comment(
        post_id=post_id,
        user_id=user_id,
        text=text,
        created_at=datetime.now(timezone.utc)
    )
    db.add(comment)
    db.commit()
    return {"status": "Comment added"}

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
        raise HTTPError(404, "Post does not exist")

    member = get_group_member(db, user_id, post.group_id)
    if not member:
        raise HTTPError(403, "You have to belong to the group to react")

    reaction = Reaction(
        post_id=post_id,
        user_id=user_id,
        type=reaction_type,
        created_at=datetime.now(timezone.utc)
    )
    db.add(reaction)
    db.commit()
    return {"status": "Reaction added"}

@router.delete("/post/{post_id}")
async def delete_post_with_comments_reactions(
    db: db_dependency,
    post_id: int,
    current_user: dict = Depends(verify_token)
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPError(404, "Post does not exist")

    user_id = current_user["id"]
    
    if post.user_id != user_id:
        raise HTTPError(403, "You don't have permission to delete this post")

    db.delete(post)
    db.commit()

    return {"status": "Success", "result": "Removed"}

