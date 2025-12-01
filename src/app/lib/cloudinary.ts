
import { v2 as cloudinary } from 'cloudinary';

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const uploadImage = async (image: string) => {
  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: 'products',
    });
    return result.secure_url; // Devuelve la URL segura de la imagen
  } catch (err) {
    throw new Error('Error uploading image to Cloudinary');
  }
};

export default cloudinary;
