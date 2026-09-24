<?php
// ====================================================================
// AZCATL SISMOS: Sistema de Visualización de Datos Sísmicos en México
// Publicación: Villa, Hurtado & Climent (2026), Revista Azcatl, 6, 28-33
// Figura 2: Interfaz de bienvenida del sistema
// ====================================================================
?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sistema de Visualización de Sismos - Revista Azcatl</title>
    <!-- Bootstrap 5 CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- FontAwesome Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&family=Roboto:wght@300;400;500&display=swap" rel="stylesheet">
    <style>
        body {
            font-family: 'Roboto', sans-serif;
            background-color: #f0f2f5;
            color: #333;
            margin: 0;
            padding: 0;
        }
        header {
            background: linear-gradient(135deg, #1a237e, #283593);
            color: white;
            padding: 30px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        header h1 {
            font-family: 'Montserrat', sans-serif;
            font-weight: 700;
            font-size: 2.2rem;
            margin: 0;
        }
        .nav-buttons {
            display: flex;
            justify-content: center;
            gap: 12px;
            background: #ffffff;
            padding: 15px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.08);
            margin-bottom: 30px;
            flex-wrap: wrap;
        }
        .nav-buttons a {
            background: linear-gradient(135deg, #3f51b5, #5c6bc0);
            color: #ffffff;
            padding: 10px 22px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 500;
            font-size: 0.95rem;
            transition: all 0.25s ease;
            display: inline-flex;
            align-items: center;
            gap: 8px;
        }
        .nav-buttons a:hover, .nav-buttons a.active {
            background: linear-gradient(135deg, #1a237e, #303f9f);
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }
        .hero-banner {
            background: #ffffff;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
            margin-bottom: 30px;
            position: relative;
            overflow: hidden;
        }
        .hero-banner::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 6px;
            background: linear-gradient(90deg, #1a237e, #3f51b5, #f44336);
        }
        .hero-title {
            font-family: 'Montserrat', sans-serif;
            font-size: 2.4rem;
            font-weight: 700;
            color: #1a237e;
            margin-bottom: 15px;
        }
        .hero-desc {
            font-size: 1.1rem;
            line-height: 1.7;
            color: #555;
            max-width: 900px;
        }
        .feature-card {
            background: #ffffff;
            border-radius: 12px;
            padding: 25px;
            height: 100%;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
            border-top: 4px solid #3f51b5;
        }
        .feature-card:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 20px rgba(0, 0, 0, 0.12);
        }
        .feature-card h4 {
            font-family: 'Montserrat', sans-serif;
            font-weight: 600;
            color: #1a237e;
            margin-bottom: 12px;
        }
        .feature-icon {
            font-size: 2.2rem;
            color: #3f51b5;
            margin-bottom: 15px;
        }
        .badge-academic {
            background-color: #e8eaf6;
            color: #1a237e;
            font-weight: 600;
            padding: 6px 14px;
            border-radius: 20px;
            display: inline-block;
            margin-bottom: 15px;
        }
    </style>
</head>
<body>

    <header>
        <h1>Sistema de Visualización de Datos Sísmicos en México</h1>
        <p class="m-0 mt-2 opacity-75">Revista Azcatl &bull; Universidad Autónoma Metropolitana Azcapotzalco</p>
    </header>

    <!-- Barra de Navegación Oficial del Paper (Figura 2, 3 y 5) -->
    <div class="nav-buttons">
        <a href="index.php" class="active"><i class="fa-solid fa-house"></i>Inicio</a>
        <a href="sismos.php"><i class="fa-solid fa-map-location-dot"></i>Sismos</a>
        <a href="std.php"><i class="fa-solid fa-chart-column"></i>Población</a>
        <a href="aeconomica.php"><i class="fa-solid fa-building-columns"></i>Economía</a>
        <a href="sismo.php"><i class="fa-solid fa-fire"></i>Riesgo</a>
        <a href="../docs/index.html" class="bg-success text-white" target="_blank"><i class="fa-solid fa-globe"></i>Demo GitHub Pages</a>
    </div>

    <div class="container mb-5">
        <!-- Figura 2: Interfaz de bienvenida del sistema -->
        <div class="hero-banner">
            <span class="badge-academic">
                <i class="fa-solid fa-book-open me-1"></i>Azcatl: Revista de divulgación en ciencias, ingeniería e innovación, 6, 28-33 (2026)
            </span>
            <h2 class="hero-title">Bienvenido al Sistema de Visualización de Sismos</h2>
            <p class="hero-desc">
                <strong>"Cuando México tiembla: la historia contada por los datos"</strong>. Una plataforma de código abierto desarrollada en 
                <strong>PHP 8, Apache y PostgreSQL</strong> que procesa más de <strong>300,000 registros sísmicos</strong> del Servicio Sismológico Nacional (SSN) 
                desde 1900 y los cruza con datos demográficos (Censo 2020) y económicos del INEGI en una estructura de almacén de datos (Data Warehouse).
            </p>
            <div class="d-flex gap-3 flex-wrap mt-4">
                <a href="sismos.php" class="btn btn-primary px-4 py-2" style="background:#1a237e; border:none;">
                    <i class="fa-solid fa-map me-2"></i>Ver Mapa Interactivo (Fig. 3)
                </a>
                <a href="std.php" class="btn btn-outline-primary px-4 py-2">
                    <i class="fa-solid fa-chart-simple me-2"></i>Reporte Estadístico (Fig. 4)
                </a>
                <a href="sismo.php" class="btn btn-outline-danger px-4 py-2">
                    <i class="fa-solid fa-fire me-2"></i>Mapa de Calor y Riesgo (Fig. 5)
                </a>
            </div>
        </div>

        <div class="row g-4">
            <div class="col-md-3">
                <div class="feature-card">
                    <div class="feature-icon"><i class="fa-solid fa-database"></i></div>
                    <h4>+300,000 Sismos</h4>
                    <p class="text-muted small">Catálogo histórico depurado del SSN desde 1900 almacenado en PostgreSQL (`dim_sismos` y `dim_tiempo`).</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="feature-card">
                    <div class="feature-icon"><i class="fa-solid fa-people-roof"></i></div>
                    <h4>Censo INEGI 2020</h4>
                    <p class="text-muted small">Datos demográficos desglosados por entidad federativa y municipios (`dim_zonas`).</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="feature-card">
                    <div class="feature-icon"><i class="fa-solid fa-sack-dollar"></i></div>
                    <h4>Censos Económicos</h4>
                    <p class="text-muted small">Producción bruta total, unidades económicas y activos fijos (`dim_economia`).</p>
                </div>
            </div>
            <div class="col-md-3">
                <div class="feature-card">
                    <div class="feature-icon"><i class="fa-brands fa-docker"></i></div>
                    <h4>196k Hechos</h4>
                    <p class="text-muted small">Tabla de hechos `fact_impacto_sismos_imputed` con análisis de riesgo y población afectada.</p>
                </div>
            </div>
        </div>
    </div>

</body>
</html>
