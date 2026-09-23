-- ====================================================================
-- ESQUEMA DATA WAREHOUSE - SISTEMA DE VISUALIZACIÓN DE SISMOS EN MÉXICO
-- Publicación de referencia: Villa, Hurtado & Climent (2026), Revista Azcatl
-- ====================================================================

DROP TABLE IF EXISTS fact_impacto_sismos_inegi CASCADE;
DROP TABLE IF EXISTS dim_economia CASCADE;
DROP TABLE IF EXISTS dim_zonas CASCADE;
DROP TABLE IF EXISTS dim_sismos CASCADE;
DROP TABLE IF EXISTS dim_tiempo CASCADE;

-- 1. Dimensión Tiempo
CREATE TABLE dim_tiempo (
    id_tiempo SERIAL PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    anio INTEGER NOT NULL,
    mes INTEGER NOT NULL,
    dia INTEGER NOT NULL,
    trimestre INTEGER NOT NULL
);

-- 2. Dimensión Sismos (SSN)
CREATE TABLE dim_sismos (
    id_sismo SERIAL PRIMARY KEY,
    fecha_utc DATE NOT NULL,
    hora_utc TIME,
    magnitud NUMERIC(3, 1) NOT NULL,
    latitud NUMERIC(8, 4) NOT NULL,
    longitud NUMERIC(8, 4) NOT NULL,
    profundidad NUMERIC(6, 2) NOT NULL DEFAULT 0.0,
    referencia_localizacion VARCHAR(255),
    estado VARCHAR(50)
);

-- 3. Dimensión Zonas y Población (INEGI - Censo de Población y Vivienda 2020)
CREATE TABLE dim_zonas (
    id_zona SERIAL PRIMARY KEY,
    clave_entidad VARCHAR(5),
    entidad VARCHAR(100) NOT NULL,
    municipio VARCHAR(150) NOT NULL,
    latitud NUMERIC(8, 4) NOT NULL DEFAULT 0.0,
    longitud NUMERIC(8, 4) NOT NULL DEFAULT 0.0,
    poblacion_total INTEGER NOT NULL DEFAULT 0
);

-- 4. Dimensión Economía (INEGI - Censos Económicos)
CREATE TABLE dim_economia (
    id_economia SERIAL PRIMARY KEY,
    clave_entidad VARCHAR(5) UNIQUE,
    entidad VARCHAR(100) NOT NULL,
    unidades_economicas INTEGER NOT NULL DEFAULT 0,
    personal_ocupado INTEGER NOT NULL DEFAULT 0,
    produccion_bruta_total NUMERIC(18, 2) NOT NULL DEFAULT 0.0
);

-- 5. Tabla de Hechos: Impacto de Sismos sobre Población e Infraestructura
CREATE TABLE fact_impacto_sismos_inegi (
    id_fact SERIAL PRIMARY KEY,
    id_sismo INTEGER NOT NULL REFERENCES dim_sismos(id_sismo) ON DELETE CASCADE,
    id_zona INTEGER NOT NULL REFERENCES dim_zonas(id_zona) ON DELETE CASCADE,
    distancia_km NUMERIC(8, 2) NOT NULL,
    radio_impacto_km NUMERIC(8, 2) NOT NULL,
    poblacion_afectada INTEGER NOT NULL DEFAULT 0,
    nivel_impacto VARCHAR(50) NOT NULL
);

-- Índices optimizados para consultas del observatorio
CREATE INDEX idx_sismos_mag ON dim_sismos(magnitud);
CREATE INDEX idx_sismos_fecha ON dim_sismos(fecha_utc);
CREATE INDEX idx_sismos_estado ON dim_sismos(estado);
CREATE INDEX idx_sismos_coords ON dim_sismos(latitud, longitud);

CREATE INDEX idx_zonas_pob ON dim_zonas(poblacion_total);
CREATE INDEX idx_zonas_entidad ON dim_zonas(entidad);
CREATE INDEX idx_zonas_coords ON dim_zonas(latitud, longitud);

CREATE INDEX idx_fact_sismo ON fact_impacto_sismos_inegi(id_sismo);
CREATE INDEX idx_fact_zona ON fact_impacto_sismos_inegi(id_zona);
