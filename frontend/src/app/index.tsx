import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const CATALOGO = [
  { cliente: 'food_service_premium', sku: 'pechuga_de_pollo', precio: '3.85' },
  { cliente: 'despensa_familiar', sku: 'chorizo_de_pollo', precio: '2.10' },
  { cliente: 'pollo_campestre', sku: 'chorizo_de_pollo', precio: '2.15' },
  { cliente: 'mercado_central_sv', sku: 'alitas', precio: '2.95' },
  { cliente: 'maxi_despensa', sku: 'chorizo_de_pollo', precio: '2.05' },
  { cliente: 'distribuidora_occidente', sku: 'pollo_entero_fresco', precio: '4.50' },
  { cliente: 'maxi_despensa', sku: 'jamon_de_pavo', precio: '3.40' },
  { cliente: 'pollo_campero', sku: 'camperitos', precio: '3.10' },
  { cliente: 'super_selectos', sku: 'muslo_de_pollo', precio: '2.75' },
  { cliente: 'walmart_sv', sku: 'salchicha_de_pollo', precio: '1.95' }
];

const TRIMESTRES = [
  { label: 'Anual (Todos)', value: '' },
  { label: 'Q1 (Ene-Mar)', value: 'Q1' },
  { label: 'Q2 (Abr-Jun)', value: 'Q2' },
  { label: 'Q3 (Jul-Sep)', value: 'Q3' },
  { label: 'Q4 (Oct-Dic)', value: 'Q4' }
];

