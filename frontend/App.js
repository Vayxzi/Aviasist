import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';

export default function App() {
  const [cliente, setCliente] = useState('C-001');
  const [sku, setSku] = useState('POLLO-ENTERO-FRESCO');
  const [sugerencia, setSugerencia] = useState(null);
  const [cargando, setCargando] = useState(false);

  // CONFIGURA TU IP AQUÍ:
  // Usa 'http://10.0.2.2:8000/api/predecir' para Emulador Android
  // Usa 'http://192.168.X.X:8000/api/predecir' para dispositivo físico
  const API_URL = 'http://10.0.2.2:8000/api/predecir'; 

  const consultarPedidoIA = async () => {
    if (!cliente || !sku) {
      Alert.alert("Error", "Por favor ingresa el cliente y el SKU.");
      return;
    }

    setCargando(true);
    setSugerencia(null);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          id_cliente: cliente, 
          sku_producto: sku 
        })
      });

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      setSugerencia(data.pedido_sugerido);

    } catch (error) {
      console.error("Error en la petición:", error);
      Alert.alert(
        "Error de conexión", 
        "No se pudo conectar con el servidor Flask. Verifica tu IP y asegúrate de que el backend esté corriendo."
      );
    } finally {
      setCargando(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>SmartPollos Hermanos</Text>
      <Text style={styles.subHeader}>Matriz Predictiva de Pedidos</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>ID de Cliente:</Text>
        <TextInput 
          value={cliente} 
          onChangeText={setCliente} 
          style={styles.input} 
          placeholder="Ej. C-001"
        />
        
        <Text style={styles.label}>SKU del Producto:</Text>
        <TextInput 
          value={sku} 
          onChangeText={setSku} 
          style={styles.input} 
          placeholder="Ej. POLLO-ENTERO-FRESCO"
        />
      </View>
      
      <TouchableOpacity 
        style={styles.button} 
        onPress={consultarPedidoIA}
        disabled={cargando}
      >
        {cargando ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Generar Sugerencia IA</Text>
        )}
      </TouchableOpacity>
      
      {sugerencia !== null && (
        <View style={styles.card}>
          <Text style={styles.resultLabel}>Pedido Sugerido para Planta:</Text>
          <Text style={styles.number}>{sugerencia} unds.</Text>
          <Text style={styles.status}>Pendiente de aprobación comercial</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 25, backgroundColor: '#f4f6f9', justifyContent: 'center' },
  header: { fontSize: 26, fontWeight: 'bold', color: '#2c3e50', textAlign: 'center' },
  subHeader: { fontSize: 16, color: '#7f8c8d', textAlign: 'center', marginBottom: 30 },
  inputContainer: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  label: { fontSize: 14, fontWeight: '600', color: '#34495e', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#dcdde1', padding: 12, borderRadius: 8, fontSize: 16, backgroundColor: '#fbfbfb', marginBottom: 15 },
  button: { backgroundColor: '#e67e22', padding: 16, borderRadius: 8, alignItems: 'center', elevation: 3 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  card: { marginTop: 30, padding: 25, backgroundColor: '#e8f8f5', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1abc9c' },
  resultLabel: { fontSize: 14, color: '#27ae60', fontWeight: 'bold', textTransform: 'uppercase' },
  number: { fontSize: 40, fontWeight: '900', color: '#2ecc71', marginVertical: 10 },
  status: { fontSize: 12, color: '#7f8c8d', fontStyle: 'italic' }
});