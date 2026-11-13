import os
import pandas as pd
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def obtener_conexion():
    return psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        database=os.getenv("DB_NAME", "postgres"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "tu_contraseña"),
        port=os.getenv("DB_PORT", "5432")
    )

def obtener_datos_completos(trimestre=None, fecha_inicio=None, fecha_fin=None):
    conexion = obtener_conexion()
    query = """
        SELECT 
            fecha, 
            id_cliente, 
            sku_producto, 
            venta_real, 
            quiebre_stock,
            COALESCE(precio_unitario, 2.50) AS precio_unitario,
            COALESCE(es_festivo, 0) AS es_festivo
        FROM ventas_historicas
    """
    
    condiciones = []
    params = []

    if trimestre:
        trimestre = trimestre.upper()
        if trimestre == 'Q1':
            condiciones.append("EXTRACT(QUARTER FROM fecha) = 1")
        elif trimestre == 'Q2':
            condiciones.append("EXTRACT(QUARTER FROM fecha) = 2")
        elif trimestre == 'Q3':
            condiciones.append("EXTRACT(QUARTER FROM fecha) = 3")
        elif trimestre == 'Q4':
            condiciones.append("EXTRACT(QUARTER FROM fecha) = 4")

    if fecha_inicio and fecha_fin:
        condiciones.append("fecha BETWEEN %s AND %s")
        params.extend([fecha_inicio, fecha_fin])

    if condiciones:
        query += " WHERE " + " AND ".join(condiciones)

    query += " ORDER BY fecha ASC;"
    
    df = pd.read_sql(query, conexion, params=params if params else None)
    conexion.close()
    
    if not df.empty:
        df['venta_real'] = df['venta_real'].astype(float)
        df['precio_unitario'] = df['precio_unitario'].astype(float)
        df['es_festivo'] = df['es_festivo'].astype(int)
        # Guardar copia cruda de quiebres antes de imputar ventas con ffill
        df.loc[df['quiebre_stock'] == 1, 'venta_real'] = None
        df['venta_real'] = df.groupby(['id_cliente', 'sku_producto'])['venta_real'].transform(
            lambda x: x.ffill().bfill().fillna(0)
        )
    
    return df

def obtener_historial_cliente(id_cliente, sku_producto, trimestre=None, fecha_inicio=None, fecha_fin=None):
    df = obtener_datos_completos(trimestre=trimestre, fecha_inicio=fecha_inicio, fecha_fin=fecha_fin)
    if df.empty:
        return df
    return df[(df['id_cliente'] == id_cliente) & (df['sku_producto'] == sku_producto)]

def insertar_venta_real(fecha, id_cliente, sku_producto, venta_real, quiebre_stock=0, precio_unitario=2.50, es_festivo=0):
    conexion = obtener_conexion()
    cursor = conexion.cursor()
    query = """
        INSERT INTO ventas_historicas (fecha, id_cliente, sku_producto, venta_real, quiebre_stock, precio_unitario, es_festivo)
        VALUES (%s, %s, %s, %s, %s, %s, %s);
    """
    cursor.execute(query, (fecha, id_cliente, sku_producto, float(venta_real), int(quiebre_stock), float(precio_unitario), int(es_festivo)))
    conexion.commit()
    cursor.close()
    conexion.close()

def obtener_resumen_directorio():
    conexion = obtener_conexion()
    query = """
        SELECT 
            id_cliente AS cliente,
            sku_producto AS sku,
            COUNT(*) AS registros,
            SUM(CASE WHEN quiebre_stock = 1 THEN 1 ELSE 0 END) AS quiebres_totales,
            SUM(CASE WHEN quiebre_stock = 1 AND EXTRACT(QUARTER FROM fecha) = 4 THEN 1 ELSE 0 END) AS quiebres_recientes,
            ROUND(AVG(COALESCE(precio_unitario, 2.50))::numeric, 2) AS precio_unitario
        FROM ventas_historicas
        GROUP BY id_cliente, sku_producto
        HAVING COUNT(*) >= 14
        ORDER BY COUNT(*) DESC, id_cliente ASC;
    """
    df = pd.read_sql(query, conexion)
    conexion.close()
    return df.to_dict(orient="records")