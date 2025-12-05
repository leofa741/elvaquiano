
// app/api/send-mail/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { name, email, phone, asunto, message, businessType } = await req.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: 'Todos los campos obligatorios deben estar completos.' },
        { status: 400 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: process.env.MAILER_SERVICE || 'gmail',
      auth: {
        user: process.env.MAILER_EMAIL,
        pass: process.env.MAILER_SECRET_KEY,
      },
    });

    // Mapeo legible del tipo de negocio
    const businessTypeLabel: Record<string, string> = {
      kiosco: 'Kiosco / Minimercado',
      restaurante: 'Restaurante / Bar',
      dietetica: 'Dietetica / Tienda naturalista',
      almacen: 'Almacén / Supermercado',
      otro: 'Otro',
    };

    const mailOptions = {
      from: `"El Vaquiano - Contacto Comercial" <${process.env.MAILER_EMAIL}>`,
      to: process.env.MAILER_EMAIL,
      subject: `📩 Nuevo lead comercial: ${name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9; border-radius: 8px;">
          <h2 style="color: #b91c1c; text-align: center; margin-bottom: 20px;">Nueva consulta comercial</h2>
          <p><strong>Nombre:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Teléfono:</strong> ${phone || 'No proporcionado'}</p>
          <p><strong>Tipo de negocio:</strong> ${businessType ? businessTypeLabel[businessType] || businessType : 'No especificado'}</p>
          ${asunto ? `<p><strong>Asunto:</strong> ${asunto}</p>` : ''}
          <div style="background: white; padding: 12px; border-radius: 6px; margin-top: 12px;">
            <p style="margin: 0;"><strong>Mensaje:</strong></p>
            <p style="margin: 8px 0 0 0; color: #333;">${message.replace(/\n/g, '<br>')}</p>
          </div>
          <hr style="margin: 20px 0; border: 0; border-top: 1px solid #eee;">
          <p style="font-size: 0.9em; color: #777; text-align: center;">
            Este mensaje fue enviado desde el formulario de contacto de <strong>El Vaquiano</strong>.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    return NextResponse.json({ success: true, message: '¡Consulta enviada! Nuestro equipo te contactará pronto.' });
  } catch (error) {
    console.error('Error al enviar el correo:', error);
    return NextResponse.json(
      { success: false, message: 'Error al enviar la consulta. Inténtalo más tarde.' },
      { status: 500 }
    );
  }
}
// en la seguridad de cuenta de gmail activar dos pasos y crear la contraseña de aplicaciones y crear las variables en .env