// scripts/check-indexes.ts
import connectDB from '../src/app/lib/mongoose';
import Cliente from '../src/app/models/Cliente';

async function checkIndexes() {
  try {
    await connectDB();
    console.log('🔌 Conectado a MongoDB\n');

    const indexes = await Cliente.collection.indexes();
    console.log('📋 Índices actuales en la colección "clientes":\n');
    
    indexes.forEach((index: any) => {
      console.log(`Nombre: ${index.name}`);
      console.log(`Campos: ${JSON.stringify(index.key)}`);
      console.log(`Unique: ${index.unique || false}`);
      console.log(`Sparse: ${index.sparse || false}`);
      console.log('---');
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

checkIndexes();