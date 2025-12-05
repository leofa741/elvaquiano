// types.d.ts
export interface FormidableResult {
    fields: {
      [key: string]: string | string[]; // Los campos pueden ser cadenas o arrays de cadenas
    };
    files: {
      [key: string]: {
        name: string; // Nombre del archivo
        data: Buffer; // Datos del archivo
        size: number; // Tamaño del archivo
        filepath: string; // Ruta temporal del archivo
        mimetype: string; // Tipo MIME del archivo
      };
    };
  }