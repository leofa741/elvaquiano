import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import User from '@/app/models/User';

// ✅ Configurar Cloudinary con validación
try {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
  
  console.log('✅ Cloudinary configurado correctamente');
} catch (error) {
  console.error('❌ Error configurando Cloudinary:', error);
}

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json({ message: 'No autorizado' }, { status: 401 });
    }

    const userId = session.user.id;
    const formData = await request.formData();

    const name = formData.get('name') as string;
    const lastName = formData.get('lastName') as string;
    const address = formData.get('address') as string;
    const city = formData.get('city') as string;
    const zipCode = formData.get('zipCode') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const imgFile = formData.get('img') as File;

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({ message: 'Usuario no encontrado' }, { status: 404 });
    }

    let imgUrl = user.img;
    
    // ✅ Solo subir si hay archivo nuevo
    if (imgFile && imgFile.size > 0) {
      try {
        const buffer = Buffer.from(await imgFile.arrayBuffer());

        // ✅ Subir con método más robusto
        const uploadResult = await cloudinary.uploader.upload(
          `data:image/jpeg;base64,${buffer.toString('base64')}`,
          {
            folder: 'profile_images',
            resource_type: 'image',
            format: 'jpg',
            transformation: [
              { width: 500, height: 500, crop: 'fill', gravity: 'face' }
            ]
          }
        );

        imgUrl = uploadResult.secure_url;
        console.log('✅ Imagen subida a Cloudinary:', imgUrl);
      } catch (uploadError: any) {
        console.error('❌ Error subiendo a Cloudinary:', uploadError);
        
        // ✅ Si falla Cloudinary, continuar sin imagen
        console.log('⚠️ Continuando sin actualizar imagen');
        // No lanzar error, continuar con la actualización
      }
    }

    // ✅ Actualizar solo los campos que han cambiado
    const updates: Record<string, any> = {};
    if (name && name !== user.name) updates.name = name;
    if (lastName && lastName !== user.lastName) updates.lastName = lastName;
    if (address && address !== user.address) updates.address = address;
    if (city && city !== user.city) updates.city = city;
    if (zipCode && zipCode !== user.zipCode) updates.zipCode = zipCode;
    if (email && email !== user.email) updates.email = email;
    if (phone && phone !== user.phone) updates.phone = phone;
    if (imgUrl && imgUrl !== user.img) updates.img = imgUrl;

    if (Object.keys(updates).length > 0) {
      await User.findByIdAndUpdate(userId, updates, { new: true });
    }

    // ✅ Obtener el usuario actualizado
    const updatedUser = await User.findById(userId);

    return NextResponse.json({ 
      message: 'Perfil actualizado con éxito',
      user: {
        name: updatedUser.name,
        lastName: updatedUser.lastName,
        address: updatedUser.address,
        city: updatedUser.city,
        zipCode: updatedUser.zipCode,
        email: updatedUser.email,
        phone: updatedUser.phone,
        image: updatedUser.img,
        id: updatedUser._id.toString()
      }
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error en la actualización del perfil:', error);
    return NextResponse.json(
      { 
        message: error instanceof Error ? error.message : 'Error al actualizar el perfil',
        details: error instanceof Error ? error.stack : undefined
      }, 
      { status: 500 }
    );
  }
}