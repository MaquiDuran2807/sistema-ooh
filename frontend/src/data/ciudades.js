export const ciudades = [
  { nombre: 'ARMENIA', region: 'CO Andes', latitud: 4.5339, longitud: -75.6811, radio: 12 },
  { nombre: 'BARRANQUILLA', region: 'CO Norte', latitud: 10.9685, longitud: -74.7813, radio: 25 },
  { nombre: 'BELLO', region: 'CO Andes', latitud: 6.3370, longitud: -75.5547, radio: 10 },
  { nombre: 'BOGOTA DC', region: 'CO Centro', latitud: 4.7110, longitud: -74.0721, radio: 45 },
  { nombre: 'BUCARAMANGA', region: 'CO Andes', latitud: 7.1254, longitud: -73.1198, radio: 20 },
  { nombre: 'CALI', region: 'CO Sur', latitud: 3.4516, longitud: -76.5320, radio: 30 },
  { nombre: 'CARTAGENA DE INDIAS', region: 'CO Norte', latitud: 10.3910, longitud: -75.4794, radio: 20 },
  { nombre: 'CORDOBA', region: 'CO Norte', latitud: 8.7479, longitud: -75.8195, radio: 15 },
  { nombre: 'CUCUTA', region: 'CO Norte', latitud: 7.8939, longitud: -72.5078, radio: 18 },
  { nombre: 'DUITAMA', region: 'CO Andes', latitud: 5.8267, longitud: -73.0338, radio: 8 },
  { nombre: 'IBAGUE', region: 'CO Andes', latitud: 4.4389, longitud: -75.2322, radio: 15 },
  { nombre: 'ITAGUI', region: 'CO Andes', latitud: 6.1849, longitud: -75.5994, radio: 10 },
  { nombre: 'LA MESA', region: 'CO Centro', latitud: 4.6333, longitud: -74.4667, radio: 8 },
  { nombre: 'MANIZALES', region: 'CO Andes', latitud: 5.0703, longitud: -75.5138, radio: 15 },
  { nombre: 'MEDELLIN', region: 'CO Andes', latitud: 6.2476, longitud: -75.5658, radio: 35 },
  { nombre: 'MONTERÍA', region: 'CO Norte', latitud: 8.7479, longitud: -75.8814, radio: 15 },
  { nombre: 'MOSQUERA', region: 'CO Centro', latitud: 4.7061, longitud: -74.2303, radio: 10 },
  { nombre: 'NEIVA', region: 'CO Sur', latitud: 2.9273, longitud: -75.2819, radio: 15 },
  { nombre: 'PEREIRA', region: 'CO Andes', latitud: 4.8087, longitud: -75.6906, radio: 15 },
  { nombre: 'POPAYAN', region: 'CO Sur', latitud: 2.4419, longitud: -76.6063, radio: 12 },
  { nombre: 'SANTA MARTA', region: 'CO Norte', latitud: 11.2404, longitud: -74.2110, radio: 18 },
  { nombre: 'SESQUILE', region: 'CO Centro', latitud: 5.0550, longitud: -73.7878, radio: 6 },
  { nombre: 'SINCELEJO', region: 'CO Norte', latitud: 9.3047, longitud: -75.3978, radio: 12 },
  { nombre: 'SOACHA', region: 'CO Centro', latitud: 4.5793, longitud: -74.2167, radio: 12 },
  { nombre: 'SOGAMOSO', region: 'CO Andes', latitud: 5.7167, longitud: -72.9343, radio: 10 },
  { nombre: 'TULUA', region: 'CO Sur', latitud: 4.0892, longitud: -76.1953, radio: 10 },
  { nombre: 'TUNJA', region: 'CO Andes', latitud: 5.5353, longitud: -73.3678, radio: 12 },
  { nombre: 'VALLEDUPAR', region: 'CO Norte', latitud: 10.4631, longitud: -73.2532, radio: 18 },
  { nombre: 'VILLAVICENCIO', region: 'CO Centro', latitud: 4.1420, longitud: -73.6266, radio: 20 },
  { nombre: 'VITERBO', region: 'CO Andes', latitud: 5.0667, longitud: -75.8833, radio: 6 },
  { nombre: 'ZIPAQUIRA', region: 'CO Centro', latitud: 5.0214, longitud: -73.9967, radio: 10 }
];

export const getRegionByCiudad = (ciudad) => {
  const found = ciudades.find(c => c.nombre === ciudad);
  return found ? found.region : '';
};
