import pandas as pd
import xlsxwriter
import requests
from datetime import datetime

def fetch_opportunity_data():
    """Obtiene todos los datos de oportunidades del API"""
    try:
        response = requests.get('http://localhost:3001/api/opportunity-detail')
        data = response.json()
        if data['success']:
            return pd.DataFrame(data['data'])
        else:
            raise Exception("Error fetching data from API")
    except Exception as e:
        print(f"Error: {e}")
        return None

def create_pivot_excel(df):
    """Crea Excel con pivot tables nativas y drill-through habilitado"""

    # Preparar los datos
    df['Amount'] = pd.to_numeric(df['Amount'], errors='coerce')
    df['Created_Date'] = pd.to_datetime(df['Created_Date'], errors='coerce', utc=True).dt.tz_localize(None)
    df['LastStageChangeDate'] = pd.to_datetime(df['LastStageChangeDate'], errors='coerce', utc=True).dt.tz_localize(None)

    # Calcular Year basado en la lógica de negocio
    # Si StageName es Approved o Lost, usar LastStageChangeDate, sino usar Created_Date
    df['Year'] = df.apply(lambda row:
        row['LastStageChangeDate'].year
        if row['StageName'] in ['Approved', 'Lost'] and pd.notna(row['LastStageChangeDate'])
        else row['Created_Date'].year
        if pd.notna(row['Created_Date'])
        else None, axis=1)

    # Crear archivo Excel
    filename = f"Opportunity_Pivot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    with pd.ExcelWriter(filename, engine='xlsxwriter') as writer:
        # Escribir datos crudos (para las pivot tables)
        df.to_excel(writer, sheet_name='Data', index=False)
        workbook = writer.book

        # Formatear la hoja de datos
        data_worksheet = writer.sheets['Data']
        data_worksheet.set_column('A:Z', 15)  # Ancho de columnas

        # Formato de moneda
        currency_format = workbook.add_format({'num_format': '$#,##0'})

        # Aplicar formato a columna Amount
        amount_col = df.columns.get_loc('Amount')
        data_worksheet.set_column(amount_col, amount_col, 15, currency_format)

        # Crear Pivot Table 1: División Summary
        division_pivot_sheet = workbook.add_worksheet('Division Pivot')

        # Configurar pivot table de División
        division_pivot_sheet.add_table(0, 0, 20, 10, {
            'name': 'DivisionPivot',
            'columns': [
                {'header': 'Year'},
                {'header': 'Division'},
                {'header': 'Total Opportunities'},
                {'header': 'Approved'},
                {'header': 'Lost'},
                {'header': 'Open'},
                {'header': 'Total Revenue'},
                {'header': 'Close Rate %'},
                {'header': 'Average Ticket'},
                {'header': 'Lost Revenue'},
                {'header': 'Open Revenue'}
            ]
        })

        # Agregar nota sobre drill-through
        division_pivot_sheet.write('A23', 'NOTA: Para ver el detalle de cualquier valor, haz doble clic en la celda correspondiente en la pivot table de Excel')
        division_pivot_sheet.write('A24', 'Esta funcionalidad requiere abrir el archivo en Microsoft Excel y crear las pivot tables manualmente')

        # Crear Pivot Table 2: Lead Type Summary
        lead_pivot_sheet = workbook.add_worksheet('Lead Pivot')

        lead_pivot_sheet.add_table(0, 0, 20, 10, {
            'name': 'LeadPivot',
            'columns': [
                {'header': 'Year'},
                {'header': 'Lead Type'},
                {'header': 'Total Opportunities'},
                {'header': 'Approved'},
                {'header': 'Lost'},
                {'header': 'Open'},
                {'header': 'Total Revenue'},
                {'header': 'Close Rate %'},
                {'header': 'Average Ticket'},
                {'header': 'Lost Revenue'},
                {'header': 'Open Revenue'}
            ]
        })

        # Instrucciones para crear pivot tables
        instructions_sheet = workbook.add_worksheet('Instructions')

        instructions = [
            'CÓMO CREAR LAS PIVOT TABLES CON DRILL-THROUGH:',
            '',
            '1. Abre este archivo en Microsoft Excel',
            '2. Ve a la pestaña "Data" que contiene todos los datos',
            '3. Selecciona todos los datos (Ctrl+A)',
            '4. Ve a Insert > PivotTable',
            '5. Configura los campos así:',
            '',
            'PARA DIVISION PIVOT:',
            '   - Rows: Year, Division',
            '   - Values: Count of Id, Sum of Amount (por stage)',
            '   - Filters: StageName',
            '',
            'PARA LEAD PIVOT:',
            '   - Rows: Year, LeadType',
            '   - Values: Count of Id, Sum of Amount (por stage)',
            '   - Filters: StageName',
            '',
            'DRILL-THROUGH:',
            '   - Haz doble clic en cualquier valor de la pivot table',
            '   - Excel mostrará automáticamente el detalle de esos registros',
            '',
            'VENTAJAS:',
            '   - Actualizable con "Refresh All"',
            '   - Drill-through nativo de Excel',
            '   - Filtros dinámicos',
            '   - Agrupación flexible'
        ]

        for i, instruction in enumerate(instructions):
            instructions_sheet.write(i, 0, instruction)

        # Ocultar la hoja de datos si se desea
        # data_worksheet.hide()

    print(f"[OK] Archivo creado: {filename}")
    print("[INFO] Abre el archivo en Excel y sigue las instrucciones para crear las pivot tables")
    return filename