export default function Home() {
  const params = useLocalSearchParams();
  const [modoVista, setModoVista] = useState<'PREDECIR' | 'FEEDBACK'>('PREDECIR');

  const [cliente, setCliente] = useState('');
  const [sku, setSku] = useState('');
  const [trimestre, setTrimestre] = useState('');
  const [esFestivo, setEsFestivo] = useState(false);

  const [ventaRealDia, setVentaRealDia] = useState('');
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [huboQuiebre, setHuboQuiebre] = useState(false);
  const [guardandoVenta, setGuardandoVenta] = useState(false);
  const [reentrenando, setReentrenando] = useState(false);
  const [mensajeOperacion, setMensajeOperacion] = useState<string | null>(null);

  const [sugerencia, setSugerencia] = useState<any>(null);
  const [cargando, setCargando] = useState(false);
  const [estadoApi, setEstadoApi] = useState('Conectando...');
  const [apiOnline, setApiOnline] = useState(false);

  const [sugerenciasFiltradas, setSugerenciasFiltradas] = useState<any[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);

  const BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    if (params?.cliente && typeof params.cliente === 'string') {
      setCliente(params.cliente);
    }
    if (params?.sku && typeof params.sku === 'string') {
      setSku(params.sku);
    }
  }, [params?.cliente, params?.sku]);

  useEffect(() => {
    fetch(`${BASE_URL}/`)
      .then(res => res.json())
      .then(() => {
        setEstadoApi('Servidor conectado');
        setApiOnline(true);
      })
      .catch(() => {
        setEstadoApi('Sin conexión al servidor');
        setApiOnline(false);
      });
  }, []);

  const manejarEscrituraCliente = (texto: string) => {
    setCliente(texto);
    setSku('');
    setSugerencia(null);
    setMensajeOperacion(null);

    if (texto.trim().length > 0) {
      const filtrados = CATALOGO.filter(item =>
        item.cliente.toLowerCase().includes(texto.trim().toLowerCase())
      );
      setSugerenciasFiltradas(filtrados);
      setMostrarSugerencias(true);
    } else {
      setMostrarSugerencias(false);
    }
  };

  const seleccionarSugerencia = (item: any) => {
    setCliente(item.cliente);
    setSku(item.sku);
    if (item.precio) setPrecioUnitario(item.precio);
    setMostrarSugerencias(false);
  };

  const cambiarModo = (nuevoModo: 'PREDECIR' | 'FEEDBACK') => {
    setModoVista(nuevoModo);
    setMostrarSugerencias(false);
    setMensajeOperacion(null);
  };

  const calcularOrden = async () => {
    if (!cliente || !sku) {
      Alert.alert("Datos incompletos", "Ingresa el cliente y el producto.");
      return;
    }
    setCargando(true);
    setSugerencia(null);
    setMostrarSugerencias(false);

    try {
      const response = await fetch(`${BASE_URL}/api/predecir`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          id_cliente: cliente.trim().toLowerCase(),
          sku_producto: sku.trim().toLowerCase(),
          trimestre: trimestre || null,
          es_festivo: esFestivo ? 1 : 0
        })
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Aviso", data.error || "No hay registros suficientes para este cliente.");
      } else {
        setSugerencia(data);

        const nuevoRegistro = {
          id: Date.now().toString(),
          cliente: cliente.trim().toLowerCase(),
          sku: sku.trim().toLowerCase(),
          trimestre_codigo: trimestre || 'Anual',
          trimestre: data.trimestre_aplicado || 'Anual',
          lote_diario: data.lote_diario_sugerido || 0,
          pedido_base: data.pedido_base_ia || data.pedido_sugerido,
          stock_seguridad: data.stock_seguridad || 0,
          punto_reorden: data.punto_reorden || 0,
          precio_unitario: data.precio_unitario || 2.50,
          pedido: data.pedido_sugerido,
          estado: 'Pendiente',
          hora: new Date().toLocaleTimeString()
        };

        const historialPrevio = await AsyncStorage.getItem('historial_smartp');
        const historialParseado = historialPrevio ? JSON.parse(historialPrevio) : [];
        await AsyncStorage.setItem('historial_smartp', JSON.stringify([nuevoRegistro, ...historialParseado]));
      }
    } catch (error) {
      Alert.alert("Error de red", "Verifica que el servidor backend esté activo.");
    } finally {
      setCargando(false);
    }
  };

  const registrarVentaEnDB = async () => {
    if (!cliente || !sku || !ventaRealDia) {
      Alert.alert("Datos incompletos", "Completa el cliente, el producto y la cantidad vendida.");
      return;
    }
    setGuardandoVenta(true);
    setMensajeOperacion(null);
    setMostrarSugerencias(false);

    try {
      const response = await fetch(`${BASE_URL}/api/registrar_venta`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_cliente: cliente.trim().toLowerCase(),
          sku_producto: sku.trim().toLowerCase(),
          venta_real: Number(ventaRealDia),
          precio_unitario: Number(precioUnitario) || 2.50,
          quiebre_stock: huboQuiebre ? 1 : 0,
          es_festivo: esFestivo ? 1 : 0
        })
      });

      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Error", data.error || "No se pudo guardar el registro.");
      } else {
        setVentaRealDia('');
        setMensajeOperacion(data.mensaje);
      }
    } catch (error) {
      Alert.alert("Error de conexión", "No fue posible conectar con la base de datos.");
    } finally {
      setGuardandoVenta(false);
    }
  };

  const actualizarModelo = async () => {
    setReentrenando(true);
    setMensajeOperacion(null);
    setMostrarSugerencias(false);
    try {
      const response = await fetch(`${BASE_URL}/api/reentrenar`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) {
        Alert.alert("Error", data.error || "No se pudo actualizar el modelo.");
      } else {
        setMensajeOperacion(`Modelo actualizado con ${data.registros_entrenamiento} registros (MAPE: ${data.mape}%).`);
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo completar la actualización.");
    } finally {
      setReentrenando(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.container}>
        {/* Encabezado limpio y corporativo */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.header}>SmartPollos Hermanos</Text>
            <Text style={styles.subHeader}>Planificación de Demanda e Inventarios</Text>
          </View>

          <View style={styles.headerRightGroup}>
            <View style={styles.modeSwitchContainer}>
              <TouchableOpacity
                style={[styles.modeBtn, modoVista === 'PREDECIR' && styles.modeBtnActive]}
                onPress={() => cambiarModo('PREDECIR')}
              >
                <Text style={[styles.modeBtnText, modoVista === 'PREDECIR' && styles.modeBtnTextActive]}>
                  Calcular Pedido
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeBtn, modoVista === 'FEEDBACK' && styles.modeBtnActive]}
                onPress={() => cambiarModo('FEEDBACK')}
              >
                <Text style={[styles.modeBtnText, modoVista === 'FEEDBACK' && styles.modeBtnTextActive]}>
                  Cierre de Ventas
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.statusBadge, apiOnline ? styles.badgeOnline : styles.badgeOffline]}>
              <View style={[styles.statusDot, apiOnline ? { backgroundColor: '#16a085' } : { backgroundColor: '#c0392b' }]} />
              <Text style={[styles.statusText, apiOnline ? { color: '#16a085' } : { color: '#c0392b' }]}>
                {estadoApi}
              </Text>
            </View>
          </View>
        </View>

        {/* Formulario Principal */}
        <View style={styles.inputContainer}>
          {/* FILA SUPERIOR CON Z-INDEX ALTO PARA QUE EL DROPDOWN NUNCA SE TAPE */}
          <View style={styles.topInputsRow}>
            <View style={[styles.inputColumn, { zIndex: 300 }]}>
              <Text style={styles.label}>Cliente</Text>
              <TextInput
                value={cliente}
                onChangeText={manejarEscrituraCliente}
                onFocus={() => {
                  if (cliente.trim().length > 0 && sugerenciasFiltradas.length > 0) {
                    setMostrarSugerencias(true);
                  }
                }}
                style={styles.input}
                placeholder="Buscar cliente..."
                placeholderTextColor="#95a5a6"
                autoCapitalize="none"
              />

              {mostrarSugerencias && sugerenciasFiltradas.length > 0 && (
                <View style={styles.dropdown}>
                  {sugerenciasFiltradas.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.dropdownItem,
                        index === sugerenciasFiltradas.length - 1 && { borderBottomWidth: 0 }
                      ]}
                      onPress={() => seleccionarSugerencia(item)}
                    >
                      <Text style={styles.dropdownCliente}>{item.cliente}</Text>
                      <Text style={styles.dropdownSku}>Sugerencia: {item.sku}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            <View style={[styles.inputColumn, { zIndex: 1 }]}>
              <Text style={styles.label}>SKU del Producto</Text>
              <TextInput
                value={sku}
                onChangeText={setSku}
                style={styles.input}
                placeholder="Producto asignado..."
                placeholderTextColor="#95a5a6"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* FILA INFERIOR CON Z-INDEX BAJO (1) PARA QUEDAR DETRÁS DE LAS SUGERENCIAS */}
          {modoVista === 'PREDECIR' ? (
            <View style={styles.bottomControlsRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { marginTop: 12 }]}>Periodo de Consulta</Text>
                <View style={styles.trimestreRow}>
                  {TRIMESTRES.map((item) => {
                    const activo = trimestre === item.value;
                    return (
                      <TouchableOpacity
                        key={item.label}
                        style={[styles.trimestreChip, activo && styles.trimestreChipActivo]}
                        onPress={() => setTrimestre(item.value)}
                      >
                        <Text style={[styles.trimestreChipText, activo && styles.trimestreChipTextActivo]}>
                          {item.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.holidayToggleColumn}>
                <Text style={[styles.label, { marginTop: 12 }]}>Tipo de Jornada</Text>
                <TouchableOpacity
                  style={[styles.holidayChip, esFestivo && styles.holidayChipActive]}
                  onPress={() => setEsFestivo(!esFestivo)}
                >
                  <Text style={[styles.holidayChipText, esFestivo && { color: '#e67e22', fontWeight: 'bold' }]}>
                    {esFestivo ? 'Alta Demanda / Quincena' : 'Jornada Regular'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.bottomInputsRow}>
              <View style={styles.inputColumn}>
                <Text style={styles.label}>Unidades Vendidas (Cierre)</Text>
                <TextInput
                  value={ventaRealDia}
                  onChangeText={setVentaRealDia}
                  style={styles.input}
                  placeholder="Cantidad"
                  placeholderTextColor="#95a5a6"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputColumn}>
                <Text style={styles.label}>Precio Unitario ($)</Text>
                <TextInput
                  value={precioUnitario}
                  onChangeText={setPrecioUnitario}
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor="#95a5a6"
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputColumn}>
                <Text style={styles.label}>Incidencias del Día</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <TouchableOpacity
                    style={[styles.trimestreChip, huboQuiebre && styles.quiebreChipActivo]}
                    onPress={() => setHuboQuiebre(!huboQuiebre)}
                  >
                    <Text style={[styles.trimestreChipText, huboQuiebre && { color: '#c0392b', fontWeight: 'bold' }]}>
                      {huboQuiebre ? 'Con Quiebre de Stock' : 'Sin Quiebre'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.trimestreChip, esFestivo && styles.holidayChipActive]}
                    onPress={() => setEsFestivo(!esFestivo)}
                  >
                    <Text style={[styles.trimestreChipText, esFestivo && { color: '#e67e22', fontWeight: 'bold' }]}>
                      {esFestivo ? 'Quincena / Festivo' : 'Día Normal'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Botones de Acción */}
        {modoVista === 'PREDECIR' ? (
          <TouchableOpacity
            style={[styles.button, !apiOnline && styles.buttonDisabled]}
            onPress={calcularOrden}
            disabled={cargando || !apiOnline}
          >
            {cargando ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Calcular Orden de Despacho</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.feedbackButtonsRow}>
            <TouchableOpacity
              style={[styles.button, { flex: 1, marginBottom: 0 }, (!apiOnline || guardandoVenta) && styles.buttonDisabled]}
              onPress={registrarVentaEnDB}
              disabled={guardandoVenta || !apiOnline}
            >
              {guardandoVenta ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Registrar Cierre Diario</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.retrainButton, (!apiOnline || reentrenando) && styles.buttonDisabled]}
              onPress={actualizarModelo}
              disabled={reentrenando || !apiOnline}
            >
              {reentrenando ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Actualizar Modelo</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Solo se muestra si hay un resultado real calculado o un aviso de guardado */}
        {modoVista === 'PREDECIR' && sugerencia && (
          <View style={styles.card}>
            <Text style={styles.resultLabel}>
              ORDEN DE DESPACHO ({sugerencia.trimestre_aplicado})
            </Text>

            <Text style={styles.number}>
              {sugerencia.pedido_sugerido.toLocaleString()} unds.
            </Text>

            <View style={styles.safetyMetricsRow}>
              <View style={styles.safetyPill}>
                <Text style={styles.safetyPillLabel}>Demanda Base:</Text>
                <Text style={styles.safetyPillValue}>{(sugerencia.pedido_base_ia || 0).toLocaleString()} u.</Text>
              </View>

              <View style={styles.safetyPill}>
                <Text style={styles.safetyPillLabel}>Stock Seguridad:</Text>
                <Text style={[styles.safetyPillValue, { color: '#e67e22' }]}>+{sugerencia.stock_seguridad || 0} u.</Text>
              </View>

              <View style={styles.safetyPill}>
                <Text style={styles.safetyPillLabel}>Punto Reorden:</Text>
                <Text style={styles.safetyPillValue}>{sugerencia.punto_reorden || 0} u.</Text>
              </View>

              <View style={styles.safetyPill}>
                <Text style={styles.safetyPillLabel}>Promedio Diario:</Text>
                <Text style={styles.safetyPillValue}>{sugerencia.lote_diario_sugerido} u./día</Text>
              </View>
            </View>

            <Text style={styles.status}>
              {sugerencia.registros_evaluados} registros evaluados • Precio unitario: ${sugerencia.precio_unitario}
            </Text>
          </View>
        )}

        {modoVista === 'FEEDBACK' && mensajeOperacion && (
          <View style={styles.card}>
            <Text style={styles.status}>{mensajeOperacion}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f6f9', justifyContent: 'center' },
  container: { width: '100%', maxWidth: 960, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 14 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  header: { fontSize: 23, fontWeight: 'bold', color: '#2c3e50' },
  subHeader: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },
  headerRightGroup: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },

  modeSwitchContainer: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 8, padding: 3, borderWidth: 1, borderColor: '#dcdde1' },
  modeBtn: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  modeBtnActive: { backgroundColor: '#2c3e50' },
  modeBtnText: { fontSize: 12, fontWeight: '600', color: '#7f8c8d' },
  modeBtnTextActive: { color: '#fff', fontWeight: '700' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  badgeOnline: { backgroundColor: '#e8f8f5', borderWidth: 1, borderColor: '#1abc9c' },
  badgeOffline: { backgroundColor: '#fadbd8', borderWidth: 1, borderColor: '#e74c3c' },
  statusText: { fontSize: 11, fontWeight: '700' },

  inputContainer: { backgroundColor: '#fff', padding: 18, borderRadius: 10, marginBottom: 14, elevation: 2, borderWidth: 1, borderColor: '#ecf0f1', zIndex: 50 },
  topInputsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', zIndex: 200 },
  bottomInputsRow: { flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: 12, zIndex: 1 },
  inputColumn: { flex: 1, minWidth: 200, position: 'relative' },
  label: { fontSize: 12, fontWeight: '700', color: '#34495e', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#dcdde1', paddingVertical: 9, paddingHorizontal: 12, borderRadius: 8, fontSize: 14, backgroundColor: '#fff', color: '#2c3e50' },

  dropdown: { position: 'absolute', top: 66, left: 0, right: 0, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#dcdde1', maxHeight: 180, elevation: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 8, zIndex: 999 },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#f1f2f6', backgroundColor: '#fff' },
  dropdownCliente: { fontSize: 13, fontWeight: 'bold', color: '#2c3e50' },
  dropdownSku: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },

  bottomControlsRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, zIndex: 1 },
  trimestreRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  trimestreChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#dcdde1', backgroundColor: '#f8f9fa' },
  trimestreChipActivo: { backgroundColor: '#e8f8f5', borderColor: '#1abc9c' },
  quiebreChipActivo: { backgroundColor: '#fadbd8', borderColor: '#e74c3c' },
  trimestreChipText: { fontSize: 12, color: '#7f8c8d', fontWeight: '600' },
  trimestreChipTextActivo: { color: '#16a085', fontWeight: 'bold' },

  holidayToggleColumn: { minWidth: 180 },
  holidayChip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: '#dcdde1', backgroundColor: '#f8f9fa', alignItems: 'center' },
  holidayChipActive: { backgroundColor: '#fcf3eb', borderColor: '#e67e22' },
  holidayChipText: { fontSize: 12, color: '#7f8c8d', fontWeight: '600' },

  feedbackButtonsRow: { flexDirection: 'row', gap: 12, marginBottom: 14, flexWrap: 'wrap', zIndex: 1 },
  button: { backgroundColor: '#e67e22', paddingVertical: 12, borderRadius: 8, alignItems: 'center', elevation: 1, marginBottom: 14, zIndex: 1 },
  retrainButton: { flex: 1, backgroundColor: '#2c3e50', paddingVertical: 12, borderRadius: 8, alignItems: 'center', elevation: 1 },
  buttonDisabled: { backgroundColor: '#bdc3c7', elevation: 0 },
  buttonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },

  card: { paddingVertical: 16, paddingHorizontal: 18, backgroundColor: '#e8f8f5', borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#1abc9c', zIndex: 1 },
  resultLabel: { fontSize: 11, color: '#16a085', fontWeight: 'bold', textTransform: 'uppercase' },
  number: { fontSize: 32, fontWeight: '900', color: '#27ae60', marginVertical: 4 },

  safetyMetricsRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginVertical: 6 },
  safetyPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#d1f2eb' },
  safetyPillLabel: { fontSize: 11, color: '#7f8c8d', fontWeight: '600' },
  safetyPillValue: { fontSize: 11, color: '#2c3e50', fontWeight: 'bold' },

  status: { fontSize: 12, color: '#34495e', textAlign: 'center', marginTop: 2 }
});