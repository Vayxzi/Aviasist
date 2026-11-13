import sys
import os
from datetime import date
import numpy as np
import pandas as pd
import xgboost as xgb
from flask import Flask, jsonify, request
from flask_cors import CORS

# 1. Configurar la ruta para que Python detecte las carpetas en la raíz
directorio_raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if directorio_raiz not in sys.path:
    sys.path.append(directorio_raiz)

from data.database import (
    obtener_historial_cliente,
    insertar_venta_real,
    obtener_resumen_directorio
)
from backend.train import entrenar_modelo

app = Flask(__name__)
CORS(app)

ruta_modelo = os.path.join(directorio_raiz, "modelos", "xgboost_pedidos.json")
modelo = xgb.XGBRegressor()

def cargar_modelo_memoria():
    if os.path.exists(ruta_modelo):
        modelo.load_model(ruta_modelo)
        print("Modelo XGBoost cargado exitosamente en memoria.")
        return True
    print("Advertencia: No se encontró el modelo entrenado. Ejecuta train.py primero.")
    return False

cargar_modelo_memoria()

@app.route("/", methods=["GET"])
def estado_servidor():
    return jsonify({"estado": "API de SmartP en línea y lista para predicciones"})

def predecir_lote_diario(df_segmento, es_festivo_override=None):
    """Calcula la predicción diaria con XGBoost para un conjunto de datos."""
    df_seg = df_segmento.copy()
    df_seg['fecha'] = pd.to_datetime(df_seg['fecha'])
    df_seg['dia_semana'] = df_seg['fecha'].dt.dayofweek
    df_seg['trimestre'] = df_seg['fecha'].dt.quarter
    df_seg['promedio_7_dias'] = df_seg['venta_real'].rolling(window=7).mean()
    df_seg['promedio_14_dias'] = df_seg['venta_real'].rolling(window=14).mean()
    df_seg.dropna(inplace=True)

    ultima_fila = df_seg.iloc[-1]
    features_esperadas = modelo.get_booster().feature_names

    datos_fila = {
        'dia_semana': (int(ultima_fila['dia_semana']) + 1) % 7,
        'trimestre': int(ultima_fila['trimestre']),
        'promedio_7_dias': float(ultima_fila['promedio_7_dias']),
        'promedio_14_dias': float(ultima_fila['promedio_14_dias']),
        'precio_unitario': float(ultima_fila.get('precio_unitario', 2.50)),
        'es_festivo': int(es_festivo_override) if es_festivo_override is not None else int(ultima_fila.get('es_festivo', 0))
    }

    if features_esperadas:
        X_nuevo = pd.DataFrame([{col: datos_fila.get(col, 0) for col in features_esperadas}])
    else:
        X_nuevo = pd.DataFrame([datos_fila])

    prediccion = float(modelo.predict(X_nuevo)[0])
    return max(0.0, prediccion)

