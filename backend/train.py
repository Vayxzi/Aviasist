import sys
import os
import xgboost as xgb
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_percentage_error

# 1. Configurar la ruta para que Python detecte las carpetas en la raíz
directorio_raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if directorio_raiz not in sys.path:
    sys.path.append(directorio_raiz)

from data.database import obtener_datos_completos

def entrenar_modelo():
    print("Extrayendo historial desde PostgreSQL...")
    df = obtener_datos_completos()

    df['fecha'] = pd.to_datetime(df['fecha'])
    df = df.sort_values(by=['id_cliente', 'sku_producto', 'fecha']).reset_index(drop=True)

    # Feature Engineering agrupado por par Cliente-SKU
    df['dia_semana'] = df['fecha'].dt.dayofweek
    df['trimestre'] = df['fecha'].dt.quarter
    df['promedio_7_dias'] = df.groupby(['id_cliente', 'sku_producto'])['venta_real'].transform(lambda x: x.rolling(window=7).mean())
    df['promedio_14_dias'] = df.groupby(['id_cliente', 'sku_producto'])['venta_real'].transform(lambda x: x.rolling(window=14).mean())

    # Target: predecir la demanda del día siguiente dentro del mismo Cliente-SKU
    df['demanda_siguiente_dia'] = df.groupby(['id_cliente', 'sku_producto'])['venta_real'].shift(-1)
    df.dropna(inplace=True)

    features = ['dia_semana', 'trimestre', 'promedio_7_dias', 'promedio_14_dias', 'precio_unitario', 'es_festivo']
    X = df[features]
    y = df['demanda_siguiente_dia']

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, shuffle=False)

    print("Entrenando modelo XGBoost con variables de precio y festivos...")
    modelo = xgb.XGBRegressor(n_estimators=120, learning_rate=0.08, max_depth=4, random_state=42)
    modelo.fit(X_train, y_train)

    predicciones = modelo.predict(X_test)
    mape = float(mean_absolute_percentage_error(y_test, predicciones) * 100)
    print(f"Precisión del modelo validada. MAPE: {mape:.2f}%")

    ruta_modelos = os.path.join(directorio_raiz, "modelos")
    os.makedirs(ruta_modelos, exist_ok=True)
    ruta_archivo = os.path.join(ruta_modelos, "xgboost_pedidos.json")

    modelo.save_model(ruta_archivo)
    print(f"Modelo guardado exitosamente en: {ruta_archivo}")
    return {"mape": round(mape, 2), "registros_entrenamiento": len(df), "ruta": ruta_archivo}

if __name__ == "__main__":
    entrenar_modelo()