// app/lib/auth.ts
/* eslint-disable */
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import connectDB from './mongoose';
import UserModel from '../models/User';
import ClienteModel from '../models/Cliente'; // ✅ Importar modelo Cliente
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

// ✅ Función para crear cliente automáticamente
// app/lib/auth.ts

// ✅ Función para crear cliente automáticamente (CORREGIDA)
// app/lib/auth.ts

// ✅ Función para crear cliente automáticamente (SOLUCIÓN DEFINITIVA)
// app/lib/auth.ts

// ✅ Función para normalizar teléfono
function normalizeTelefono(text: string): string {
  if (!text) return '00000000';
  return text
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9+]/g, '') || '00000000';
}

// ✅ Función para normalizar razón social
function normalizeRazonSocial(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

// ✅ Función para crear cliente automáticamente (SOLUCIÓN DEFINITIVA)
async function crearClienteAutomatico(userData: {
  name: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  zipCode: string;
  img?: string;
}) {
  try {
    // Verificar si ya existe un cliente con este email
    const clienteExistente = await ClienteModel.findOne({ email: userData.email });

    if (clienteExistente) {
      console.log(`✅ Cliente ya existe para ${userData.email}`);
      return clienteExistente;
    }

    // ✅ 1. Preparar datos con valores por defecto SEGUROS
    const nombre = userData.name?.trim() || 'Usuario';
    const apellido = userData.lastName?.trim() || 'Google';
    const razonSocial = `${nombre} ${apellido} ${userData.email}`.trim();
    const telefono = userData.phone?.trim() || '00000000';

    // ✅ 2. Normalizar campos explícitamente
    const razonSocialNormalized = normalizeRazonSocial(razonSocial);
    const telefonoNormalized = normalizeTelefono(telefono);

    // ✅ 3. Crear cliente PASANDO EXPLÍCITAMENTE todos los campos requeridos
    const nuevoCliente = new ClienteModel({
      razonSocial: razonSocial,
      razonSocialNormalized: razonSocialNormalized,
      nombre: nombre,
      apellido: apellido,
      email: userData.email,
      telefono: telefono,
      telefonoNormalized: telefonoNormalized,
      direccion: userData.address || '',
      ciudad: userData.city || '',
      provincia: '',
      formaPago: 'efectivo',
      activo: true,
      origen: 'registro_automatico'
    });

    const clienteGuardado = await nuevoCliente.save();
    console.log(`✅ Cliente creado automáticamente para ${userData.email}`);

    return clienteGuardado;
  } catch (error: any) {
    console.error('❌ Error creando cliente automático:', error);

    // ✅ Log detallado para debugging
    if (error.errors) {
      Object.keys(error.errors).forEach(key => {
        console.error(`  Campo ${key}: ${error.errors[key].message}`);
      });
    }

    throw error;
  }
}
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
        <p>Se ha detectado un nuevo inicio de sesión en tu cuenta de El Vaquiano Digital.</p>
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

        // ✅ Si es user, crear cliente automáticamente
        if (user.role === 'user') {
          await crearClienteAutomatico({
            name: user.name,
            lastName: user.lastName,
            email: user.email,
            phone: user.phone,
            address: user.address,
            city: user.city,
            zipCode: user.zipCode,
            img: user.img
          });
        }

        const token = jwt.sign(
          {
            id: user.id.toString(),
            email: user.email,
            role: user.role,
            name: user.name,
            lastName: user.lastName,
            phone: user.phone,
            address: user.address,
            city: user.city,
            zipCode: user.zipCode
          },
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

          // ✅ Crear cliente automáticamente para usuarios de Google con rol 'user'
          if (existingUser.role === 'user') {
            await crearClienteAutomatico({
              name: existingUser.name,
              lastName: existingUser.lastName,
              email: existingUser.email,
              phone: existingUser.phone,
              address: existingUser.address,
              city: existingUser.city,
              zipCode: existingUser.zipCode,
              img: existingUser.img
            });
          }
        } else {
          // ✅ Si el usuario ya existe pero no tiene cliente, crearlo
          if (existingUser.role === 'user') {
            await crearClienteAutomatico({
              name: existingUser.name,
              lastName: existingUser.lastName,
              email: existingUser.email,
              phone: existingUser.phone,
              address: existingUser.address,
              city: existingUser.city,
              zipCode: existingUser.zipCode,
              img: existingUser.img
            });
          }
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
          { expiresIn: '5h' }
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