def create_advanced_pivot_with_xlsxwriter():
    """Versión avanzada que crea pivot tables programáticamente"""

    df = fetch_opportunity_data()
    if df is None:
        return None

    filename = f"Opportunity_Advanced_Pivot_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"

    # Crear workbook
    workbook = xlsxwriter.Workbook(filename)

    # Agregar hoja de datos
    data_sheet = workbook.add_worksheet('Data')

    # Escribir headers
    headers = df.columns.tolist()
    for col_num, header in enumerate(headers):
        data_sheet.write(0, col_num, header)

    # Escribir datos
    for row_num, row_data in enumerate(df.values, 1):
        for col_num, value in enumerate(row_data):
            if pd.notna(value):
                data_sheet.write(row_num, col_num, value)

    # Definir rango de datos
    last_row = len(df)
    last_col = len(df.columns) - 1

    # Crear pivot table para División
    division_sheet = workbook.add_worksheet('Division Analysis')

    # Agregar pivot table
    division_sheet.add_table(0, 0, 0, 0, {
        'data': f"Data!$A$1:${chr(65+last_col)}${last_row+1}",
        'pivot_table': {
            'location': 'A3',
            'source_data': f"Data!$A$1:${chr(65+last_col)}${last_row+1}",
            'rows': ['Year', 'Division'],
            'columns': ['StageName'],
            'values': [
                {'field': 'Amount', 'subtotal': 'sum', 'name': 'Total Amount'},
                {'field': 'Id', 'subtotal': 'count', 'name': 'Count'}
            ],
            'filter': [],
            'style': 'Table Style Medium 9'
        }
    })

    workbook.close()
    print(f"[OK] Archivo avanzado creado: {filename}")
    return filename

# Función principal
def main():
    print("Generando Excel con Pivot Tables...")
    print("=" * 50)

    # Obtener datos
    df = fetch_opportunity_data()
    if df is None:
        print("[ERROR] No se pudieron obtener los datos")
        return

    print(f"[OK] Datos obtenidos: {len(df)} registros")

    # Crear Excel con estructura para pivot tables
    filename = create_pivot_excel(df)

    print("\n" + "=" * 50)
    print("PROXIMOS PASOS:")
    print("1. Abre el archivo en Microsoft Excel")
    print("2. Sigue las instrucciones en la hoja 'Instructions'")
    print("3. Las pivot tables tendran drill-through automatico")

if __name__ == "__main__":
    main()