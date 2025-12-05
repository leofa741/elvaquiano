'use client';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faShippingFast,
  faExchangeAlt,
  faPhoneVolume,
} from '@fortawesome/free-solid-svg-icons';

const features = [
  {
    icon: faCheck,
    title: 'Compra 100% segura',
  },
  {
    icon: faShippingFast,
    title: 'free envío superior a $50,000',
  },
  {
    icon: faExchangeAlt,
    title: 'Devolución de 5 días',
  },
  {
    icon: faPhoneVolume,
    title: '24/7 Solution',
  },
];

const Featured = () => {
  return (
    <div className="w-full py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex items-center bg-gray-100 p-6 rounded shadow-sm"
          >
            <FontAwesomeIcon
              icon={feature.icon}
              className="text-blue-600 text-3xl mr-4"
            />
            <h5 className="font-semibold text-lg m-0">{feature.title}</h5>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Featured;
