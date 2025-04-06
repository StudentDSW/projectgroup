from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, LargeBinary, DateTime, Boolean, ForeignKey
from app.db import Base
from typing import List


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


    class Config:
        from_attributes = True


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)  
    description: Mapped[str] = mapped_column(String)
    avatar:Mapped[LargeBinary] = mapped_column(LargeBinary, nullable=True, default=None)
    creation_date: Mapped[DateTime] = mapped_column(DateTime)
    public: Mapped[bool] = mapped_column(Boolean)

    member_associations: Mapped[List["GroupMember"]] = relationship(back_populates="group", cascade="all, delete")


    class Config:
        from_attributes = True



class GroupMember(Base):
    __tablename__ = "groupmembers"

    group_id: Mapped[int] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
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

    group: Mapped["Group"] = relationship()
    user: Mapped["User"] = relationship()

    comments: Mapped[List["Comment"]] = relationship(back_populates="post", cascade="all, delete")
    reactions: Mapped[List["Reaction"]] = relationship(back_populates="post", cascade="all, delete")

class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey('posts.id', ondelete='CASCADE'))
    user_id: Mapped[int] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'))
    text: Mapped[str] = mapped_column(String)
    created_at: Mapped[DateTime] = mapped_column(DateTime)

    post: Mapped["Post"] = relationship(back_populates="comments")
    user: Mapped["User"] = relationship()

class Reaction(Base):
    __tablename__ = "reactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    type: Mapped[str] = mapped_column(String)  # np. "like", "heart", "laugh"
    created_at: Mapped[DateTime] = mapped_column(DateTime)

    post: Mapped["Post"] = relationship(back_populates="reactions")
    user: Mapped["User"] = relationship()    