@app.route("/api/predecir", methods=["POST"])
def predecir():
    datos = request.get_json() or {}
    id_cliente = datos.get("id_cliente", "").strip().lower()
    sku_producto = datos.get("sku_producto", "").strip().lower()
    trimestre = datos.get("trimestre")
    es_festivo = datos.get("es_festivo", 0)
    fecha_inicio = datos.get("fecha_inicio")
    fecha_fin = datos.get("fecha_fin")

    if not id_cliente or not sku_producto:
        return jsonify({"error": "Por favor ingresa el cliente y el SKU."}), 400

    df_cliente = obtener_historial_cliente(
        id_cliente,
        sku_producto,
        trimestre=trimestre,
        fecha_inicio=fecha_inicio,
        fecha_fin=fecha_fin
    )

    total_registros = len(df_cliente)
    if total_registros < 14:
        etiqueta_filtro = f" en el trimestre {trimestre}" if trimestre else ""
        return jsonify({
            "error": f"Datos insuficientes para {id_cliente} ({sku_producto}){etiqueta_filtro}. Se requieren mínimo 14 registros y solo hay {total_registros}."
        }), 400

    if trimestre:
        lote_diario = int(np.round(predecir_lote_diario(df_cliente, es_festivo_override=es_festivo)))
        pedido_base = int(lote_diario * total_registros)
        etiqueta = f"{trimestre} ({total_registros} entregas)"
    else:
        df_cliente['trimestre_num'] = pd.to_datetime(df_cliente['fecha']).dt.quarter
        suma_anual = 0
        lotes_trimestres = []

        for q in [1, 2, 3, 4]:
            df_q = df_cliente[df_cliente['trimestre_num'] == q]
            if len(df_q) >= 14:
                diario_q = predecir_lote_diario(df_q, es_festivo_override=es_festivo)
                suma_anual += diario_q * len(df_q)
                lotes_trimestres.append(diario_q)

        if suma_anual == 0:
            lote_diario = int(np.round(predecir_lote_diario(df_cliente, es_festivo_override=es_festivo)))
            pedido_base = int(lote_diario * total_registros)
        else:
            lote_diario = int(np.round(np.mean(lotes_trimestres)))
            pedido_base = int(np.round(suma_anual))

        etiqueta = f"Anual Acumulado ({total_registros} entregas)"

    # === CÁLCULO DE STOCK DE SEGURIDAD Y PUNTO DE REORDEN (ROP) ===
    # Z = 1.65 (Nivel de servicio del 95%), Lead Time = 2 días de reabastecimiento
    desviacion_diaria = float(df_cliente['venta_real'].std() or 0.0)
    lead_time_dias = 2
    stock_seguridad = int(np.round(1.65 * desviacion_diaria * np.sqrt(lead_time_dias)))
    punto_reorden = int((lote_diario * lead_time_dias) + stock_seguridad)
    pedido_total_con_colchon = int(pedido_base + stock_seguridad)

    quiebres_detectados = int((df_cliente['quiebre_stock'] == 1).sum())
    precio_actual = float(df_cliente['precio_unitario'].iloc[-1]) if 'precio_unitario' in df_cliente.columns else 2.50

    return jsonify({
        "id_cliente": id_cliente,
        "sku_producto": sku_producto,
        "trimestre_aplicado": etiqueta,
        "registros_evaluados": total_registros,
        "lote_diario_sugerido": lote_diario,
        "pedido_base_ia": pedido_base,
        "stock_seguridad": stock_seguridad,
        "punto_reorden": punto_reorden,
        "pedido_sugerido": pedido_total_con_colchon,
        "quiebres_historicos": quiebres_detectados,
        "precio_unitario": round(precio_actual, 2),
        "estado": "Aprobación pendiente"
    })

@app.route("/api/directorio", methods=["GET"])
def api_directorio():
    try:
        resumen = obtener_resumen_directorio()
        return jsonify({"directorio": resumen})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/registrar_venta", methods=["POST"])
def api_registrar_venta():
    datos = request.get_json() or {}
    id_cliente = datos.get("id_cliente", "").strip().lower()
    sku_producto = datos.get("sku_producto", "").strip().lower()
    venta_real = datos.get("venta_real")
    fecha = datos.get("fecha") or date.today().isoformat()
    quiebre_stock = int(datos.get("quiebre_stock", 0))
    precio_unitario = float(datos.get("precio_unitario", 2.50))
    es_festivo = int(datos.get("es_festivo", 0))

    if not id_cliente or not sku_producto or venta_real is None:
        return jsonify({"error": "Cliente, SKU y Venta Real son obligatorios."}), 400

    try:
        insertar_venta_real(
            fecha=fecha,
            id_cliente=id_cliente,
            sku_producto=sku_producto,
            venta_real=venta_real,
            quiebre_stock=quiebre_stock,
            precio_unitario=precio_unitario,
            es_festivo=es_festivo
        )
        return jsonify({
            "mensaje": f"Venta de {venta_real} unds. registrada para {id_cliente} ({sku_producto}) en fecha {fecha}."
        })
    except Exception as e:
        return jsonify({"error": f"No se pudo guardar en PostgreSQL: {str(e)}"}), 500

@app.route("/api/reentrenar", methods=["POST"])
def api_reentrenar():
    try:
        resultado = entrenar_modelo()
        cargar_modelo_memoria()
        return jsonify({
            "mensaje": "Modelo XGBoost re-entrenado y recargado en memoria RAM exitosamente.",
            "mape": resultado["mape"],
            "registros_entrenamiento": resultado["registros_entrenamiento"]
        })
    except Exception as e:
        return jsonify({"error": f"Error al re-entrenar el modelo: {str(e)}"}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)