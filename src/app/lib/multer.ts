import multer from 'multer';

// Configurar multer para almacenar archivos en memoria
const storage = multer.memoryStorage();

// Crear un objeto multer con la configuración de almacenamiento
const upload = multer({ storage: storage });

// Exportar como un middleware para su uso
export default upload;
