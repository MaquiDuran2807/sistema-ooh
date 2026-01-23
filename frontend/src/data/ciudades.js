export const ciudades = [
  { nombre: 'ARMENIA', region: 'CO Andes' },
  { nombre: 'BARRANQUILLA', region: 'CO Norte' },
  { nombre: 'BELLO', region: 'CO Andes' },
  { nombre: 'BOGOTA DC', region: 'CO Centro' },
  { nombre: 'BUCARAMANGA', region: 'CO Andes' },
  { nombre: 'CALI', region: 'CO Sur' },
  { nombre: 'CARTAGENA DE INDIAS', region: 'CO Norte' },
  { nombre: 'CORDOBA', region: 'CO Norte' },
  { nombre: 'CUCUTA', region: 'CO Norte' },
  { nombre: 'DUITAMA', region: 'CO Andes' },
  { nombre: 'IBAGUE', region: 'CO Andes' },
  { nombre: 'ITAGUI', region: 'CO Andes' },
  { nombre: 'LA MESA', region: 'CO Centro' },
  { nombre: 'MANIZALES', region: 'CO Andes' },
  { nombre: 'MEDELLIN', region: 'CO Andes' },
  { nombre: 'MONTERÍA', region: 'CO Norte' },
  { nombre: 'MOSQUERA', region: 'CO Centro' },
  { nombre: 'NEIVA', region: 'CO Sur' },
  { nombre: 'PEREIRA', region: 'CO Andes' },
  { nombre: 'POPAYAN', region: 'CO Sur' },
  { nombre: 'SANTA MARTA', region: 'CO Norte' },
  { nombre: 'SESQUILE', region: 'CO Centro' },
  { nombre: 'SINCELEJO', region: 'CO Norte' },
  { nombre: 'SOACHA', region: 'CO Centro' },
  { nombre: 'SOGAMOSO', region: 'CO Andes' },
  { nombre: 'TULUA', region: 'CO Sur' },
  { nombre: 'TUNJA', region: 'CO Andes' },
  { nombre: 'VALLEDUPAR', region: 'CO Norte' },
  { nombre: 'VILLAVICENCIO', region: 'CO Centro' },
  { nombre: 'VITERBO', region: 'CO Andes' },
  { nombre: 'ZIPAQUIRA', region: 'CO Centro' }
];

export const getRegionByCiudad = (ciudad) => {
  const found = ciudades.find(c => c.nombre === ciudad);
  return found ? found.region : '';
};
