# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a Node.js + Azure SQL project for a Salesforce Opportunity dashboard. The project provides REST APIs to analyze opportunities data with business metrics like close rates, average ticket values, and revenue summaries.

## Database Connection
The project connects to Azure SQL Server with the following:
- Database: Commission
- Main table: Opportunity
- Key fields: Id, Name, Created_Date, LastStageChangeDate, StageName, LeadType, Division, Amount, RecordTypeId

## Business Rules
- Year calculation: Use `LastStageChangeDate` for Approved/Lost opportunities, otherwise use `Created_Date`
- Filter: Residential opportunities only (RecordTypeId IN '0123t000000JD7jAAG','0123t000000JD7eAAG')
- Exclude: Records where JNID exists with Amount = 0
- Key metrics:
  - CloseRate_Std = Approved / Total
  - CloseRate_NoLost = Approved / (Total - Lost)
  - AverageTicket = Sum(Approved Amount) / Count(Approved)
  - OpenOpportunities = Total - Won - Lost

## Commands
```bash
npm install          # Install dependencies
npm start           # Run the server on port 3005
npm run dev         # Run with nodemon for development (if configured)
```

## Local Development
The server runs locally at: http://localhost:3005/
Dashboard available at: http://localhost:3005/index.html

## API Endpoints
- `GET /api/division-summary` - Returns aggregated metrics grouped by year and division
- `GET /api/lead-summary` - Returns aggregated metrics grouped by year and lead type
- `GET /api/opportunity-detail` - Returns detailed opportunity list with filters:
  - Query params: year, division, stage, leadType

## Architecture
The project uses:
- Express.js for REST API server
- mssql package for Azure SQL connection
- Optional: exceljs for Excel export functionality
- CTE-based SQL queries for performance optimization

## SQL Query Structure
All queries use a Common Table Expression (CTE) pattern:
1. Base CTE applies business rules for year calculation and filtering
2. Main SELECT performs aggregations with ROLLUP for totals
3. Formatting applied at SQL level for currency and percentages