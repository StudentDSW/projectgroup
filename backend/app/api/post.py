from fastapi import APIRouter, HTTPException, Depends, File, UploadFile, Form
from sqlalchemy.orm import Session
from sqlalchemy import select, delete, and_
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
    try:
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
            post_dict = post.__dict__.copy()
            
            # Handle user data safely
            if post.user:
                post_dict['user'] = {
                    'id': post.user.id,
                    'username': post.user.username,
                    'avatar': base64.b64encode(post.user.avatar).decode('utf-8') if post.user.avatar else None
                }
            else:
                post_dict['user'] = {
                    'id': None,
                    'username': 'Unknown User',
                    'avatar': None
                }
            
            # Get reactions
            reactions = db.scalars(select(Reaction).where(Reaction.post_id == post.id)).all()
            post_dict['reactions'] = reactions
            
            # Get comments
            comments = db.scalars(select(Comment).where(Comment.post_id == post.id)).all()
            post_dict['comments'] = [{
                **comment.__dict__,
                'user': {
                    'id': comment.user.id,
                    'username': comment.user.username,
                    'avatar': base64.b64encode(comment.user.avatar).decode('utf-8') if comment.user.avatar else None
                } if comment.user else None
            } for comment in comments]
            
            # Handle image data
            if post.image:
                try:
                    post_dict["image"] = f"data:image/png;base64,{base64.b64encode(post.image).decode('utf-8')}"
                except:
                    post_dict["image"] = None
            
            posts_list.append(post_dict)
            
        return posts_list
    except Exception as e:
        print(f"Error in get_my_groups_posts: {str(e)}")
        raise HTTPError(500, f"Internal server error: {str(e)}")

@router.get("/group/{group_id}")
async def get_group_posts(
    group_id: int,
    db: db_dependency,
    current_user: dict = Depends(verify_token)
):
    try:
        member = get_group_member(db, current_user['id'], group_id)
        if not member:
            raise HTTPError(403, "Not a member of this group")

        stmt = select(Post).where(Post.group_id == group_id).order_by(Post.created_at.desc())
        posts = db.scalars(stmt).all()
        
        posts_list = []
        for post in posts:
            post_dict = post.__dict__.copy()
            # Handle user data safely
            if post.user:
                post_dict['user'] = {
                    'id': post.user.id,
                    'username': post.user.username,
                    'avatar': base64.b64encode(post.user.avatar).decode('utf-8') if post.user.avatar else None
                }
            else:
                post_dict['user'] = {
                    'id': None,
                    'username': 'Unknown User',
                    'avatar': None
                }
            
            # Get reactions
            reactions = db.scalars(select(Reaction).where(Reaction.post_id == post.id)).all()
            post_dict['reactions'] = reactions
            
            # Get comments
            comments = db.scalars(select(Comment).where(Comment.post_id == post.id)).all()
            post_dict['comments'] = [{
                **comment.__dict__,
                'user': {
                    'id': comment.user.id,
                    'username': comment.user.username,
                    'avatar': base64.b64encode(comment.user.avatar).decode('utf-8') if comment.user.avatar else None
                } if comment.user else None
            } for comment in comments]
            
            # Handle image data
            if post.image:
                try:
                    post_dict["image"] = f"data:image/png;base64,{base64.b64encode(post.image).decode('utf-8')}"
                except:
                    post_dict["image"] = None
            
            posts_list.append(post_dict)
            
        return posts_list
    except Exception as e:
        print(f"Error in get_group_posts: {str(e)}")
        raise HTTPError(500, f"Internal server error: {str(e)}")

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

@router.post('/{post_id}/comment')
async def comment_on_post(
    db: db_dependency,
    post_id: int,
    text: str = Form(...),
    current_user: dict = Depends(verify_token)
):
    try:
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
        db.refresh(comment)

        # Return the comment with user data
        return {
            "id": comment.id,
            "text": comment.text,
            "created_at": comment.created_at,
            "user": {
                "id": comment.user.id,
                "username": comment.user.username,
                "avatar": base64.b64encode(comment.user.avatar).decode('utf-8') if comment.user.avatar else None
            }
        }
    except Exception as e:
        print(f"Error in comment_on_post: {str(e)}")
        raise HTTPError(500, f"Internal server error: {str(e)}")

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

    # Check if user already has a reaction of this type
    existing_reaction = db.scalars(
        select(Reaction).where(
            and_(
                Reaction.post_id == post_id,
                Reaction.user_id == user_id,
                Reaction.type == reaction_type
            )
        )
    ).first()

    if existing_reaction:
        # If reaction exists, remove it (toggle off)
        db.delete(existing_reaction)
        db.commit()
        return {"status": "Reaction removed"}

    # Check if user has an opposite reaction
    opposite_type = "dislike" if reaction_type == "like" else "like"
    opposite_reaction = db.scalars(
        select(Reaction).where(
            and_(
                Reaction.post_id == post_id,
                Reaction.user_id == user_id,
                Reaction.type == opposite_type
            )
        )
    ).first()

    if opposite_reaction:
        # Remove the opposite reaction
        db.delete(opposite_reaction)

    # Add the new reaction
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

    # Check if user already has a reaction of this type
    existing_reaction = db.scalars(
        select(Reaction).where(
            and_(
                Reaction.comment_id == comment_id,
                Reaction.user_id == current_user["id"],
                Reaction.type == reaction_type
            )
        )
    ).first()

    if existing_reaction:
        # If reaction exists, remove it (toggle off)
        db.delete(existing_reaction)
        db.commit()
        return {"status": "Reaction removed"}

    # Check if user has an opposite reaction
    opposite_type = "dislike" if reaction_type == "like" else "like"
    opposite_reaction = db.scalars(
        select(Reaction).where(
            and_(
                Reaction.comment_id == comment_id,
                Reaction.user_id == current_user["id"],
                Reaction.type == opposite_type
            )
        )
    ).first()

    if opposite_reaction:
        # Remove the opposite reaction
        db.delete(opposite_reaction)

    # Add the new reaction
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

@router.get("/{post_id}")
async def get_post_detail(
    post_id: int,
    db: db_dependency,
    current_user: dict = Depends(verify_token)
):
    try:
        post = db.get(Post, post_id)
        if not post:
            raise HTTPError(404, "Post not found")

        member = get_group_member(db, current_user['id'], post.group_id)
        if not member:
            raise HTTPError(403, "You must be in the group")

        comments = db.scalars(select(Comment).where(Comment.post_id == post_id)).all()
        reactions = db.scalars(select(Reaction).where(Reaction.post_id == post_id)).all()
        
        # Handle image data safely
        post_dict = post.__dict__.copy()
        if post.image:
            try:
                post_dict["image"] = f"data:image/png;base64,{base64.b64encode(post.image).decode('utf-8')}"
            except:
                post_dict["image"] = None
        
        return {
            "post": {
                **post_dict,
                'user': {
                    'id': post.user.id,
                    'username': post.user.username,
                    'avatar': base64.b64encode(post.user.avatar).decode('utf-8') if post.user.avatar else None
                }
            },
            "comments": [{
                **comment.__dict__,
                'user': {
                    'id': comment.user.id,
                    'username': comment.user.username,
                    'avatar': base64.b64encode(comment.user.avatar).decode('utf-8') if comment.user.avatar else None
                }
            } for comment in comments],
            "reactions": reactions
        }
    except Exception as e:
        print(f"Error in get_post_detail: {str(e)}")
        raise HTTPError(500, f"Internal server error: {str(e)}")

