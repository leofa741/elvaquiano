/* eslint-disable */
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from './mongoose';
import UserModel from '../models/User';
import { NextRequest } from 'next/server';
import LogModel from '../models/LogLogin';
import nodemailer from "nodemailer";

connectDB();

export interface DecodedToken {
  id: string;
  email: string;
  role: string;
}

type ExtendedUser = {
  id: string;
  email: string;
  role: string;
  name: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  image: string;
  token: string;
};
// === Función para enviar email al iniciar sesión ===


async function sendLoginEmail(to: string) {
  try {
    const transporter = nodemailer.createTransport({
      service: process.env.MAILER_SERVICE,
      auth: {
        user: process.env.MAILER_EMAIL,
        pass: process.env.MAILER_SECRET_KEY,
      },
    });

    await transporter.sendMail({
      from: `"Soporte" <${process.env.MAILER_EMAIL}>`,
      to,
      subject: "Nuevo inicio de sesión detectado",
      html: `
        <h2>Hola!</h2>
        <p>Se ha detectado un nuevo inicio de sesión en tu cuenta de  El Vaquiano Digital.</p>
        <p><strong>Email:</strong> ${to}</p>
        <p><strong>Fecha:</strong> ${new Date().toLocaleString("es-AR")}</p>
        <br/>
        <p>Si no fuiste vos, cambia tu contraseña de inmediato.</p>
      `,
    });
  } catch (error) {
    console.error("❌ Error enviando email de login:", error);
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.ID_GOOGLE as string,
      clientSecret: process.env.GOOGLE_SECRET as string,
    }),

    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },

      async authorize(credentials): Promise<ExtendedUser | null> {
        await connectDB();

        const user = await UserModel.findOne({ email: credentials?.email });
        if (!user) throw new Error('Usuario no encontrado');

        const isMatch = await bcrypt.compare(credentials!.password, user.password);
        if (!isMatch) throw new Error('Contraseña incorrecta');

        const token = jwt.sign(
          { id: user.id.toString(), email: user.email, role: user.role },
          process.env.JWT_SECRET as string,
          { expiresIn: '5h' }
        );

        return {
          id: user.id.toString(),
          email: user.email,
          role: user.role,
          name: user.name,
          lastName: user.lastName || '',
          phone: user.phone || '',
          address: user.address || '',
          city: user.city || '',
          zipCode: user.zipCode || '',
          image: user.img,
          token,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      await connectDB();

      // Si es Google
      if (account?.provider === 'google') {
        let existingUser = await UserModel.findOne({ email: user.email });

        if (!existingUser) {
          existingUser = new UserModel({
            name: user.name || '',
            lastName: '',
            phone: '',
            address: '',
            city: '',
            zipCode: '',
            email: user.email,
            img: user.image || '',
            password: await bcrypt.hash('google-auth', 10),
            role: 'user',
            google: true,
          });
          await existingUser.save();
        }

        const token = jwt.sign(
          {
            id: existingUser.id.toString(),
            email: existingUser.email,
            role: existingUser.role,
            name: existingUser.name,
            lastName: existingUser.lastName,
            phone: existingUser.phone,
            address: existingUser.address,
            city: existingUser.city,
            zipCode: existingUser.zipCode,
          },
          process.env.JWT_SECRET as string,
          { expiresIn: '1h' }
        );

        const u = user as ExtendedUser;
        u.id = existingUser.id.toString();
        u.role = existingUser.role;
        u.token = token;
        u.lastName = existingUser.lastName || '';
        u.phone = existingUser.phone || '';
        u.address = existingUser.address || '';
        u.city = existingUser.city || '';
        u.zipCode = existingUser.zipCode || '';
        u.image = existingUser.img || '';
        u.name = existingUser.name || '';
      }



      // ⬅️⬅️ REGISTRO EN BITÁCORA (SOLO ADMIN Y SUPERADMIN)

      try {
        const role =
          (user as any).role ||
          (account?.provider === 'google'
            ? (await UserModel.findOne({ email: user.email }))?.role
            : null);

        if (role === 'admin' || role === 'superadmin' || role === 'vendedor') {
          await LogModel.create({
            email: user.email,
            provider: account?.provider || 'credentials',
            timestamp: new Date(),
          });
        }
      } catch (error) {
        console.error("Error guardando bitácora:", error);
      }

      // === Enviar email al usuario notificando inicio de sesión ===
      await sendLoginEmail(user.email as string);
      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        const u = user as ExtendedUser;
        token.id = u.id;
        token.email = u.email;
        token.role = u.role;
        token.name = u.name;
        token.lastName = u.lastName;
        token.phone = u.phone;
        token.address = u.address;
        token.city = u.city;
        token.zipCode = u.zipCode;
        token.image = u.image;
        token.token = u.token;
      }
      return token;
    },

    async session({ session, token }) {
      const t = token as any;
      session.user.id = t.id;
      session.user.email = t.email;
      session.user.role = t.role;
      session.user.lastName = t.lastName;
      session.user.phone = t.phone;
      session.user.address = t.address;
      session.user.city = t.city;
      session.user.zipCode = t.zipCode;
      session.user.name = t.name;
      session.user.token = t.token || t.accessToken;
      return session;
    },
  },

  secret: process.env.JWT_SECRET,
};

// Helpers de admin (los dejo igual)
export const verifyAdmin = async (req: NextRequest): Promise<DecodedToken | null> => {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;

    return decoded.role === 'admin' ? decoded : null;
  } catch {
    return null;
  }
};

export const verifyAdminToken = (token: string): DecodedToken | null => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken;
    return decoded.role === 'admin' ? decoded : null;
  } catch {
    return null;
  }
};
