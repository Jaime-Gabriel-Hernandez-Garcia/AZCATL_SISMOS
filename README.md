# AZCATL SISMOS: Sistema de Visualización de Datos Sísmicos en México

[![Licencia](https://img.shields.io/badge/Licencia-Software_Libre-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker_Compose-Soportado-2496ed.svg)](docker-compose.yml)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Data_Warehouse-336791.svg)](db/schema.sql)
[![Revista Azcatl](https://img.shields.io/badge/Publicación-Revista_Azcatl_2026-teal.svg)](docs/0604_Azcatl_sismos_villa.pdf)

> **"Cuando México tiembla: la historia contada por los datos"**  
> Artículo de divulgación científica publicado en la revista *Azcatl* (UAM Azcapotzalco).

---

## 📖 Referencia y Cita Académica

```bibtex
@article{villa2026cuando,
  title     = {Cuando México tiembla: la historia contada por los datos},
  author    = {Villa Vargas, José Manuel and Hurtado Avilés, Gabriel and Climent Hernández, José Antonio},
  journal   = {Azcatl. Revista de divulgación en ciencias, ingeniería e innovación},
  volume    = {6},
  pages     = {28--33},
  year      = {2026},
  doi       = {10.24275/AZC2026E1004}
}
```

---

## 🎯 Visión del Proyecto

Los sismos son fenómenos naturales impredecibles con alto impacto en el territorio mexicano. Este sistema transforma la información técnica y masiva del **Servicio Sismológico Nacional (SSN)** y la integra con información demográfica y económica del **Instituto Nacional de Estadística y Geografía (INEGI)**, facilitando:
- Análisis espacial interactivo y cartografía geoespacial.
- Evaluación de población e infraestructura económica vulnerable cercana a epicentros.
- Difusión, investigación y fomento de la cultura de prevención de desastres.

---

## 🏛️ Arquitectura del Almacén de Datos (Data Warehouse)

El repositorio implementa un modelo dimensional (*Star Schema*) en **PostgreSQL**:

```
           +-------------------+
           |    dim_tiempo     |
           +-------------------+
                     |
+--------------------+--------------------+
|                                         |
|    +-------------------+                |    +-------------------+
|    |    dim_sismos     |                |    |     dim_zonas     |
|    +-------------------+                |    +-------------------+
|              \                          /              |
|               \                        /               |
|            +-------------------------------+           |
+------------|   fact_impacto_sismos_inegi   |-----------+
             +-------------------------------+
                             |
                   +-------------------+
                   |   dim_economia    |
                   +-------------------+
```

### Tablas Dimensionales y de Hechos:
* **`dim_sismos`**: Magnitud, latitud, longitud, profundidad, referencia geográfica y fecha/hora UTC (SSN).
* **`dim_zonas`**: Entidad federativa, municipio, coordenadas y población total (Censo de Población y Vivienda INEGI 2020).
* **`dim_economia`**: Unidades económicas, personal ocupado y producción bruta total por entidad (Censos Económicos INEGI).
* **`dim_tiempo`**: Desglose temporal (año, mes, día, trimestre) para series históricas (1900–2026).
* **`fact_impacto_sismos_inegi`**: Cruce analítico de sismos sobre poblaciones, radios de afectación (km), distancia al epicentro y nivel de impacto.

---

## 🖥️ Módulos de Visualización (Figuras del Artículo)

1. **Inicio (Figura 2)**: Portada institucional con resumen de fuentes de datos, resumen de cobertura y acceso rápido.
2. **Sismos (Figura 3)**: Mapa interactivo sobre OpenStreetMap con simbología por magnitud:
   * **Verde**: Magnitud 2.0 a 3.9
   * **Amarillo**: Magnitud 4.0 a 5.9
   * **Rojo**: Magnitud 6.0 o más
   * **Azul**: Poblaciones urbanas con &ge; 50,000 habitantes
   * **KPIs de consulta**: *Total de Sismos*, *Sismo de Mayor Magnitud* y *Región más Activa*.
3. **Población (Figura 4)**: Reporte analítico con filtros por estado (ej. Jalisco 2017) con 4 estadísticas clave:
   * Distribución de Magnitudes
   * Correlación Magnitud vs. Profundidad
   * Sismos por Mes (histograma)
   * Población Afectada vs. Magnitud
4. **Economía**: Análisis de unidades económicas y producción bruta total expuesta en zonas de alta sismicidad.
5. **Riesgo (Figura 5)**: Mapa de calor de densidad sísmica y representación de radios de dispersión de ondas.

---

## 🚀 Despliegue y Ejecución

### Opción 1: Despliegue con Docker Compose (Recomendado)

Solo requiere tener instalado Docker:

```bash
# Clonar y acceder al directorio
cd AZCATL_SISMOS

# Construir e iniciar contenedores
docker compose up --build
```

El sistema estará accesible inmediatamente en:  
👉 **http://localhost:3000**

PostgreSQL estará disponible en el puerto `5432` con la base de datos `datawarehouse` inicializada con el esquema y catálogo de datos.

### Opción 2: Ejecución Local en Node.js (Sin Docker)

El sistema cuenta con un motor dual con fallback automático a **SQLite**:

```bash
# 1. Instalar dependencias
npm install

# 2. Generar datos semilla (si no existen)
python etl/generate_seed_data.py

# 3. Iniciar servidor
node src/server.js
```

Abrir navegador en `http://localhost:3000`.

---

## 🛠️ Tecnologías Abiertas Utilizadas

* **Base de Datos:** PostgreSQL 15 / SQLite3
* **Backend:** Node.js, Express, pg
* **Frontend:** HTML5, CSS3, JavaScript Vanilla, Bootstrap 5
* **Cartografía & Visualizaciones:** OpenStreetMap, Leaflet JS, Leaflet Heat, Chart.js
* **Procesamiento ETL:** Python 3 (validación de coordenadas, limpieza de datos y generación SQL)
* **Contenerización:** Docker & Docker Compose

---

## 👥 Autores y Contacto

* **José Manuel Villa Vargas** - Universidad Autónoma Metropolitana, Unidad Azcapotzalco  
  *al2232801439@azc.uam.mx* | ORCID: [0009-0009-2401-0661](https://orcid.org/0009-0009-2401-0661)
* **Gabriel Hurtado Avilés** - Universidad Autónoma Metropolitana, Unidad Azcapotzalco  
  *al2232800343@azc.uam.mx* | ORCID: [0009-0002-5686-1822](https://orcid.org/0009-0002-5686-1822)
* **José Antonio Climent Hernández** - Universidad Autónoma Metropolitana, Unidad Azcapotzalco  
  *jach@azc.uam.mx* | ORCID: [0000-0003-1507-0290](https://orcid.org/0000-0003-1507-0290)
