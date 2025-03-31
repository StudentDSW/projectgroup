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