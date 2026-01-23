export const marcas = [
  { 
    nombre: 'AGUILA', 
    categoria: 'CERVEZAS',
    campanas: ['127', 'FRANCHISE', '2 BOT FRIAS', 'AGUILA IMPERIAL', 'BIG PROMO', 'FERIAS Y FIESTAS', 'FIESTAS DEL MAR', 'LIGHT', 'LIGHT - LDACs PLATFORM', 'SABOR DEL CARIBE']
  },
  { 
    nombre: 'BBC', 
    categoria: 'CERVEZAS',
    campanas: ['127', 'SONIDOS EN LA CUMBRE']
  },
  { 
    nombre: 'CBM', 
    categoria: 'CERVEZAS',
    campanas: ['PIENSA X2']
  },
  { 
    nombre: 'CFC', 
    categoria: 'CERVEZAS',
    campanas: ['BIG PROMO']
  },
  { 
    nombre: 'CLUB COLOMBIA', 
    categoria: 'CERVEZAS',
    campanas: ['127', '20 JULIO', '473', '7 DE AGOSTO', 'CORDILLERA', 'MOCCA', 'TRIGO']
  },
  { 
    nombre: 'COLA & POLA', 
    categoria: 'CERVEZAS',
    campanas: ['127', 'NEW VBI']
  },
  { 
    nombre: 'CORONA', 
    categoria: 'CERVEZAS',
    campanas: ['100 YEARS', 'AON 100 YEARS', 'AON NATURAL', 'BEER', 'NATURAL', 'SUNSET SESSION']
  },
  { 
    nombre: 'COSTEÑA', 
    categoria: 'CERVEZAS',
    campanas: ['BACANA', 'PILOTO CENTRO', 'PRECIO']
  },
  { 
    nombre: 'MICHELOB', 
    categoria: 'CERVEZAS',
    campanas: ['127', 'LIGHT BEER', 'MICHELOB TIME', 'SABOR SUPERIOR', 'SUPERIORITY EQUITY', 'ULTRA', 'ULTRA FIFA']
  },
  { 
    nombre: 'PILSEN', 
    categoria: 'CERVEZAS',
    campanas: ['FERIA DE FLORES']
  },
  { 
    nombre: 'POKER', 
    categoria: 'CERVEZAS',
    campanas: ['MES DE LOS AMIGOS', 'RENOVACION', 'ROCK AL PARQUE']
  },
  { 
    nombre: 'PONY MALTA', 
    categoria: 'NABS',
    campanas: ['AON ENERGIA NUTRITIVA', 'COPA AMERICA', 'CRAVING CAPS', 'ENERGIA NUTRITIVA', 'ENERGÍA NUTRITIVA', 'EQUITY']
  },
  { 
    nombre: 'REDDS', 
    categoria: 'CERVEZAS',
    campanas: ['REDDS CITRUS']
  },
  { 
    nombre: 'STELLA ARTOIS', 
    categoria: 'CERVEZAS',
    campanas: ['MID TIER CITIES', 'PERFECT SERVE']
  },
  { 
    nombre: 'TADA', 
    categoria: 'CERVEZAS',
    campanas: ['NEW TAGLINE', 'TADA PIDAN DOMICILIO']
  }
];

export const getCategoriaByMarca = (marca) => {
  const found = marcas.find(m => m.nombre === marca);
  return found ? found.categoria : '';
};

export const getCampanasByMarca = (marca) => {
  const found = marcas.find(m => m.nombre === marca);
  return found ? found.campanas : [];
};
