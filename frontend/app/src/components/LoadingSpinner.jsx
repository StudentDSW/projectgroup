import React from 'react';
import { ClipLoader } from 'react-spinners';
import './LoadingSpinner.css';

const LoadingSpinner = ({ loading, size = 50, color = "#007bff" }) => {
  if (!loading) return null;

  return (
    <div className="loading-spinner-container">
      <ClipLoader
        color={color}
        loading={loading}
        size={size}
        aria-label="Loading Spinner"
      />
    </div>
  );
};

export default LoadingSpinner; 