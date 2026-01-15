export const formatARS = (value: number) => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};



export const parseARS = (value: string) => {
  if (!value) return 0;
  return Number(
    value
      .replace(/\$/g, '')
      .replace(/\./g, '')
      .replace(',', '.')
      .trim()
  );
};