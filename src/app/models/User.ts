/* eslint-disable */
import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
    name: string;
    lastName: string;
    phone: string;
    address : String;
    city  :   String;
    zipCode  :String;
    img: string;
    google: string;
    email: string;
    password: string;
    role: string;
    resetPasswordToken: string,
    resetPasswordExpires: number,
    comparePassword: (password: string) => Promise<boolean>;
}

const UserSchema = new Schema<IUser>({
    name: { type: String, default: '' },
    lastName: { type: String, default: '' },
    address: { type: String, default: '' }, // Asegúrate de que este campo esté aquí
    city: { type: String, default: '' },   // Asegúrate de que este campo esté aquí
    zipCode: { type: String, default: '' },// Asegúrate de que este campo esté aquí
    phone: { type: String, default: '' },  // Asegúrate de que este campo esté aquí
    img: { type: String, default: '' },
    google: { type: String, default: '' },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    resetPasswordToken: { type: String }, // Tipo primitivo string
    resetPasswordExpires: { type: Number }, // Tipo primitivo number
    role: { type: String, default: 'user' }, // Rol por defecto
});

// Middleware para hashear la contraseña antes de guardar
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return await bcrypt.compare(password, this.password);
};

// Verificar si el modelo ya existe antes de definirlo
const User = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;