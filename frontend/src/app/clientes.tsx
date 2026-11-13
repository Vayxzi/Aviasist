import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const DIRECTORIO_BASE = [
  { cliente: "food_service_premium", sku: "pechuga_de_pollo", registros: 80, quiebres_recientes: 1, precio_unitario: 3.85, categoria: "Food Service" },
  { cliente: "despensa_familiar", sku: "chorizo_de_pollo", registros: 80, quiebres_recientes: 1, precio_unitario: 2.10, categoria: "Supermercado" },
  { cliente: "pollo_campestre", sku: "chorizo_de_pollo", registros: 80, quiebres_recientes: 3, precio_unitario: 2.15, categoria: "Restaurante" },
  { cliente: "mercado_central_sv", sku: "alitas", registros: 80, quiebres_recientes: 3, precio_unitario: 2.95, categoria: "Mayorista" },
  { cliente: "maxi_despensa", sku: "chorizo_de_pollo", registros: 80, quiebres_recientes: 1, precio_unitario: 2.05, categoria: "Supermercado" },
  { cliente: "maxi_despensa", sku: "jamon_de_pavo", registros: 80, quiebres_recientes: 1, precio_unitario: 3.40, categoria: "Supermercado" },
  { cliente: "distribuidora_occidente", sku: "pollo_entero_fresco", registros: 80, quiebres_recientes: 1, precio_unitario: 4.50, categoria: "Distribuidor" },
  { cliente: "pollo_campero", sku: "camperitos", registros: 80, quiebres_recientes: 3, precio_unitario: 3.10, categoria: "Restaurante" },
  { cliente: "super_selectos", sku: "muslo_de_pollo", registros: 80, quiebres_recientes: 1, precio_unitario: 2.75, categoria: "Supermercado" },
  { cliente: "walmart_sv", sku: "salchicha_de_pollo", registros: 80, quiebres_recientes: 3, precio_unitario: 1.95, categoria: "Supermercado" }
];

const CATEGORIAS_CLIENTE: Record<string, string> = {
  food_service_premium: "Food Service",
  despensa_familiar: "Supermercado",
  pollo_campestre: "Restaurante",
  mercado_central_sv: "Mayorista",
  maxi_despensa: "Supermercado",
  distribuidora_occidente: "Distribuidor",
  pollo_campero: "Restaurante",
  super_selectos: "Supermercado",
  walmart_sv: "Supermercado",
  restaurante_el_buen_sabor: "Restaurante",
  hotel_las_palmeras: "Hotelería",
  cafeterias_unidas: "Cafetería"
};

