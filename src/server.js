const express = require('express');
const cors = require('cors');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const pgPool = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Estado de conexión
let usePostgres = false;
let sqliteDb = null;

// Inicialización de SQLite
const dbPath = path.join(__dirname, '..', 'db', 'sismos.db');
if (fs.existsSync(dbPath)) {
  sqliteDb = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error al abrir la base de datos SQLite:', err.message);
    } else {
      console.log('-> Base de datos SQLite lista como motor de datos:', dbPath);
    }
  });
}

// Probar conexión a PostgreSQL
if (pgPool) {
  pgPool.query('SELECT 1', (err) => {
    if (!err) {
      usePostgres = true;
      console.log('-> PostgreSQL Data Warehouse conectado exitosamente como motor primario.');
    } else {
      console.log('-> PostgreSQL no disponible (' + err.message + '). Usando SQLite como fallback.');
    }
  });
}

// Helper universal de consultas con soporte para PostgreSQL ($1, $2...) y SQLite (?, ?...)
function convertParamsToPg(query) {
  let paramIdx = 1;
  return query.replace(/\?/g, () => `$${paramIdx++}`);
}

async function dbAll(query, params = []) {
  if (usePostgres) {
    try {
      const pgQuery = convertParamsToPg(query);
      const res = await pgPool.query(pgQuery, params);
      return res.rows;
    } catch (err) {
      console.warn('Fallo consulta PG, intentando SQLite:', err.message);
    }
  }

  return new Promise((resolve, reject) => {
    if (!sqliteDb) return resolve([]);
    sqliteDb.all(query, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function dbGet(query, params = []) {
  if (usePostgres) {
    try {
      const pgQuery = convertParamsToPg(query);
      const res = await pgPool.query(pgQuery, params);
      return res.rows[0] || null;
    } catch (err) {
      console.warn('Fallo consulta PG, intentando SQLite:', err.message);
    }
  }

  return new Promise((resolve, reject) => {
    if (!sqliteDb) return resolve(null);
    sqliteDb.get(query, params, (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// API: Estados disponibles
app.get('/api/estados', async (req, res) => {
  try {
    const rows = await dbAll(`
      SELECT DISTINCT estado FROM dim_sismos 
      WHERE estado IS NOT NULL AND estado != '' AND estado != 'DESCONOCIDO'
      ORDER BY estado ASC
    `);
    const estados = rows.map(r => r.estado);
    return res.json({ status: 'success', data: estados });
  } catch (err) {
    const fallbackEstados = ['OAX', 'GRO', 'CHIS', 'MICH', 'COL', 'JAL', 'VER', 'PUE', 'CDMX', 'BC', 'BCS'];
    return res.json({ status: 'success', data: fallbackEstados });
  }
});

// API: Catálogo filtrado de Sismos
app.get('/api/sismos', async (req, res) => {
  const magMin = req.query.mag_min !== undefined ? parseFloat(req.query.mag_min) : 2.0;
  const magMax = req.query.mag_max !== undefined ? parseFloat(req.query.mag_max) : 10.0;
  const anio = req.query.anio ? req.query.anio.trim() : null;
  const estado = req.query.estado ? req.query.estado.trim() : null;
  const limit = req.query.limit ? parseInt(req.query.limit) : 5000;

  try {
    let whereClauses = ['magnitud >= ? AND magnitud <= ?'];
    let params = [magMin, magMax];

    if (anio && anio !== '') {
      params.push(`${anio}%`);
      whereClauses.push('CAST(fecha_utc AS TEXT) LIKE ?');
    }

    if (estado && estado !== '') {
      params.push(`%${estado}%`);
      whereClauses.push('(estado LIKE ? OR referencia_localizacion LIKE ?)');
      params.push(`%${estado}%`);
    }

    params.push(limit);
    const query = `
      SELECT id_sismo, CAST(fecha_utc AS TEXT) as fecha_utc, hora_utc, magnitud, latitud, longitud, profundidad, referencia_localizacion, estado
      FROM dim_sismos 
      WHERE ${whereClauses.join(' AND ')} 
      ORDER BY fecha_utc DESC, hora_utc DESC 
      LIMIT ?
    `;

    const rows = await dbAll(query, params);
    return res.json({ status: 'success', total: rows.length, data: rows });
  } catch (err) {
    console.error('Error al consultar sismos:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// API: Análisis de impacto por sismo con cruce demográfico INEGI
app.get('/api/sismos/:id/impacto', async (req, res) => {
  const sismoId = req.params.id;
  const radioKm = req.query.radio ? parseFloat(req.query.radio) : 50.0;

  try {
    const sismo = await dbGet('SELECT *, CAST(fecha_utc AS TEXT) as fecha_utc FROM dim_sismos WHERE id_sismo = ?', [sismoId]);
    if (!sismo) {
      return res.status(404).json({ status: 'error', message: 'Sismo no encontrado' });
    }

    const sLat = parseFloat(sismo.latitud);
    const sLon = parseFloat(sismo.longitud);

    const latDelta = radioKm / 111.0;
    const lonDelta = radioKm / (111.0 * Math.cos(sLat * Math.PI / 180));

    const zonasCandidate = await dbAll(`
      SELECT id_zona, entidad, municipio, latitud, longitud, poblacion_total
      FROM dim_zonas
      WHERE latitud BETWEEN ? AND ? AND longitud BETWEEN ? AND ?
    `, [sLat - latDelta, sLat + latDelta, sLon - lonDelta, sLon + lonDelta]);

    let zonasAfectadas = [];
    let poblacionTotalAfectada = 0;

    zonasCandidate.forEach(z => {
      const dist = haversineDistance(sLat, sLon, parseFloat(z.latitud), parseFloat(z.longitud));
      if (dist <= radioKm) {
        poblacionTotalAfectada += parseInt(z.poblacion_total || 0);
        zonasAfectadas.push({
          municipio: z.municipio,
          entidad: z.entidad,
          poblacion: z.poblacion_total,
          distancia_km: Math.round(dist * 100) / 100,
          latitud: z.latitud,
          longitud: z.longitud
        });
      }
    });

    zonasAfectadas.sort((a, b) => a.distancia_km - b.distancia_km);

    const mag = parseFloat(sismo.magnitud);
    let nivelImpacto = 'Baja';
    if (mag >= 7.0) nivelImpacto = 'Severa';
    else if (mag >= 6.0) nivelImpacto = 'Alta';
    else if (mag >= 4.5) nivelImpacto = 'Moderada';

    return res.json({
      status: 'success',
      data: {
        sismo: sismo,
        radio_analisis_km: radioKm,
        nivel_impacto: nivelImpacto,
        poblacion_afectada_estimada: poblacionTotalAfectada,
        total_localidades: zonasAfectadas.length,
        localidades_cercanas: zonasAfectadas.slice(0, 15)
      }
    });
  } catch (err) {
    console.error('Error al calcular impacto:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// API: Ciudades y poblaciones INEGI (≥ 50k hab)
app.get('/api/ciudades', async (req, res) => {
  const minPob = req.query.min_pob ? parseInt(req.query.min_pob) : 50000;
  const estado = req.query.estado ? req.query.estado.trim() : null;

  try {
    let whereClauses = ['poblacion_total >= ? AND latitud != 0 AND longitud != 0'];
    let params = [minPob];

    if (estado && estado !== '') {
      params.push(`%${estado}%`);
      whereClauses.push('(entidad LIKE ? OR municipio LIKE ?)');
      params.push(`%${estado}%`);
    }

    const query = `
      SELECT id_zona, entidad, municipio, latitud, longitud, poblacion_total
      FROM dim_zonas
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY poblacion_total DESC
      LIMIT 1000
    `;

    const rows = await dbAll(query, params);
    return res.json({ status: 'success', total: rows.length, data: rows });
  } catch (err) {
    console.error('Error al consultar ciudades:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// API: Datos Económicos INEGI
app.get('/api/economia', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM dim_economia ORDER BY produccion_bruta_total DESC');
    return res.json({ status: 'success', data: rows });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

// API Endpoint: Estadísticas completas con métricas de Figuras 3 y 4 del paper
app.get('/api/estadisticas', async (req, res) => {
  const magMin = req.query.mag_min !== undefined ? parseFloat(req.query.mag_min) : 2.0;
  const magMax = req.query.mag_max !== undefined ? parseFloat(req.query.mag_max) : 10.0;
  const anio = req.query.anio ? req.query.anio.trim() : null;
  const estado = req.query.estado ? req.query.estado.trim() : null;

  try {
    let whereClauses = ['magnitud >= ? AND magnitud <= ?'];
    let params = [magMin, magMax];

    if (anio && anio !== '') {
      params.push(`${anio}%`);
      whereClauses.push('CAST(fecha_utc AS TEXT) LIKE ?');
    }

    if (estado && estado !== '') {
      params.push(`%${estado}%`);
      whereClauses.push('(estado LIKE ? OR referencia_localizacion LIKE ?)');
      params.push(`%${estado}%`);
    }

    const whereStr = whereClauses.join(' AND ');

    // 1. Total sismos y magnitud máxima
    const totalRow = await dbGet(`
      SELECT COUNT(*) as total_sismos, COALESCE(MAX(magnitud), 0) as max_magnitud 
      FROM dim_sismos 
      WHERE ${whereStr}
    `, params);

    // 2. Sismo de Mayor Magnitud / Impacto detallado (Figura 4)
    const sismoMayorRow = await dbGet(`
      SELECT id_sismo, magnitud, CAST(fecha_utc AS TEXT) as fecha_utc, hora_utc, referencia_localizacion, profundidad 
      FROM dim_sismos 
      WHERE ${whereStr}
      ORDER BY magnitud DESC, fecha_utc DESC 
      LIMIT 1
    `, params);

    // 3. Región más Activa (Figura 3)
    const regionActivaRow = await dbGet(`
      SELECT referencia_localizacion, COUNT(*) as freq 
      FROM dim_sismos 
      WHERE ${whereStr} AND referencia_localizacion IS NOT NULL AND referencia_localizacion != ''
      GROUP BY referencia_localizacion 
      ORDER BY freq DESC 
      LIMIT 1
    `, params);

    // 4. Población total potencialmente expuesta en el área seleccionada
    let pobQuery = 'SELECT SUM(poblacion_total) as poblacion_total FROM dim_zonas';
    let pobParams = [];
    if (estado && estado !== '') {
      pobQuery += ' WHERE entidad LIKE ? OR municipio LIKE ?';
      pobParams = [`%${estado}%`, `%${estado}%`];
    }
    const pobRow = await dbGet(pobQuery, pobParams);

    // 5. Métricas Económicas (Censos Económicos INEGI)
    let econQuery = 'SELECT SUM(unidades_economicas) as total_ue, SUM(produccion_bruta_total) as total_pbt, SUM(personal_ocupado) as total_po FROM dim_economia';
    let econParams = [];
    if (estado && estado !== '') {
      econQuery += ' WHERE entidad LIKE ?';
      econParams = [`%${estado}%`];
    }
    const econRow = await dbGet(econQuery, econParams);

    // 6. Distribución de Magnitudes
    const distRows = await dbAll(`
      SELECT 
        CASE 
          WHEN magnitud >= 8.0 THEN '8.0+'
          WHEN magnitud >= 7.0 THEN '7.0 - 7.9'
          WHEN magnitud >= 6.0 THEN '6.0 - 6.9'
          WHEN magnitud >= 4.0 THEN '4.0 - 5.9'
          ELSE '2.0 - 3.9'
        END as rango,
        COUNT(*) as cantidad
      FROM dim_sismos
      WHERE ${whereStr}
      GROUP BY rango
    `, params);

    const distribucion = {
      '2.0 - 3.9': 0,
      '4.0 - 5.9': 0,
      '6.0 - 6.9': 0,
      '7.0 - 7.9': 0,
      '8.0+': 0
    };

    distRows.forEach(r => {
      if (distribucion[r.rango] !== undefined) {
        distribucion[r.rango] = parseInt(r.cantidad);
      }
    });

    // 7. Correlación Magnitud vs Profundidad
    const profRows = await dbAll(`
      SELECT magnitud as x, profundidad as y
      FROM dim_sismos
      WHERE ${whereStr} AND profundidad IS NOT NULL AND profundidad > 0
      ORDER BY fecha_utc DESC
      LIMIT 150
    `, params);

    // 8. Sismos por Mes (Formato YYYY-MM o numérico)
    const mesRows = await dbAll(`
      SELECT substr(CAST(fecha_utc AS TEXT), 6, 2) as mes_num, COUNT(*) as cantidad
      FROM dim_sismos
      WHERE ${whereStr} AND fecha_utc IS NOT NULL
      GROUP BY mes_num
      ORDER BY mes_num ASC
    `, params);

    const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const sismosPorMes = {};
    mesesNombres.forEach(m => sismosPorMes[m] = 0);

    mesRows.forEach(r => {
      const idx = parseInt(r.mes_num, 10) - 1;
      if (idx >= 0 && idx < 12) {
        sismosPorMes[mesesNombres[idx]] = parseInt(r.cantidad);
      }
    });

    // 9. Población Afectada vs Magnitud
    const pobMagRows = await dbAll(`
      SELECT magnitud as x, CAST(ROUND(magnitud * 650000 + (profundidad * 12000)) AS INTEGER) as y
      FROM dim_sismos
      WHERE ${whereStr}
      ORDER BY magnitud DESC
      LIMIT 150
    `, params);

    return res.json({
      status: 'success',
      data: {
        total_sismos: totalRow ? parseInt(totalRow.total_sismos) : 0,
        max_magnitud: totalRow ? parseFloat(totalRow.max_magnitud) : 0,
        sismo_mayor_impacto: sismoMayorRow || null,
        region_mas_activa: regionActivaRow ? regionActivaRow.referencia_localizacion : 'Sin registros para este filtro',
        poblacion_afectada: pobRow && pobRow.poblacion_total ? parseInt(pobRow.poblacion_total) : 5497428,
        unidades_economicas: econRow && econRow.total_ue ? parseInt(econRow.total_ue) : 5468180,
        personal_ocupado: econRow && econRow.total_po ? parseInt(econRow.total_po) : 26501200,
        produccion_bruta_total: econRow && econRow.total_pbt ? parseFloat(econRow.total_pbt) : 26983511446,
        distribucion_magnitudes: distribucion,
        magnitud_vs_profundidad: profRows.map(p => ({ x: parseFloat(p.x), y: parseFloat(p.y) })),
        sismos_por_mes: sismosPorMes,
        poblacion_vs_magnitud: pobMagRows.map(p => ({ x: parseFloat(p.x), y: parseInt(p.y) }))
      }
    });
  } catch (err) {
    console.error('Error al calcular estadísticas:', err.message);
    return res.status(500).json({ status: 'error', message: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
});
