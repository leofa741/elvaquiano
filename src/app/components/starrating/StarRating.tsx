'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar as faStarSolid } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';

interface StarRatingProps {
  productId: string;
  currentRating: number;
  reviewCount: number;
  isLoggedIn: boolean;
  onNotLoggedIn: () => void;
}

const StarRating: React.FC<StarRatingProps> = ({
  productId,
  currentRating,
  reviewCount,
  isLoggedIn,
  onNotLoggedIn,
}) => {
  const [userRating, setUserRating] = useState(currentRating);

  const handleRating = async (newRating: number) => {
    try {
      const res = await fetch(`/api/products/rating?id=${productId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating: newRating }),
      });

      if (res.ok) {
        setUserRating(newRating);
        Swal.fire({
          title: 'Calificación actualizada',
          text: 'Tu calificación ha sido registrada.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
        });
      } else {
        Swal.fire({
          title: 'Error',
          text: 'No se pudo actualizar la calificación.',
          icon: 'error',
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error inesperado.',
        icon: 'error',
      });
      console.error(error);
    }
  };

  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <FontAwesomeIcon
          key={i}
          icon={faStarSolid}
          className={`text-primary mr-1 cursor-pointer ${
            i <= userRating ? 'text-yellow-500' : 'text-gray-300'
          } ${isLoggedIn ? '' : 'cursor-not-allowed opacity-50'}`}
          onClick={isLoggedIn ? () => handleRating(i) : onNotLoggedIn}
        />
      );
    }
    return stars;
  };

  return (
    <div className="flex items-center">
      {renderStars()}
      <span className="text-gray-500 text-xs">
        {reviewCount > 0 ? `(${reviewCount})` : ''}
      </span>
    </div>
  );
};

export default StarRating;
