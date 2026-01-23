const dbService = require('./services/dbService');

(async () => {
  try {
    await dbService.initDB();
    const records = await dbService.getAllRecords();
    console.log('\n📊 REGISTROS EN BD:\n');
    records.forEach((r, i) => {
      console.log(`[${i}] ${r.marca} - ${r.id}`);
      console.log(`    imagen_1: ${r.imagen_1.substring(0, 80)}`);
      console.log(`    imagen_2: ${r.imagen_2.substring(0, 80)}`);
      console.log(`    imagen_3: ${r.imagen_3.substring(0, 80)}`);
      console.log();
    });
  } catch (err) {
    console.error('Error:', err);
  }
})();
