from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import select, delete
from typing import Optional
from datetime import datetime, timezone
from app.db import db_dependency 
from app.dbmodels import User, Group, GroupMember, Post, Comment, Reaction
from app.api.auth import verify_token
from app.api.user import get_user, HTTPError
from app.api.group import is_user_in_group
import base64

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
    group_id: int = Form(...),
    content: str = Form(...),
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

@router.get("/my")
async def get_my_posts(
    db: db_dependency,
    current_user: dict = Depends(verify_token)
):
    user_id = current_user['id']
    stmt = select(Post).where(Post.user_id == user_id).order_by(Post.created_at.desc())
    posts = db.scalars(stmt).all()
    # return [{
    #     **post.__dict__,
    #     'user': {
    #         'id': post.user.id,
    #         'username': post.user.username,
    #         'avatar': f"data:image/png;base64,{base64.b64encode(post.user.avatar).decode("utf-8")}"
    #     }
    # } for post in posts]
    posts_list = []
    for post in posts:
        user_dict = post.__dict__.copy()
        if post.image:
            image_base64 = base64.b64encode(post.image).decode("utf-8")
            user_dict["image"] = f"data:image/png;base64,{image_base64}"
        posts_list.append(user_dict)
    return posts_list




@router.get("/my-groups")
async def get_my_groups_posts(
    db: db_dependency,
    current_user: dict = Depends(verify_token)
):
    user_id = current_user['id']
    
    user_groups = db.scalars(
        select(GroupMember.group_id)
        .where(GroupMember.user_id == user_id)
    ).all()
    
    if not user_groups:
        return []
    
    stmt = select(Post).where(
        Post.group_id.in_(user_groups)
    ).order_by(Post.created_at.desc())
    
    posts = db.execute(stmt).scalars().all()
    posts_list = []
    for post in posts:
        user_dict = post.__dict__.copy()
        if post.image:
            image_base64 = base64.b64encode(post.image).decode("utf-8")
            user_dict["image"] = f"data:image/png;base64,{image_base64}"
        posts_list.append(user_dict)
    return posts_list






@router.get("/group/{group_id}")
async def get_group_posts(
    group_id: int,
    db: db_dependency,
    current_user: dict = Depends(verify_token)
):
    member = get_group_member(db, current_user['id'], group_id)
    if not member:
        raise HTTPError(403, "Not a member of this group")

    stmt = select(Post).where(Post.group_id == group_id).order_by(Post.created_at.desc())
    posts = db.scalars(stmt).all()
    return [{
        **post.__dict__,
        'user': {
            'id': post.user.id,
            'username': post.user.username,
            'avatar': post.user.avatar
        }
    } for post in posts]






@router.get("/admin/all")
async def get_all_posts_admin(
    db: db_dependency,
    current_user: dict = Depends(verify_token)
):
    if not current_user.get("is_admin"):
        raise HTTPError(403, "Admin only")

    stmt = select(Post).order_by(Post.created_at.desc())
    posts = db.scalars(stmt).all()
    return [{
        **post.__dict__,
        'user': {
            'id': post.user.id,
            'username': post.user.username,
            'avatar': post.user.avatar
        }
    } for post in posts]




@router.put("/{post_id}")
async def edit_post(
    post_id: int,
    content: str,
    db: db_dependency,
    current_user: dict = Depends(verify_token)
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPError(404, "Post not found")

    if post.user_id != current_user["id"]:
        raise HTTPError(403, "You can only edit your own post")

    post.content = content
    db.commit()
    db.refresh(post)
    return {"status": "Post updated", "post": post}




@router.get("/{post_id}")
async def get_post_detail(
    post_id: int,
    db: db_dependency,
    current_user: dict = Depends(verify_token)
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPError(404, "Post not found")

    member = get_group_member(db, current_user['id'], post.group_id)
    if not member:
        raise HTTPError(403, "You must be in the group")

    comments = db.scalars(select(Comment).where(Comment.post_id == post_id)).all()
    reactions = db.scalars(select(Reaction).where(Reaction.post_id == post_id)).all()
    
    return {
        "post": {
            **post.__dict__,
            'user': {
                'id': post.user.id,
                'username': post.user.username,
                'avatar': post.user.avatar
            }
        },
        "comments": [{
            **comment.__dict__,
            'user': {
                'id': comment.user.id,
                'username': comment.user.username,
                'avatar': comment.user.avatar
            }
        } for comment in comments],
        "reactions": reactions
    }


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

@router.post("/comments/{comment_id}/reaction")
async def react_to_comment(
    db: db_dependency,
    comment_id: int,
    reaction_type: str,
    current_user: dict = Depends(verify_token)
):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPError(404, "Comment does not exist")

    post = db.get(Post, comment.post_id)
    member = get_group_member(db, current_user["id"], post.group_id)
    if not member:
        raise HTTPError(403, "Not in group")

    reaction = Reaction(
        comment_id=comment_id,
        user_id=current_user["id"],
        type=reaction_type,
        created_at=datetime.now(timezone.utc)
    )
    db.add(reaction)
    db.commit()
    return {"status": "Reaction added"}


@router.delete("/comment/{comment_id}")
async def delete_comment(
    comment_id: int,
    db: db_dependency,
    current_user: dict = Depends(verify_token)
):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPError(404, "Comment not found")

    if comment.user_id != current_user["id"]:
        raise HTTPError(403, "You can delete only your own comment")

    db.delete(comment)
    db.commit()
    return {"status": "Comment deleted"}

@router.delete("/reaction/{reaction_id}")
async def delete_reaction(
    reaction_id: int,
    db: db_dependency,
    current_user: dict = Depends(verify_token)
):
    reaction = db.get(Reaction, reaction_id)
    if not reaction:
        raise HTTPError(404, "Reaction not found")

    if reaction.user_id != current_user["id"]:
        raise HTTPError(403, "You can delete only your own reaction")

    db.delete(reaction)
    db.commit()
    return {"status": "Reaction deleted"}

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

