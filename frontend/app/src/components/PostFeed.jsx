import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import CommentSection from "./comment-section";
import LoadingSpinner from "./LoadingSpinner";
import "./PostFeed.css";
import { FaTrash } from 'react-icons/fa';

const POSTS_PER_PAGE = 10;

const PostFeed = ({ 
  posts, 
  groups, 
  onLike, 
  onDelete, 
  userRole, 
  groupId = null,
  onCommentAdded,
  onCommentReaction,
  onDeleteComment,
  fetchMorePosts
}) => {
  const navigate = useNavigate();
  const token = localStorage.getItem("access_token");
  const currentUserId = token ? JSON.parse(atob(token.split('.')[1])).id : null;
  const [showComments, setShowComments] = useState({});
  const [visiblePosts, setVisiblePosts] = useState([]);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();

  // Memoize filtered posts
  const filteredPosts = useMemo(() => {
    return groupId 
      ? posts.filter(post => post.group_id === groupId)
      : posts;
  }, [posts, groupId]);

  const lastPostElementRef = useCallback(node => {
    if (isLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoading, hasMore]);

  useEffect(() => {
    const loadPosts = async () => {
      if (isLoading) return;
      
      setIsLoading(true);
      try {
        // Create a Set to track unique post IDs
        const uniquePostIds = new Set();
        const newPosts = filteredPosts.filter(post => {
          if (uniquePostIds.has(post.id)) {
            return false;
          }
          uniquePostIds.add(post.id);
          return true;
        });

        const startIndex = 0;
        const endIndex = page * POSTS_PER_PAGE;
        const paginatedPosts = newPosts.slice(startIndex, endIndex);
        
        if (paginatedPosts.length < POSTS_PER_PAGE) {
          setHasMore(false);
        }
        
        setVisiblePosts(paginatedPosts);
        
        // If we have a fetchMorePosts function and we're running out of posts
        if (fetchMorePosts && paginatedPosts.length >= (page * POSTS_PER_PAGE) - 5) {
          await fetchMorePosts();
        }
      } catch (error) {
        console.error('Error loading posts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPosts();
  }, [page, filteredPosts, fetchMorePosts]);

  const toggleComments = (postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const getAvatarUrl = (avatar) => {
    if (!avatar) return "/default-avatar.jpg";
    if (avatar.startsWith("data:image")) {
      return avatar;
    }
    if (avatar.startsWith("http")) {
      return avatar;
    }
    if (avatar.match(/^[A-Za-z0-9+/=]+$/)) {
      return `data:image/png;base64,${avatar}`;
    }
    return "/default-avatar.jpg";
  };

  const renderPost = (post, index) => {
    if (!post) return null;

    const hasLiked = post.reactions?.some(r => r.user_id === currentUserId && r.type === 'like');
    const hasDisliked = post.reactions?.some(r => r.user_id === currentUserId && r.type === 'dislike');
    const likeCount = post.reactions?.filter(r => r.type === 'like').length || 0;
    const dislikeCount = post.reactions?.filter(r => r.type === 'dislike').length || 0;
    const commentCount = post.comments?.length || 0;
    const group = groups?.find(g => g.id === post.group_id);

    // Add ref to the last post element
    const isLastPost = index === visiblePosts.length - 1;
    const postRef = isLastPost ? lastPostElementRef : null;

    return (
      <div key={post.id} className="post" ref={postRef}>
        <div className="post-header">
          <div className="post-author">
            <img
              src={getAvatarUrl(post.user?.avatar)}
              alt={`${post.user?.username || "User"}'s avatar`}
              className="avatar-image"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = "/default-avatar.jpg";
              }}
            />
            <div className="post-info">
              <span className="author-name">{post.user?.username || "Unknown User"}</span>
              {!groupId && group && (
                <span 
                  className="group-name"
                  onClick={() => navigate(`/group/${group.name}`)}
                >
                  in {group.name}
                </span>
              )}
            </div>
          </div>
          {(post.user_id === currentUserId || userRole === "admin") && (
            <button
              onClick={() => onDelete(post.id)}
              className="delete-post-btn"
              title="Delete post"
            >
              <FaTrash />
            </button>
          )}
        </div>

        <div className="post-content">
          <p>{post.content}</p>
          {post.image && (
            <img src={post.image} alt="Post" className="post-image" />
          )}
        </div>

        <div className="post-footer">
          <button
            onClick={() => onLike(post.id, 'like')}
            className={`reaction-btn like-btn ${hasLiked ? "active" : ""}`}
          >
            👍 {likeCount}
          </button>
          <button
            onClick={() => onLike(post.id, 'dislike')}
            className={`reaction-btn dislike-btn ${hasDisliked ? "active" : ""}`}
          >
            👎 {dislikeCount}
          </button>
          <button
            onClick={() => toggleComments(post.id)}
            className={`reaction-btn comment-btn ${showComments[post.id] ? "active" : ""}`}
          >
            💬 {commentCount}
          </button>
        </div>

        <div className="post-timestamp">
          Posted on {new Date(post.created_at).toLocaleString()}
        </div>

        {showComments[post.id] && (
          <CommentSection 
            postId={post.id}
            comments={post.comments || []}
            currentUserId={currentUserId}
            userRole={userRole}
            onComment={onCommentAdded}
            onDeleteComment={onDeleteComment}
            onCommentReaction={onCommentReaction}
            isLoggedIn={!!token}
          />
        )}
      </div>
    );
  };

  if (!Array.isArray(posts)) {
    console.error("Posts prop is not an array:", posts);
    return (
      <div className="posts-grid">
        <div className="no-posts">
          <p>Error loading posts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="posts-grid">
      {visiblePosts.length === 0 ? (
        <div className="no-posts">
          <p>{groupId ? "No posts in this group yet." : "No posts yet. Join a group to see posts here."}</p>
        </div>
      ) : (
        <>
          {visiblePosts.map((post, index) => renderPost(post, index))}
          {isLoading && <LoadingSpinner loading={true} />}
        </>
      )}
    </div>
  );
};

export default PostFeed; 