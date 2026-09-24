# AZCATL SISMOS: Sistema de Visualización de Datos Sísmicos en México

[![Demo GitHub Pages](https://img.shields.io/badge/Demo_Online-GitHub_Pages-brightgreen.svg)](https://jaime-gabriel-hernandez-garcia.github.io/AZCATL_SISMOS/)
[![Licencia](https://img.shields.io/badge/Licencia-Software_Libre-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker_Compose-PHP_8.2_%2B_PostgreSQL_17-2496ed.svg)](docker-compose.yml)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Data_Warehouse-336791.svg)](sql/00-datawarehouse_tables.sql)
[![Revista Azcatl](https://img.shields.io/badge/Publicación-Revista_Azcatl_2026-teal.svg)](docs/0604_Azcatl_sismos_villa.pdf)

> **"Cuando México tiembla: la historia contada por los datos"**  
> Artículo de divulgación científica publicado en la revista *Azcatl* (UAM Azcapotzalco, 2026).

---

## 🌐 Demo Online Gratuita (GitHub Pages)

El proyecto cuenta con un módulo estático autónomo desplegado en GitHub Pages, listo para usarse directamente desde cualquier navegador sin necesidad de instalar servidores:

👉 **[https://jaime-gabriel-hernandez-garcia.github.io/AZCATL_SISMOS/](https://jaime-gabriel-hernandez-garcia.github.io/AZCATL_SISMOS/)**

### ¿Cómo activar GitHub Pages en el repositorio?
1. Ir a **Settings** en GitHub -> pestaña **Pages** (menú lateral izquierdo).
2. En **Build and deployment** > **Source**, seleccionar: `Deploy from a branch`.
3. En **Branch**, seleccionar `main` y en la carpeta seleccionar **/docs**.
4. Hacer clic en **Save**. En un minuto estará publicado en la URL superior.

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

Los sismos son fenómenos naturales impredecibles con alto impacto en el territorio mexicano. Este sistema transforma la información masiva del **Servicio Sismológico Nacional (SSN)** y la integra con información demográfica (Censo 2020) y económica del **Instituto Nacional de Estadística y Geografía (INEGI)**, facilitando:
- Análisis espacial interactivo y cartografía geoespacial abierta.
- Evaluación de población e infraestructura económica vulnerable cercana a epicentros.
- Difusión, investigación y fomento de la cultura de prevención de desastres.

---

## 🏛️ Arquitectura del Almacén de Datos (Data Warehouse)

El repositorio implementa el modelo dimensional (*Star Schema*) en **PostgreSQL 17**:

```
                       +-------------------+
                       |    dim_tiempo     | (319,593 registros)
                       +-------------------+
                                 |
+--------------------------------+--------------------------------+
|                                                                 |
|    +-------------------+                       +-------------------+
|    |    dim_sismos     |                       |     dim_zonas     | (INEGI 2020)
|    +-------------------+                       +-------------------+
|      (319,593 sismos)              \                             /           |
|                                     \                           /            |
|                               +-------------------------------+              |
+-------------------------------| fact_impacto_sismos_imputed   |--------------+
                                +-------------------------------+
                                      (196,577 hechos)
                                              |
                                    +-------------------+
                                    |   dim_economia    | (Censos Económicos)
                                    +-------------------+
```

### Tablas Dimensionales y de Hechos (`sql/`):
* **`00-datawarehouse_tables.sql`**: Definición DDL de las tablas con llaves foráneas e índices.
* **`01-dim_zonas.sql`**: 32 entidades federativas con población total, femenina y masculina (Censo INEGI 2020).
* **`02-dim_tiempo.sql`**: 319,593 registros con desglose temporal (fecha, hora UTC, año, mes, día, trimestre) desde 1900.
* **`03-dim_sismos.sql`**: 319,593 sismos con magnitud, coordenadas, profundidad y referencia geográfica (SSN).
* **`04-dim_economia.sql`**: Indicadores de producción bruta total, insumos, consumo intermedio y activos fijos por entidad.
* **`05-fact_impacto_sismos_imputed.sql`**: 196,577 registros de hechos con población afectada, impacto económico y determinación de riesgo proporcional.

---

## 🖥️ Módulos de Visualización (Figuras del Artículo)

1. **Inicio (Figura 2)**: Portada institucional de bienvenida (`index.php` / `docs/index.html`) con resumen de alcance y acceso directo.
2. **Sismos (Figura 3)**: Mapa interactivo sobre OpenStreetMap con simbología por magnitud:
   * **Verde**: Magnitud 2.0 a 3.9
   * **Amarillo**: Magnitud 4.0 a 5.9
   * **Rojo**: Magnitud 6.0 o más
   * **Azul**: Poblaciones urbanas con &ge; 50,000 habitantes
   * **KPIs inferiores**: *Total de Sismos*, *Sismo de Mayor Magnitud* y *Región más Activa*.
3. **Población (Figura 4)**: Reporte estadístico por estado/año (ej. Jalisco 2017) con los 4 gráficos clave:
   * Distribución de Magnitudes
   * Correlación Magnitud vs. Profundidad
   * Sismos por Mes (histograma en barras verdes)
   * Población Afectada vs. Magnitud
4. **Economía**: Análisis de unidades económicas y producción bruta total expuesta en zonas de alta sismicidad.
5. **Riesgo (Figura 5)**: Mapa de calor de densidad sísmica y representación de radios de dispersión de ondas.

---

## 🚀 Despliegue del Módulo Dinámico (PHP 8 + Apache + PostgreSQL)

El módulo dinámico replica exactamente el entorno de producción descrito en el artículo:

```bash
# 1. Clonar el repositorio
git clone https://github.com/Jaime-Gabriel-Hernandez-Garcia/AZCATL_SISMOS.git
cd AZCATL_SISMOS

# 2. Levantar el stack completo con Docker Compose
docker compose up --build
```

El servidor web Apache responderá en:  
👉 **http://localhost** o **http://localhost:3000**

PostgreSQL 17 estará inicializado automáticamente con los scripts de `sql/` en el puerto `5432` con la base de datos `datawarehouse`.

---

## 🛠️ Tecnologías Oficiales Utilizadas

* **Servidor Web:** Apache 2.4 con módulo Rewrite habilitado
* **Lenguaje Backend:** PHP 8.2 (extensiones `pdo_pgsql`, `pgsql`)
* **Base de Datos:** PostgreSQL 17 (Data Warehouse dimensional)
* **Frontend:** HTML5, CSS3, JavaScript Vanilla, Bootstrap 5
* **Cartografía & Visualizaciones:** OpenStreetMap, Leaflet JS, Leaflet Heat, Chart.js
* **Contenerización:** Docker & Docker Compose
* **Demo Estática:** GitHub Pages (en `/docs`)

---

## 👥 Autores y Contacto

* **José Manuel Villa Vargas** - Universidad Autónoma Metropolitana, Unidad Azcapotzalco  
  *al2232801439@azc.uam.mx* | ORCID: [0009-0009-2401-0661](https://orcid.org/0009-0009-2401-0661)
* **Gabriel Hurtado Avilés** - Universidad Autónoma Metropolitana, Unidad Azcapotzalco  
  *al2232800343@azc.uam.mx* | ORCID: [0009-0002-5686-1822](https://orcid.org/0009-0002-5686-1822)
* **José Antonio Climent Hernández** - Universidad Autónoma Metropolitana, Unidad Azcapotzalco  
  *jach@azc.uam.mx* | ORCID: [0000-0003-1507-0290](https://orcid.org/0000-0003-1507-0290)
