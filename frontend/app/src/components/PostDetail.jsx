import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Navbar } from "./Navbar";
import "./PostDetail.css";

const PostDetail = () => {
  const { postId, groupName } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [group, setGroup] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [newReply, setNewReply] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showReplyForm, setShowReplyForm] = useState(null);

  useEffect(() => {
    const fetchPost = async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        navigate("/");
        return;
      }

      try {
        const res = await fetch(`http://localhost:8000/posts/${postId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Failed to fetch post");
        }

        const data = await res.json();
        setPost(data.post);
        setComments(data.comments);

        // Fetch group details
        if (data.post.group_id) {
          const groupRes = await fetch(`http://localhost:8000/group/${data.post.group_id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (groupRes.ok) {
            const groupData = await groupRes.json();
            setGroup(groupData);
          }
        }
      } catch (error) {
        console.error("Error fetching post:", error);
        setError("Failed to load post. Please try again.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPost();
  }, [postId, navigate]);

  const handleLike = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/posts/${postId}/reaction`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reaction_type: "like" }),
      });

      if (!res.ok) throw new Error("Failed to like post");
      
      // Refresh post data
      const postRes = await fetch(`http://localhost:8000/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (postRes.ok) {
        const data = await postRes.json();
        setPost(data.post);
      }
    } catch (error) {
      console.error("Error liking post:", error);
    }
  };

  const handleDeletePost = async () => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;

    const token = localStorage.getItem("access_token");
    if (!token) return;

    try {
      const res = await fetch(`http://localhost:8000/posts/post/${postId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to delete post");
      
      navigate("/dashboard");
    } catch (error) {
      console.error("Error deleting post:", error);
    }
  };

  const handleComment = async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    if (!newComment.trim()) return;

    try {
      const res = await fetch(`http://localhost:8000/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: newComment }),
      });

      if (!res.ok) throw new Error("Failed to add comment");

      // Refresh post data
      const postRes = await fetch(`http://localhost:8000/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (postRes.ok) {
        const data = await postRes.json();
        setPost(data.post);
        setComments(data.comments);
      }

      setNewComment("");
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleReply = async (commentId) => {
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const replyText = newReply[commentId];
    if (!replyText?.trim()) return;

    try {
      const res = await fetch(`http://localhost:8000/posts/${postId}/comment`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          text: replyText,
          parent_comment_id: commentId 
        }),
      });

      if (!res.ok) throw new Error("Failed to add reply");

      // Refresh post data
      const postRes = await fetch(`http://localhost:8000/posts/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (postRes.ok) {
        const data = await postRes.json();
        setPost(data.post);
        setComments(data.comments);
      }

      setNewReply({ ...newReply, [commentId]: "" });
      setShowReplyForm(null);
    } catch (error) {
      console.error("Error adding reply:", error);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const renderComment = (comment) => {
    const currentUserId = JSON.parse(atob(localStorage.getItem("access_token").split('.')[1])).id;
    const isReply = comment.parent_comment_id !== null;

    return (
      <div key={comment.id} className={`comment ${isReply ? 'reply' : ''}`}>
        <div className="comment-header">
          <strong>{comment.user?.username || "Unknown User"}</strong>
          <span className="comment-time">{formatDate(comment.created_at)}</span>
        </div>
        <p>{comment.text}</p>
        {!isReply && (
          <button
            onClick={() => setShowReplyForm(showReplyForm === comment.id ? null : comment.id)}
            className="reply-button"
          >
            Reply
          </button>
        )}
        {showReplyForm === comment.id && (
          <div className="reply-form">
            <textarea
              value={newReply[comment.id] || ""}
              onChange={(e) => setNewReply({ ...newReply, [comment.id]: e.target.value })}
              placeholder="Write a reply..."
              rows={2}
            />
            <div className="reply-actions">
              <button
                onClick={() => handleReply(comment.id)}
                className="submit-reply"
              >
                Reply
              </button>
              <button
                onClick={() => setShowReplyForm(null)}
                className="cancel-reply"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {comment.replies?.map(reply => renderComment(reply))}
      </div>
    );
  };

  const handleCommentAdded = () => {
    fetchPost();
  };

  const handleReactionUpdated = () => {
    fetchPost();
  };

  if (isLoading) {
    return (
      <div className="wrapper-post-detail">
        <Navbar />
        <div className="post-detail-loading">
          Loading...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="wrapper-post-detail">
        <Navbar />
        <div className="post-detail-error">
          <div className="error-message">{error}</div>
          <button 
            onClick={() => navigate("/dashboard")}
            className="return-button"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="wrapper-post-detail">
        <Navbar />
        <div className="post-detail-error">
          <div className="error-message">Post not found</div>
          <button 
            onClick={() => navigate("/dashboard")}
            className="return-button"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const currentUserId = JSON.parse(atob(localStorage.getItem("access_token").split('.')[1])).id;
  const hasLiked = post.reactions?.some(r => r.user_id === currentUserId && r.type === 'like');
  const likeCount = post.reactions?.filter(r => r.type === 'like').length || 0;

  return (
    <div className="wrapper-post-detail">
      <Navbar />
      <div className="post-detail-container">
        <div className="post-detail-content">
          <div className="breadcrumb">
            <Link to="/dashboard">Dashboard</Link>
            <span className="separator">/</span>
            <Link to={`/group/${group?.name}`}>{group?.name || "Loading..."}</Link>
          </div>

          <div className="post-detail-card">
            <div className="post-header">
              <div>
                <h2>Post by {post.user?.username || "Unknown User"}</h2>
                <small>Posted on {formatDate(post.created_at)}</small>
              </div>
              {post.user_id === currentUserId && (
                <button
                  onClick={handleDeletePost}
                  className="delete-button"
                >
                  Delete
                </button>
              )}
            </div>

            <div className="post-content">
              <p>{post.content}</p>
              {post.image && (
                <img 
                  src={`data:image/png;base64,${post.image}`} 
                  alt="Post" 
                  className="post-image"
                />
              )}
            </div>

            <div className="post-actions">
              <button
                onClick={handleLike}
                className={`like-button ${hasLiked ? 'liked' : ''}`}
              >
                👍 {likeCount}
              </button>
            </div>
          </div>

          <div className="comments-section">
            <h3>Comments</h3>
            <div className="add-comment">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                className="comment-input"
              />
              <button
                onClick={() => {
                  handleComment();
                  handleCommentAdded();
                }}
                className="comment-button"
              >
                Comment
              </button>
            </div>

            <div className="comments-list">
              {comments.filter(comment => !comment.parent_comment_id).map(renderComment)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetail; 