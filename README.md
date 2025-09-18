# Salesforce Opportunity Dashboard

API backend para análisis de oportunidades de Salesforce con exportación a Excel.

## Instalación

```bash
npm install
```

## Configuración

La conexión a Azure SQL está configurada en `config/database.js`

## Ejecutar el servidor

```bash
npm start
```

El servidor correrá en http://localhost:3000

## Endpoints disponibles

### 1. Division Summary
```
GET /api/division-summary
```
Retorna métricas agregadas por año y división.

### 2. Lead Summary
```
GET /api/lead-summary
```
Retorna métricas agregadas por año y tipo de lead.

### 3. Opportunity Detail
```
GET /api/opportunity-detail?year=2023&division=Residential&stage=Approved&leadType=Company Lead
```
Parámetros opcionales:
- `year`: Filtrar por año
- `division`: Filtrar por división
- `stage`: Filtrar por estado (Approved, Lost, etc.)
- `leadType`: Filtrar por tipo de lead

### 4. Excel Report
```
GET /api/excel-report
```
Descarga un archivo Excel completo con:
- Hoja de resumen por división
- Hoja de resumen por tipo de lead
- Hoja de detalle de oportunidades
- Hojas de drill-down por año y división con métricas y detalles

## Estructura del Excel

El reporte Excel incluye:

1. **Division Summary**: Resumen agregado por división con totales
2. **Lead Summary**: Resumen agregado por tipo de lead con totales
3. **Opportunity Detail**: Lista completa de oportunidades con filtros
4. **Hojas de Drill-down**: Una hoja por cada combinación año-división mostrando:
   - Métricas resumidas en la parte superior
   - Detalle de todas las oportunidades que componen esas métricas

## Métricas calculadas

- **Total Opportunities**: Cantidad total de oportunidades
- **Won Opportunities**: Oportunidades con estado "Approved"
- **Lost Opportunities**: Oportunidades con estado "Lost"
- **Open Opportunities**: Oportunidades no cerradas
- **Total Revenue**: Suma de montos de oportunidades aprobadas
- **Average Ticket**: Promedio de montos de oportunidades aprobadas
- **Close Rate (Std)**: Tasa de cierre estándar (Approved / Total)
- **Close Rate (No Lost)**: Tasa de cierre excluyendo perdidas