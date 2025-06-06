from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, LargeBinary, DateTime, Boolean, ForeignKey
from app.db import Base
from typing import List, Optional


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)  
    hashed_password: Mapped[str] = mapped_column(String)
    email:Mapped[str] = mapped_column(String, unique=True, index=True)
    avatar:Mapped[LargeBinary] = mapped_column(LargeBinary, nullable=True)
    registration_date: Mapped[DateTime] = mapped_column(DateTime)
    role: Mapped[str] = mapped_column(String, default="user")
    status: Mapped[str] = mapped_column(String, default="active")

    group_associations: Mapped[List["GroupMember"]] = relationship(back_populates="user", cascade="all, delete")
    posts: Mapped[List["Post"]] = relationship(back_populates="user", cascade="all, delete")
    comments: Mapped[List["Comment"]] = relationship(back_populates="user", cascade="all, delete")
    reactions: Mapped[List["Reaction"]] = relationship(back_populates="user", cascade="all, delete")


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)  
    description: Mapped[str] = mapped_column(String)
    avatar:Mapped[LargeBinary] = mapped_column(LargeBinary, nullable=True, default=None)
    creation_date: Mapped[DateTime] = mapped_column(DateTime)
    public: Mapped[bool] = mapped_column(Boolean)

    member_associations: Mapped[List["GroupMember"]] = relationship(back_populates="group", cascade="all, delete")
    posts: Mapped[List["Post"]] = relationship(back_populates="group", cascade="all, delete")



class GroupMember(Base):
    __tablename__ = "groupmembers"

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True, index=True)
    role: Mapped[str] = mapped_column(String, default="user")

    user: Mapped["User"] = relationship(back_populates="group_associations")
    group: Mapped["Group"] = relationship(back_populates="member_associations")



class Post(Base):
    __tablename__ = 'posts'

    id:Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    group_id: Mapped[int] = mapped_column(ForeignKey('groups.id', ondelete='CASCADE'), index=True)
    user_id:  Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    content: Mapped[str] = mapped_column(String)
    image: Mapped[LargeBinary] = mapped_column(LargeBinary, nullable=True)
    created_at: Mapped[DateTime] = mapped_column(DateTime)

    user: Mapped["User"] = relationship(back_populates="posts")
    comments: Mapped[List["Comment"]] = relationship(back_populates="post", cascade="all, delete")
    reactions: Mapped[List["Reaction"]] = relationship(back_populates="post", cascade="all, delete")
    group: Mapped["Group"] = relationship(back_populates="posts")


class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey('posts.id', ondelete='CASCADE'), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    text: Mapped[str] = mapped_column(String)
    created_at: Mapped[DateTime] = mapped_column(DateTime)

    post: Mapped["Post"] = relationship(back_populates="comments")
    user: Mapped["User"] = relationship(back_populates="comments")

class Reaction(Base):
    __tablename__ = "reactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    comment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("comments.id", ondelete="CASCADE"), index=True, nullable=True)
    type: Mapped[str] = mapped_column(String)  
    created_at: Mapped[DateTime] = mapped_column(DateTime)

    post: Mapped["Post"] = relationship(back_populates="reactions")
    user: Mapped["User"] = relationship()    