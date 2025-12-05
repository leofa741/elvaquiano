/* eslint-disable */
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useState } from "react";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";

const renderInteractiveStars = (initialRating: number, onRate: (newRating: number) => void) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onRate(star)}
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className="focus:outline-none"
        >
          <FontAwesomeIcon
            icon={faStarSolid}
            className={`mr-1 ${
              (hoverRating || initialRating) >= star ? "text-yellow-400" : "text-gray-300"
            } transition`}
          />
        </button>
      ))}
    </div>
  );
};
export default renderInteractiveStars;