export default function Clientes() {
  const router = useRouter();
  const [registrosCrudos, setRegistrosCrudos] = useState(DIRECTORIO_BASE);
  const [soloAlertas, setSoloAlertas] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [clientesContraidos, setClientesContraidos] = useState<Record<string, boolean>>({});

  const BASE_URL = 'http://127.0.0.1:8000';

  useEffect(() => {
    fetch(`${BASE_URL}/api/directorio`)
      .then(res => res.json())
      .then(data => {
        if (data?.directorio && data.directorio.length > 0) {
          // Filtrar registros de prueba como '123' / 'ABC' para mantener limpio el catálogo
          const limpios = data.directorio
            .filter((item: any) => item.cliente !== '123' && item.sku !== 'abc')
            .map((item: any) => ({
              cliente: item.cliente,
              sku: item.sku,
              registros: Number(item.registros) || 80,
              quiebres_recientes: Number(item.quiebres_recientes ?? 0),
              precio_unitario: Number(item.precio_unitario ?? 2.50),
              categoria: CATEGORIAS_CLIENTE[item.cliente] || "Mayorista"
            }));
          if (limpios.length > 0) {
            setRegistrosCrudos(limpios);
          }
        }
      })
      .catch(() => {
        // Si la API está apagada, usa el catálogo base
      });
  }, []);

  const irAPredecir = (cliente: string, sku: string) => {
    router.push({
      pathname: '/',
      params: { cliente, sku }
    });
  };

  const alternarCliente = (nombreCliente: string) => {
    setClientesContraidos(prev => ({
      ...prev,
      [nombreCliente]: !prev[nombreCliente]
    }));
  };

  // === AGRUPAR TODOS LOS PRODUCTOS DEBAJO DE CADA CLIENTE ÚNICO ===
  const mapaAgrupado: Record<string, any> = {};

  registrosCrudos.forEach((item) => {
    const texto = busqueda.trim().toLowerCase();
    const coincideBusqueda =
      !texto ||
      item.cliente.toLowerCase().includes(texto) ||
      item.sku.toLowerCase().includes(texto);

    if (!coincideBusqueda) return;
    if (soloAlertas && item.quiebres_recientes <= 2) return;

    if (!mapaAgrupado[item.cliente]) {
      mapaAgrupado[item.cliente] = {
        cliente: item.cliente,
        categoria: CATEGORIAS_CLIENTE[item.cliente] || item.categoria || "Mayorista",
        totalRegistros: 0,
        quiebresMaximos: 0,
        skusEnRiesgo: 0,
        productos: []
      };
    }

    mapaAgrupado[item.cliente].totalRegistros += item.registros;
    if (item.quiebres_recientes > 2) {
      mapaAgrupado[item.cliente].skusEnRiesgo += 1;
    }
    if (item.quiebres_recientes > mapaAgrupado[item.cliente].quiebresMaximos) {
      mapaAgrupado[item.cliente].quiebresMaximos = item.quiebres_recientes;
    }

    mapaAgrupado[item.cliente].productos.push({
      sku: item.sku,
      registros: item.registros,
      quiebres_recientes: item.quiebres_recientes,
      precio_unitario: item.precio_unitario
    });
  });

  const clientesAgrupados = Object.values(mapaAgrupado).sort(
    (a: any, b: any) => b.productos.length - a.productos.length || b.totalRegistros - a.totalRegistros
  );

  const totalClientesEnRiesgo = Object.values(
    registrosCrudos.reduce((acc: any, item) => {
      if (item.quiebres_recientes > 2) acc[item.cliente] = true;
      return acc;
    }, {})
  ).length;

  return (
    <ScrollView style={styles.scrollBg} contentContainerStyle={styles.container}>
      {/* ENCABEZADO */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Directorio de Clientes y Catálogo SKU</Text>
          <Text style={styles.subHeader}>
            {clientesAgrupados.length} empresas activas • Cada cliente agrupa todos sus productos autorizados
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.filterAlertBtn, soloAlertas && styles.filterAlertBtnActive]}
          onPress={() => setSoloAlertas(!soloAlertas)}
        >
          <Ionicons name="warning-outline" size={16} color={soloAlertas ? "#fff" : "#c0392b"} />
          <Text style={[styles.filterAlertText, soloAlertas && { color: "#fff" }]}>
            {soloAlertas ? "Ver Todos los Clientes" : `Clientes con Alerta (${totalClientesEnRiesgo})`}
          </Text>
        </TouchableOpacity>
      </View>

      {/* BARRA INFORMATIVA Y BUSCADOR */}
      <View style={styles.topBarRow}>
        <View style={styles.infoBox}>
          <Ionicons name="layers-outline" size={20} color="#16a085" />
          <Text style={styles.infoText}>
            Vista agrupada por empresa: selecciona cualquier producto dentro de la ficha del cliente para enviarlo al predictor IA.
          </Text>
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#7f8c8d" />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Buscar cliente o producto..."
            placeholderTextColor="#95a5a6"
            style={styles.searchInput}
          />
          {busqueda.length > 0 && (
            <TouchableOpacity onPress={() => setBusqueda('')}>
              <Ionicons name="close-circle" size={16} color="#95a5a6" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* LISTA DE CLIENTES AGRUPADOS */}
      <View style={styles.listContainer}>
        {clientesAgrupados.map((grupo: any) => {
          const tieneAlerta = grupo.skusEnRiesgo > 0;
          const estaContraido = !!clientesContraidos[grupo.cliente];

          return (
            <View
              key={grupo.cliente}
              style={[styles.clientCard, tieneAlerta && styles.clientCardAlert]}
            >
              {/* Cabecera del Cliente */}
              <TouchableOpacity
                style={styles.clientHeader}
                onPress={() => alternarCliente(grupo.cliente)}
                activeOpacity={0.75}
              >
                <View style={styles.clientHeaderLeft}>
                  <View style={[styles.iconContainer, tieneAlerta && { backgroundColor: '#fadbd8' }]}>
                    <Ionicons
                      name={tieneAlerta ? "alert-circle" : "business"}
                      size={20}
                      color={tieneAlerta ? "#c0392b" : "#e67e22"}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRow}>
                      <Text style={styles.clienteText}>{grupo.cliente}</Text>
                      <View style={styles.categoryTag}>
                        <Text style={styles.categoryTagText}>{grupo.categoria}</Text>
                      </View>
                      <View style={styles.skuCountBadge}>
                        <Text style={styles.skuCountText}>
                          {grupo.productos.length} {grupo.productos.length === 1 ? 'producto' : 'productos'}
                        </Text>
                      </View>
                      {tieneAlerta && (
                        <View style={styles.stockoutBadge}>
                          <Ionicons name="warning" size={11} color="#c0392b" />
                          <Text style={styles.stockoutBadgeText}>
                            {grupo.skusEnRiesgo} SKU en riesgo
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.clientSubSummary}>
                      Historial acumulado: {grupo.totalRegistros} registros validados
                    </Text>
                  </View>
                </View>

                <View style={styles.collapseIconBox}>
                  <Ionicons
                    name={estaContraido ? "chevron-down" : "chevron-up"}
                    size={18}
                    color="#7f8c8d"
                  />
                </View>
              </TouchableOpacity>

              {/* Lista de Productos (SKUs) de este Cliente */}
              {!estaContraido && (
                <View style={styles.skuListWrapper}>
                  {grupo.productos.map((prod: any, idx: number) => {
                    const skuCritico = prod.quiebres_recientes > 2;
                    return (
                      <TouchableOpacity
                        key={`${grupo.cliente}_${prod.sku}`}
                        style={[
                          styles.skuRow,
                          idx === grupo.productos.length - 1 && { borderBottomWidth: 0 }
                        ]}
                        onPress={() => irAPredecir(grupo.cliente, prod.sku)}
                        activeOpacity={0.8}
                      >
                        <View style={styles.skuRowLeft}>
                          <View style={[styles.skuBullet, skuCritico && { backgroundColor: '#e74c3c' }]} />
                          <View>
                            <View style={styles.skuTitleLine}>
                              <Text style={styles.skuNameText}>{prod.sku}</Text>
                              {skuCritico && (
                                <View style={styles.skuMiniAlert}>
                                  <Text style={styles.skuMiniAlertText}>
                                    ⚠️ {prod.quiebres_recientes} quiebres Q4
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={styles.skuMetaText}>
                              Precio Unitario: ${Number(prod.precio_unitario).toFixed(2)} • {prod.registros} registros históricos
                            </Text>
                          </View>
                        </View>

                        <View style={styles.actionPill}>
                          <Text style={styles.actionPillText}>Predecir</Text>
                          <Ionicons name="arrow-forward" size={13} color="#fff" />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollBg: { flex: 1, backgroundColor: '#f4f6f9' },
  container: { width: '100%', maxWidth: 960, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 22, flexGrow: 1 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  subHeader: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },

  filterAlertBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fadbd8', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#e74c3c' },
  filterAlertBtnActive: { backgroundColor: '#c0392b', borderColor: '#922b21' },
  filterAlertText: { fontSize: 12, fontWeight: 'bold', color: '#c0392b' },

  topBarRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' },
  infoBox: { flex: 1, minWidth: 280, flexDirection: 'row', backgroundColor: '#e8f8f5', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#1abc9c', alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 10, fontSize: 12, color: '#16a085', lineHeight: 17, fontWeight: '600' },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#dcdde1', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, minWidth: 230 },
  searchInput: { flex: 1, fontSize: 12, color: '#2c3e50', marginLeft: 6, paddingVertical: 2 },

  listContainer: { paddingBottom: 16 },
  clientCard: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, elevation: 2, borderWidth: 1, borderColor: '#ecf0f1', overflow: 'hidden' },
  clientCardAlert: { borderColor: '#f5b7b1' },

  clientHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, backgroundColor: '#fff' },
  clientHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fcf3eb', justifyContent: 'center', alignItems: 'center', marginRight: 12 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  clienteText: { fontSize: 15, fontWeight: '800', color: '#2c3e50', textTransform: 'lowercase' },
  categoryTag: { backgroundColor: '#fcf3eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  categoryTagText: { fontSize: 10, fontWeight: 'bold', color: '#e67e22' },

  skuCountBadge: { backgroundColor: '#e8f8f5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#1abc9c' },
  skuCountText: { fontSize: 10, fontWeight: 'bold', color: '#16a085' },

  stockoutBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fadbd8', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#e74c3c' },
  stockoutBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#c0392b' },

  clientSubSummary: { fontSize: 12, color: '#7f8c8d', marginTop: 3 },
  collapseIconBox: { paddingLeft: 10 },

  skuListWrapper: { backgroundColor: '#f8f9fa', borderTopWidth: 1, borderTopColor: '#ecf0f1', paddingHorizontal: 14, paddingVertical: 4 },
  skuRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eaecee' },
  skuRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 },
  skuBullet: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#1abc9c' },
  skuTitleLine: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  skuNameText: { fontSize: 13, fontWeight: '700', color: '#2c3e50' },
  skuMiniAlert: { backgroundColor: '#fadbd8', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6 },
  skuMiniAlertText: { fontSize: 10, fontWeight: 'bold', color: '#c0392b' },
  skuMetaText: { fontSize: 11, color: '#7f8c8d', marginTop: 2 },

  actionPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#e67e22', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  actionPillText: { fontSize: 11, fontWeight: 'bold', color: '#fff' }
});