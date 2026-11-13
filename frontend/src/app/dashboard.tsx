import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Platform, Alert, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const FILTROS_Q = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Anual', value: 'Anual' },
  { label: 'Q1', value: 'Q1' },
  { label: 'Q2', value: 'Q2' },
  { label: 'Q3', value: 'Q3' },
  { label: 'Q4', value: 'Q4' }
];

export default function Dashboard() {
  const [historial, setHistorial] = useState([]);
  const [filtroQ, setFiltroQ] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [vistaActiva, setVistaActiva] = useState('ANALITICA');

  const cargarHistorial = async () => {
    try {
      const datos = await AsyncStorage.getItem('historial_smartp');
      if (datos) {
        setHistorial(JSON.parse(datos));
      } else {
        setHistorial([]);
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      cargarHistorial();
    }, [])
  );

  const limpiarHistorial = async () => {
    await AsyncStorage.removeItem('historial_smartp');
    setHistorial([]);
  };

  const generarDataDemo = async () => {
    const demoData = [
      { id: '1', cliente: 'food_service_premium', sku: 'pechuga_de_pollo', trimestre_codigo: 'Q1', trimestre: 'Q1', lote_diario: 350, stock_seguridad: 25, punto_reorden: 725, pedido: 32000, estado: 'Pendiente', hora: '10:00 AM' },
      { id: '2', cliente: 'despensa_familiar', sku: 'chorizo_de_pollo', trimestre_codigo: 'Q2', trimestre: 'Q2', lote_diario: 210, stock_seguridad: 15, punto_reorden: 435, pedido: 18000, estado: 'Aprobado', hora: '10:15 AM' },
      { id: '3', cliente: 'pollo_campestre', sku: 'chorizo_de_pollo', trimestre_codigo: 'Q3', trimestre: 'Q3', lote_diario: 250, stock_seguridad: 20, punto_reorden: 520, pedido: 22000, estado: 'Pendiente', hora: '10:30 AM' },
      { id: '4', cliente: 'mercado_central_sv', sku: 'alitas', trimestre_codigo: 'Q4', trimestre: 'Q4', lote_diario: 190, stock_seguridad: 30, punto_reorden: 410, pedido: 17500, estado: 'Pendiente', hora: '11:00 AM' },
      { id: '5', cliente: 'maxi_despensa', sku: 'chorizo_de_pollo', trimestre_codigo: 'Anual', trimestre: 'Anual', lote_diario: 450, stock_seguridad: 40, punto_reorden: 940, pedido: 41000, estado: 'Aprobado', hora: '11:15 AM' },
      { id: '6', cliente: 'distribuidora_occidente', sku: 'pollo_entero_fresco', trimestre_codigo: 'Q1', trimestre: 'Q1', lote_diario: 290, stock_seguridad: 22, punto_reorden: 602, pedido: 26000, estado: 'Pendiente', hora: '11:30 AM' },
      { id: '7', cliente: 'maxi_despensa', sku: 'jamon_de_pavo', trimestre_codigo: 'Q2', trimestre: 'Q2', lote_diario: 480, stock_seguridad: 35, punto_reorden: 995, pedido: 43000, estado: 'Aprobado', hora: '12:00 PM' },
      { id: '8', cliente: 'pollo_campero', sku: 'camperitos', trimestre_codigo: 'Q3', trimestre: 'Q3', lote_diario: 410, stock_seguridad: 45, punto_reorden: 865, pedido: 37000, estado: 'Pendiente', hora: '12:15 PM' },
      { id: '9', cliente: 'super_selectos', sku: 'muslo_de_pollo', trimestre_codigo: 'Q4', trimestre: 'Q4', lote_diario: 520, stock_seguridad: 50, punto_reorden: 1090, pedido: 47000, estado: 'Pendiente', hora: '12:30 PM' },
      { id: '10', cliente: 'walmart_sv', sku: 'salchicha_de_pollo', trimestre_codigo: 'Anual', trimestre: 'Anual', lote_diario: 470, stock_seguridad: 42, punto_reorden: 982, pedido: 42000, estado: 'Aprobado', hora: '1:00 PM' }
    ];
    await AsyncStorage.setItem('historial_smartp', JSON.stringify(demoData));
    setHistorial(demoData);
  };

  const cambiarEstadoPedido = async (id) => {
    const actualizado = historial.map((item) => {
      if (item.id === id) {
        const nuevoEstado = item.estado === 'Aprobado' ? 'Pendiente' : 'Aprobado';
        return { ...item, estado: nuevoEstado };
      }
      return item;
    });
    setHistorial(actualizado);
    await AsyncStorage.setItem('historial_smartp', JSON.stringify(actualizado));
  };

  const aprobarTodosFiltrados = async () => {
    const idsFiltrados = new Set(historialFiltrado.map(i => i.id));
    const actualizado = historial.map((item) =>
      idsFiltrados.has(item.id) ? { ...item, estado: 'Aprobado' } : item
    );
    setHistorial(actualizado);
    await AsyncStorage.setItem('historial_smartp', JSON.stringify(actualizado));
  };

  const eliminarRegistro = async (id) => {
    const actualizado = historial.filter((item) => item.id !== id);
    setHistorial(actualizado);
    await AsyncStorage.setItem('historial_smartp', JSON.stringify(actualizado));
  };

  const obtenerCodigoQ = (item) => {
    const raw = (item.trimestre_codigo || item.trimestre || 'Anual').toUpperCase();
    if (raw.startsWith('Q1')) return 'Q1';
    if (raw.startsWith('Q2')) return 'Q2';
    if (raw.startsWith('Q3')) return 'Q3';
    if (raw.startsWith('Q4')) return 'Q4';
    return 'Anual';
  };

  const historialFiltrado = historial.filter((item) => {
    const codigo = obtenerCodigoQ(item);
    const cumpleQ = filtroQ === 'TODOS' ? true : codigo === filtroQ;
    const texto = busqueda.trim().toLowerCase();
    const cumpleTexto = !texto ||
      (item.cliente || '').toLowerCase().includes(texto) ||
      (item.sku || '').toLowerCase().includes(texto);
    return cumpleQ && cumpleTexto;
  });

  // === FUNCIÓN DE EXPORTACIÓN A CSV / EXCEL ===
  const exportarOrdenesCSV = async (soloAprobadas = true) => {
    const listaExportar = soloAprobadas
      ? historialFiltrado.filter(item => item.estado === 'Aprobado')
      : historialFiltrado;

    if (listaExportar.length === 0) {
      Alert.alert(
        "Sin órdenes aprobadas",
        "Primero marca al menos un pedido como 'Aprobado' en la Bitácora o usa el botón 'Aprobar Todas' en la Tabla Consolidada."
      );
      return;
    }

    const encabezados = [
      "ID_Orden",
      "Cliente",
      "SKU_Producto",
      "Segmento_Trimestre",
      "Lote_Diario_Sugerido",
      "Stock_Seguridad_95",
      "Punto_Reorden_ROP",
      "Pedido_Total_Planta",
      "Estado_Planta",
      "Hora_Emision"
    ];

    const filas = listaExportar.map(item => [
      item.id,
      item.cliente,
      item.sku,
      obtenerCodigoQ(item),
      item.lote_diario || Math.round((Number(item.pedido) || 0) / 20),
      item.stock_seguridad || 0,
      item.punto_reorden || 0,
      item.pedido,
      item.estado || 'Pendiente',
      item.hora
    ].join(","));

    // Agregar BOM (\uFEFF) para que Microsoft Excel abra acentos y columnas directamente
    const contenidoCSV = "\uFEFF" + [encabezados.join(","), ...filas].join("\n");

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      const blob = new Blob([contenidoCSV], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ordenes_aprobadas_smartpollos_${filtroQ.toLowerCase()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      await Share.share({
        title: "Órdenes Aprobadas SmartPollos",
        message: contenidoCSV
      });
    }
  };

  // === CÁLCULO DE KPIs ===
  const totalConsultas = historialFiltrado.length;
  const sumaUnidades = historialFiltrado.reduce((acc, item) => acc + (Number(item.pedido) || 0), 0);
  const promedioUnidades = totalConsultas > 0 ? Math.round(sumaUnidades / totalConsultas) : 0;
  const registroMaximo = historialFiltrado.reduce(
    (max, item) => (Number(item.pedido) > (Number(max?.pedido) || 0) ? item : max),
    null
  );
  const totalAprobados = historialFiltrado.filter(i => i.estado === 'Aprobado').length;

  // === DATOS PARA GRÁFICO DE BARRAS TRIMESTRAL (Q1 - Q4) ===
  const datosTrimestres = ['Q1', 'Q2', 'Q3', 'Q4'].map((q) => {
    const registrosQ = historial.filter((item) => obtenerCodigoQ(item) === q);
    const totalQ = registrosQ.reduce((acc, item) => acc + (Number(item.pedido) || 0), 0);
    const promedioQ = registrosQ.length > 0 ? Math.round(totalQ / registrosQ.length) : 0;
    return { q, total: totalQ, promedio: promedioQ, consultas: registrosQ.length };
  });
  const maxValorQ = Math.max(...datosTrimestres.map((d) => d.promedio), 1);

  // === DATOS PARA DISTRIBUCIÓN POR SKU ===
  const mapaSku = {};
  historialFiltrado.forEach((item) => {
    const skuKey = item.sku || 'Desconocido';
    if (!mapaSku[skuKey]) mapaSku[skuKey] = { sku: skuKey, total: 0, consultas: 0 };
    mapaSku[skuKey].total += Number(item.pedido) || 0;
    mapaSku[skuKey].consultas += 1;
  });
  const listaSkus = Object.values(mapaSku).sort((a: any, b: any) => b.total - a.total);

  // === DATOS PARA TABLA RESUMEN POR CLIENTE + SKU ===
  const mapaClientes = {};
  historialFiltrado.forEach((item) => {
    const clave = `${item.cliente}__${item.sku}`;
    if (!mapaClientes[clave]) {
      mapaClientes[clave] = {
        cliente: item.cliente,
        sku: item.sku,
        consultas: 0,
        aprobadas: 0,
        suma: 0,
        stockSeguridad: item.stock_seguridad || 0
      };
    }
    mapaClientes[clave].consultas += 1;
    if (item.estado === 'Aprobado') mapaClientes[clave].aprobadas += 1;
    mapaClientes[clave].suma += Number(item.pedido) || 0;
  });
  const tablaConsolidada = Object.values(mapaClientes).sort((a: any, b: any) => b.suma - a.suma);

  return (
    <ScrollView style={styles.scrollBg} contentContainerStyle={styles.container}>
      {/* ENCABEZADO */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.header}>Centro de Inteligencia y Métricas</Text>
          <Text style={styles.subHeader}>Análisis de demanda, exportación ERP a Excel/CSV y bitácora de planta</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.demoButton} onPress={generarDataDemo}>
             <Ionicons name="flash-outline" size={15} color="#fff" />
             <Text style={styles.demoText}>Generar Data Demo</Text>
          </TouchableOpacity>
          {historial.length > 0 && (
            <TouchableOpacity style={styles.exportHeaderBtn} onPress={() => exportarOrdenesCSV(true)}>
              <Ionicons name="download-outline" size={15} color="#fff" />
              <Text style={styles.exportHeaderText}>Exportar Aprobadas ({totalAprobados})</Text>
            </TouchableOpacity>
          )}
          {historial.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={limpiarHistorial}>
              <Ionicons name="trash-outline" size={15} color="#c0392b" />
              <Text style={styles.clearText}>Limpiar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FILTROS POR TRIMESTRE Y BUSCADOR */}
      <View style={styles.topControlsRow}>
        <View style={styles.filterContainer}>
          {FILTROS_Q.map((f) => {
            const activo = filtroQ === f.value;
            return (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, activo && styles.filterChipActivo]}
                onPress={() => setFiltroQ(f.value)}
              >
                <Text style={[styles.filterChipText, activo && styles.filterChipTextActivo]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color="#7f8c8d" />
          <TextInput
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="Filtrar cliente o SKU..."
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

      {/* 4 TARJETAS KPI EJECUTIVAS */}
      <View style={styles.kpiGrid}>
        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <View style={styles.iconCircleGreen}>
              <Ionicons name="layers-outline" size={18} color="#16a085" />
            </View>
            <Text style={styles.kpiTag}>{filtroQ}</Text>
          </View>
          <Text style={styles.kpiValue}>{totalConsultas}</Text>
          <Text style={styles.kpiLabel}>Predicciones ({totalAprobados} aprobadas)</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <View style={styles.iconCircleOrange}>
              <Ionicons name="cube-outline" size={18} color="#e67e22" />
            </View>
            <Text style={styles.kpiTagOrange}>Volumen</Text>
          </View>
          <Text style={styles.kpiValue}>{sumaUnidades.toLocaleString()}</Text>
          <Text style={styles.kpiLabel}>Unidades Acumuladas</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <View style={styles.iconCircleGreen}>
              <Ionicons name="analytics-outline" size={18} color="#16a085" />
            </View>
            <Text style={styles.kpiTag}>Media</Text>
          </View>
          <Text style={styles.kpiValue}>{promedioUnidades.toLocaleString()}</Text>
          <Text style={styles.kpiLabel}>Promedio por Pedido</Text>
        </View>

        <View style={styles.kpiCard}>
          <View style={styles.kpiHeader}>
            <View style={styles.iconCircleOrange}>
              <Ionicons name="trending-up-outline" size={18} color="#e67e22" />
            </View>
            <Text style={styles.kpiTagOrange}>Pico Máximo</Text>
          </View>
          <Text style={styles.kpiValue}>
            {registroMaximo ? Number(registroMaximo.pedido).toLocaleString() : '0'}
          </Text>
          <Text style={styles.kpiLabel} numberOfLines={1}>
            {registroMaximo ? `${registroMaximo.cliente}` : 'Sin registros'}
          </Text>
        </View>
      </View>

      {/* CONMUTADOR DE SECCIÓN (TABS INTERNOS) */}
      <View style={styles.viewTabsRow}>
        <TouchableOpacity
          style={[styles.viewTab, vistaActiva === 'ANALITICA' && styles.viewTabActive]}
          onPress={() => setVistaActiva('ANALITICA')}
        >
          <Ionicons name="bar-chart-outline" size={16} color={vistaActiva === 'ANALITICA' ? '#16a085' : '#7f8c8d'} />
          <Text style={[styles.viewTabText, vistaActiva === 'ANALITICA' && styles.viewTabTextActive]}>
            Gráficos y Distribución
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewTab, vistaActiva === 'TABLA' && styles.viewTabActive]}
          onPress={() => setVistaActiva('TABLA')}
        >
          <Ionicons name="grid-outline" size={16} color={vistaActiva === 'TABLA' ? '#16a085' : '#7f8c8d'} />
          <Text style={[styles.viewTabText, vistaActiva === 'TABLA' && styles.viewTabTextActive]}>
            Tabla Consolidada ({tablaConsolidada.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.viewTab, vistaActiva === 'BITACORA' && styles.viewTabActive]}
          onPress={() => setVistaActiva('BITACORA')}
        >
          <Ionicons name="list-outline" size={16} color={vistaActiva === 'BITACORA' ? '#16a085' : '#7f8c8d'} />
          <Text style={[styles.viewTabText, vistaActiva === 'BITACORA' && styles.viewTabTextActive]}>
            Bitácora de Planta ({historialFiltrado.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* === VISTA 1: GRÁFICOS Y DISTRIBUCIÓN === */}
      {vistaActiva === 'ANALITICA' && (
        <View style={styles.analyticsGrid}>
          <View style={styles.panelCard}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Promedio de Demanda por Trimestre (Q1 - Q4)</Text>
              <Text style={styles.panelSubtitle}>Comparativa estacional según predicciones generadas</Text>
            </View>

            <View style={styles.barChartContainer}>
              {datosTrimestres.map((item) => {
                const alturaPorcentaje = Math.max(12, Math.round((item.promedio / maxValorQ) * 100));
                const esFiltroActual = filtroQ === item.q;
                return (
                  <View key={item.q} style={styles.barColumn}>
                    <Text style={styles.barValueText}>
                      {item.promedio > 0 ? `${item.promedio.toLocaleString()}` : '0'}
                    </Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { height: `${alturaPorcentaje}%` },
                          esFiltroActual && styles.barFillHighlighted
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, esFiltroActual && { color: '#16a085', fontWeight: 'bold' }]}>
                      {item.q}
                    </Text>
                    <Text style={styles.barSubLabel}>{item.consultas} reg.</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.panelCard}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Distribución de Volumen por Producto (SKU)</Text>
              <Text style={styles.panelSubtitle}>Participación sobre las {sumaUnidades.toLocaleString()} unds. proyectadas</Text>
            </View>

            {listaSkus.length === 0 ? (
              <Text style={styles.emptySmallText}>Genera predicciones para ver la distribución por SKU.</Text>
            ) : (
              listaSkus.map((item: any, idx) => {
                const porcentaje = sumaUnidades > 0 ? Math.round((item.total / sumaUnidades) * 100) : 0;
                return (
                  <View key={item.sku} style={styles.skuProgressRow}>
                    <View style={styles.skuProgressHeader}>
                      <Text style={styles.skuNameText}>
                        {idx + 1}. {item.sku}
                      </Text>
                      <Text style={styles.skuStatsText}>
                        {item.total.toLocaleString()} unds. ({porcentaje}%)
                      </Text>
                    </View>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${Math.max(5, porcentaje)}%` }]} />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      )}

      {/* === VISTA 2: TABLA CONSOLIDADA CON EXPORTACIÓN A CSV / EXCEL === */}
      {vistaActiva === 'TABLA' && (
        <View style={styles.panelCard}>
          <View style={styles.tableTopBar}>
            <View>
              <Text style={styles.panelTitle}>Matriz Consolidada y Despacho a Planta</Text>
              <Text style={styles.panelSubtitle}>Descarga las órdenes aprobadas en formato CSV compatible con Excel / ERP</Text>
            </View>

            <View style={styles.tableActionButtons}>
              <TouchableOpacity style={styles.approveAllBtn} onPress={aprobarTodosFiltrados}>
                <Ionicons name="checkmark-done-outline" size={15} color="#16a085" />
                <Text style={styles.approveAllText}>Aprobar Todas</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.csvExportBtn} onPress={() => exportarOrdenesCSV(true)}>
                <Ionicons name="document-text-outline" size={15} color="#fff" />
                <Text style={styles.csvExportText}>Descargar CSV / Excel ({totalAprobados})</Text>
              </TouchableOpacity>
            </View>
          </View>

          {tablaConsolidada.length === 0 ? (
            <Text style={styles.emptySmallText}>No hay datos registrados para mostrar en la tabla.</Text>
          ) : (
            <View style={styles.tableWrapper}>
              <View style={[styles.tableRow, styles.tableHeaderRow]}>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.9 }]}>Cliente</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.6 }]}>SKU Producto</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1, textAlign: 'center' }]}>Aprobadas</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.1, textAlign: 'right' }]}>Safety Stock</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 1.3, textAlign: 'right' }]}>Total Unds.</Text>
                <Text style={[styles.tableCell, styles.tableHeaderCell, { flex: 0.9, textAlign: 'right' }]}>% Share</Text>
              </View>

              {tablaConsolidada.map((row: any, index) => {
                const share = sumaUnidades > 0 ? ((row.suma / sumaUnidades) * 100).toFixed(1) : '0.0';
                return (
                  <View
                    key={`${row.cliente}_${row.sku}`}
                    style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
                  >
                    <Text style={[styles.tableCell, styles.tableCellBold, { flex: 1.9 }]} numberOfLines={1}>
                      {row.cliente}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.6, color: '#16a085', fontWeight: '600' }]} numberOfLines={1}>
                      {row.sku}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'center', fontWeight: 'bold' }]}>
                      {row.aprobadas}/{row.consultas}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1.1, textAlign: 'right', color: '#e67e22', fontWeight: '700' }]}>
                      +{row.stockSeguridad} u.
                    </Text>
                    <Text style={[styles.tableCell, styles.tableCellGreen, { flex: 1.3, textAlign: 'right' }]}>
                      {row.suma.toLocaleString()}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 0.9, textAlign: 'right', fontWeight: '700', color: '#34495e' }]}>
                      {share}%
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* === VISTA 3: BITÁCORA DETALLADA CON APROBACIÓN DE PLANTA === */}
      {vistaActiva === 'BITACORA' && (
        <View>
          {historialFiltrado.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="folder-open-outline" size={36} color="#bdc3c7" />
              <Text style={styles.emptyText}>
                No hay predicciones guardadas para el filtro "{filtroQ}".
              </Text>
            </View>
          ) : (
            historialFiltrado.map((item) => {
              const aprobado = item.estado === 'Aprobado';
              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardLeft}>
                    <View style={aprobado ? styles.iconCircleGreen : styles.iconCircleOrange}>
                      <Ionicons
                        name={aprobado ? "checkmark-done" : "analytics"}
                        size={18}
                        color={aprobado ? "#16a085" : "#e67e22"}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.clienteText}>{item.cliente}</Text>
                      <Text style={styles.skuText}>SKU: {item.sku}</Text>
                      <View style={styles.metaRow}>
                        <View style={styles.qBadge}>
                          <Text style={styles.qBadgeText}>
                            {obtenerCodigoQ(item)}
                          </Text>
                        </View>
                        <Text style={styles.horaText}>{item.hora}</Text>
                        {item.stock_seguridad > 0 && (
                          <Text style={styles.horaText}>• Safety Stock: +{item.stock_seguridad} u.</Text>
                        )}
                        {item.punto_reorden > 0 && (
                          <Text style={styles.horaText}>• ROP: {item.punto_reorden} u.</Text>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardRight}>
                    <Text style={styles.pedidoNumber}>
                      {Number(item.pedido).toLocaleString()}
                    </Text>
                    <Text style={styles.pedidoUnit}>unds.</Text>

                    <View style={styles.cardActions}>
                      <TouchableOpacity
                        style={[styles.statusActionBtn, aprobado ? styles.statusApproved : styles.statusPending]}
                        onPress={() => cambiarEstadoPedido(item.id)}
                      >
                        <Ionicons
                          name={aprobado ? "checkmark-circle" : "time-outline"}
                          size={13}
                          color={aprobado ? "#16a085" : "#e67e22"}
                        />
                        <Text style={[styles.statusActionText, aprobado ? { color: '#16a085' } : { color: '#e67e22' }]}>
                          {aprobado ? 'Aprobado' : 'Aprobar'}
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.deleteItemBtn}
                        onPress={() => eliminarRegistro(item.id)}
                      >
                        <Ionicons name="close-outline" size={16} color="#95a5a6" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollBg: { flex: 1, backgroundColor: '#f4f6f9' },
  container: { width: '100%', maxWidth: 960, alignSelf: 'center', paddingHorizontal: 24, paddingVertical: 20, flexGrow: 1 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 },
  header: { fontSize: 24, fontWeight: 'bold', color: '#2c3e50' },
  subHeader: { fontSize: 13, color: '#7f8c8d', marginTop: 2 },

  demoButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3498db', paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20 },
  demoText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },

  exportHeaderBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#16a085', paddingVertical: 7, paddingHorizontal: 13, borderRadius: 20 },
  exportHeaderText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },

  clearButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fadbd8', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#e74c3c' },
  clearText: { color: '#c0392b', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },

  topControlsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  filterContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 13, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#dcdde1' },
  filterChipActivo: { backgroundColor: '#e8f8f5', borderColor: '#1abc9c' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#7f8c8d' },
  filterChipTextActivo: { color: '#16a085', fontWeight: 'bold' },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#dcdde1', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, minWidth: 210 },
  searchInput: { flex: 1, fontSize: 12, color: '#2c3e50', marginLeft: 6, paddingVertical: 2 },

  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  kpiCard: { flex: 1, minWidth: 190, backgroundColor: '#fff', padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#ecf0f1', elevation: 2 },
  kpiHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  kpiTag: { fontSize: 10, fontWeight: 'bold', color: '#16a085', backgroundColor: '#e8f8f5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  kpiTagOrange: { fontSize: 10, fontWeight: 'bold', color: '#e67e22', backgroundColor: '#fcf3eb', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  kpiValue: { fontSize: 22, fontWeight: '900', color: '#2c3e50' },
  kpiLabel: { fontSize: 11, color: '#7f8c8d', fontWeight: '600', marginTop: 2 },

  iconCircleGreen: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#e8f8f5', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  iconCircleOrange: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fcf3eb', justifyContent: 'center', alignItems: 'center', marginRight: 10 },

  viewTabsRow: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 10, padding: 4, marginBottom: 16, borderWidth: 1, borderColor: '#ecf0f1', gap: 6 },
  viewTab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 9, borderRadius: 8, gap: 6 },
  viewTabActive: { backgroundColor: '#e8f8f5', borderWidth: 1, borderColor: '#1abc9c' },
  viewTabText: { fontSize: 12, fontWeight: '600', color: '#7f8c8d' },
  viewTabTextActive: { color: '#16a085', fontWeight: 'bold' },

  analyticsGrid: { gap: 14 },
  panelCard: { backgroundColor: '#fff', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#ecf0f1', elevation: 2, marginBottom: 12 },
  panelHeader: { marginBottom: 14 },
  panelTitle: { fontSize: 15, fontWeight: 'bold', color: '#2c3e50' },
  panelSubtitle: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },

  tableTopBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  tableActionButtons: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  approveAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e8f8f5', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#1abc9c' },
  approveAllText: { fontSize: 12, fontWeight: 'bold', color: '#16a085' },
  csvExportBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#e67e22', paddingVertical: 8, paddingHorizontal: 13, borderRadius: 8 },
  csvExportText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },

  barChartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 170, paddingTop: 20, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' },
  barColumn: { alignItems: 'center', flex: 1 },
  barValueText: { fontSize: 11, fontWeight: 'bold', color: '#2c3e50', marginBottom: 6 },
  barTrack: { width: 38, height: 105, backgroundColor: '#f4f6f9', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', backgroundColor: '#1abc9c', borderRadius: 8 },
  barFillHighlighted: { backgroundColor: '#e67e22' },
  barLabel: { fontSize: 12, fontWeight: '600', color: '#34495e', marginTop: 6 },
  barSubLabel: { fontSize: 10, color: '#95a5a6', marginBottom: 4 },

  skuProgressRow: { marginBottom: 12 },
  skuProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  skuNameText: { fontSize: 13, fontWeight: '700', color: '#2c3e50' },
  skuStatsText: { fontSize: 12, fontWeight: '600', color: '#16a085' },
  progressTrack: { height: 9, backgroundColor: '#f4f6f9', borderRadius: 5, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#e67e22', borderRadius: 5 },

  tableWrapper: { borderWidth: 1, borderColor: '#ecf0f1', borderRadius: 8, overflow: 'hidden' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#ecf0f1' },
  tableHeaderRow: { backgroundColor: '#f8f9fa' },
  tableRowAlt: { backgroundColor: '#fcfcfc' },
  tableCell: { fontSize: 12, color: '#34495e', paddingHorizontal: 4 },
  tableHeaderCell: { fontWeight: 'bold', color: '#2c3e50', fontSize: 11, textTransform: 'uppercase' },
  tableCellBold: { fontWeight: 'bold', color: '#2c3e50' },
  tableCellGreen: { fontWeight: '900', color: '#27ae60' },

  emptyBox: { backgroundColor: '#fff', padding: 30, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#ecf0f1', borderStyle: 'dashed' },
  emptyText: { color: '#95a5a6', fontSize: 13, marginTop: 8, textAlign: 'center' },
  emptySmallText: { color: '#95a5a6', fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingVertical: 14 },

  card: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#ecf0f1', elevation: 2 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  clienteText: { fontSize: 14, fontWeight: 'bold', color: '#2c3e50' },
  skuText: { fontSize: 12, color: '#7f8c8d', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8, flexWrap: 'wrap' },
  qBadge: { backgroundColor: '#e8f8f5', paddingVertical: 2, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#1abc9c' },
  qBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#16a085' },
  horaText: { fontSize: 11, color: '#95a5a6' },

  cardRight: { alignItems: 'flex-end', marginLeft: 12 },
  pedidoNumber: { fontSize: 20, fontWeight: '900', color: '#27ae60' },
  pedidoUnit: { fontSize: 10, color: '#16a085', fontWeight: 'bold' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  statusActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 9, borderRadius: 12, borderWidth: 1 },
  statusPending: { backgroundColor: '#fcf3eb', borderColor: '#e67e22' },
  statusApproved: { backgroundColor: '#e8f8f5', borderColor: '#1abc9c' },
  statusActionText: { fontSize: 11, fontWeight: 'bold' },
  deleteItemBtn: { padding: 4 }
});