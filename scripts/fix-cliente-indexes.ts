import mongoose from 'mongoose';
import connectDB from '@/app/lib/mongoose';
import Cliente from '@/app/models/Cliente';

async function fixIndexes() {
  try {
    await connectDB();
    console.log('🔌 Conectado a MongoDB');

    // Eliminar índices viejos
    try {
      await Cliente.collection.dropIndex('dni_1');
      console.log('✅ Índice dni_1 eliminado');
    } catch (e: any) {
      console.log('ℹ️ dni_1 no existía o ya fue eliminado');
    }

    try {
      await Cliente.collection.dropIndex('email_1');
      console.log('✅ Índice email_1 eliminado');
    } catch (e: any) {
      console.log('ℹ️ email_1 no existía o ya fue eliminado');
    }

    // Recrear índices según el schema (ahora con sparse: true)
    await Cliente.ensureIndexes();
    console.log('✅ Índices recreados correctamente con sparse: true');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

fixIndexes();