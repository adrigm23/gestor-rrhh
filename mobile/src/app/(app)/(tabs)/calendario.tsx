import type { CreateSolicitudRequest, SolicitudDto } from '@gestor-rrhh/shared';
import { Redirect } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import { Card } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { StatusBadge } from '@/components/ui/status-badge';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Radius, SoraFonts, Spacing, glowShadow, type ThemeColor } from '@/constants/theme';
import { useCalendario } from '@/hooks/use-calendario';
import { useCreateSolicitud } from '@/hooks/use-create-solicitud';
import { formatElapsed, useElapsedMs } from '@/hooks/use-elapsed-time';
import { useFichajeHistorial } from '@/hooks/use-fichaje-historial';
import { useFichajeStatus } from '@/hooks/use-fichaje-status';
import { useSolicitudes } from '@/hooks/use-solicitudes';
import { useTheme } from '@/hooks/use-theme';
import { useAuthStore } from '@/store/auth-store';

type Feedback = { type: 'success' | 'error'; message: string };
type SolTab = 'VACACIONES' | 'AUSENCIA';
type DayEventType = 'fichaje' | 'vacaciones' | 'ausencia';
type DayEvent = { type: DayEventType; label: string; time?: string };

const weekDays = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const estadoLabel: Record<SolicitudDto['estado'], string> = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  ANULADA: 'Anulada',
};

const estadoColors: Record<SolicitudDto['estado'], { bg: ThemeColor; border: ThemeColor; text: ThemeColor }> = {
  PENDIENTE: { bg: 'warningBg', border: 'warningBorder', text: 'warningBadgeText' },
  APROBADA: { bg: 'successBg', border: 'successBorder', text: 'successText' },
  RECHAZADA: { bg: 'errorBg', border: 'errorBorder', text: 'errorText' },
  ANULADA: { bg: 'neutralIconBg', border: 'cardBorder', text: 'textMuted' },
};

function buildDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDateInput(date: Date): string {
  return buildDateKey(date);
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function buildCalendarCells(base: Date): { year: number; month: number; cells: (Date | null)[] } {
  const year = base.getFullYear();
  const month = base.getMonth();
  const first = new Date(year, month, 1);
  const totalDays = new Date(year, month + 1, 0).getDate();
  const startOffset = (first.getDay() + 6) % 7;
  const cells: (Date | null)[] = Array.from({ length: startOffset }, () => null);
  for (let day = 1; day <= totalDays; day += 1) cells.push(new Date(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  return { year, month, cells };
}

function addRangeToSet(set: Set<string>, start: Date, end: Date) {
  const cursor = new Date(start);
  while (cursor <= end) {
    set.add(buildDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatRange(inicio: string, fin: string | null): string {
  const formatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' });
  const start = formatter.format(new Date(inicio));
  const end = fin ? formatter.format(new Date(fin)) : start;
  return start === end ? start : `${start} - ${end}`;
}

function tipoLabel(item: SolicitudDto): string {
  if (item.tipo === 'VACACIONES') return 'Vacaciones';
  return item.ausenciaTipo === 'FALTA' ? 'Falta' : 'Aviso';
}

// Mismo rango fijo que dashboard/calendario en la web (3 meses atrás, 4
// adelante desde hoy): se pide una sola vez y cubre toda la navegación por
// meses sin volver a pedir datos.
function fixedRange(): { desde: string; hasta: string } {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() - 3, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 4, 0);
  return { desde: toDateInput(start), hasta: toDateInput(end) };
}

export default function CalendarioScreen() {
  const theme = useTheme();
  const role = useAuthStore((state) => state.user?.role);
  const range = useMemo(fixedRange, []);
  const calendario = useCalendario(range.desde, range.hasta);
  const status = useFichajeStatus();
  const historial = useFichajeHistorial();
  const solicitudes = useSolicitudes();
  const createSolicitud = useCreateSolicitud();

  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [rangeStart, setRangeStart] = useState<Date | null>(null);
  const [rangeEnd, setRangeEnd] = useState<Date | null>(null);

  const [tab, setTab] = useState<SolTab>('VACACIONES');
  const [ausenciaTipo, setAusenciaTipo] = useState<'FALTA' | 'AVISO'>('FALTA');
  const [ausenciaInicio, setAusenciaInicio] = useState('');
  const [ausenciaFin, setAusenciaFin] = useState('');
  const [motivo, setMotivo] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const elapsedMs = useElapsedMs(
    status.data?.shift?.entrada ?? null,
    status.data?.pause?.entrada ?? null,
    status.data?.pauseAccumulatedMs ?? 0,
  );
  const jornadaActiva = Boolean(status.data?.shift);
  const pausaActiva = Boolean(status.data?.pause);
  const turnoBadge = jornadaActiva && pausaActiva ? 'En pausa' : jornadaActiva ? 'En curso' : 'Sin turno';

  const { cells, month, year } = useMemo(() => buildCalendarCells(viewDate), [viewDate]);
  const monthTitle = useMemo(() => {
    const name = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(year, month, 1));
    return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
  }, [month, year]);

  const solicitudesData = calendario.data?.solicitudes ?? [];
  const fichajesData = calendario.data?.fichajes ?? [];

  const fichajeDays = useMemo(() => {
    const set = new Set<string>();
    fichajesData.forEach((item) => set.add(buildDateKey(new Date(item.entrada))));
    return set;
  }, [fichajesData]);

  const fichajeRanges = useMemo(() => {
    const map = new Map<string, { start: Date; end: Date }>();
    fichajesData.forEach((item) => {
      const entrada = new Date(item.entrada);
      const salida = item.salida ? new Date(item.salida) : entrada;
      const key = buildDateKey(entrada);
      const current = map.get(key);
      if (!current) {
        map.set(key, { start: entrada, end: salida });
        return;
      }
      if (entrada < current.start) current.start = entrada;
      if (salida > current.end) current.end = salida;
    });
    return map;
  }, [fichajesData]);

  const { vacacionesDays, ausenciaDays } = useMemo(() => {
    const vacaciones = new Set<string>();
    const ausencias = new Set<string>();
    solicitudesData.forEach((item) => {
      if (item.estado !== 'APROBADA') return;
      const inicio = new Date(item.inicio);
      const fin = item.fin ? new Date(item.fin) : inicio;
      if (item.tipo === 'VACACIONES') addRangeToSet(vacaciones, inicio, fin);
      else addRangeToSet(ausencias, inicio, fin);
    });
    return { vacacionesDays: vacaciones, ausenciaDays: ausencias };
  }, [solicitudesData]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, DayEvent[]>();
    const addEvent = (key: string, event: DayEvent) => {
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    };
    fichajeRanges.forEach((range, key) => {
      const startLabel = formatTime(range.start);
      const endLabel = formatTime(range.end);
      const time = startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
      addEvent(key, { type: 'fichaje', label: 'Fichaje', time });
    });
    solicitudesData.forEach((item) => {
      if (item.estado !== 'APROBADA') return;
      const inicio = new Date(item.inicio);
      const fin = item.fin ? new Date(item.fin) : inicio;
      const label = item.tipo === 'VACACIONES' ? 'Vacaciones' : item.ausenciaTipo === 'FALTA' ? 'Falta' : 'Aviso';
      const type: DayEventType = item.tipo === 'VACACIONES' ? 'vacaciones' : 'ausencia';
      const cursor = new Date(inicio);
      while (cursor <= fin) {
        addEvent(buildDateKey(cursor), { type, label });
        cursor.setDate(cursor.getDate() + 1);
      }
    });
    return map;
  }, [fichajeRanges, solicitudesData]);

  const todayKey = buildDateKey(new Date());
  const selectedKey = buildDateKey(selectedDate);
  const selectedEvents = eventsByDay.get(selectedKey) ?? [];
  const selectedLabel = useMemo(
    () => new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(selectedDate),
    [selectedDate],
  );

  // Vacaciones en morado y fichaje en teal (antes al revés) — así el punto
  // de "trabajo normal" usa el mismo color que el resto de acciones
  // primarias de la app, y "vacaciones" pasa a tener su propio tono en vez
  // de compartir el teal (Fase 2.18b).
  const dotColor: Record<DayEventType, string> = {
    fichaje: theme.primary,
    vacaciones: theme.accentViolet,
    ausencia: theme.accentSky,
  };
  const legendItems: { type: DayEventType; label: string }[] = [
    { type: 'fichaje', label: 'Fichaje' },
    { type: 'vacaciones', label: 'Vacaciones' },
    { type: 'ausencia', label: 'Ausencia' },
  ];

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    if (tab !== 'VACACIONES') return;
    if (!rangeStart || (rangeStart && rangeEnd)) {
      setRangeStart(date);
      setRangeEnd(null);
      return;
    }
    if (date.getTime() < rangeStart.getTime()) {
      setRangeEnd(rangeStart);
      setRangeStart(date);
    } else {
      setRangeEnd(date);
    }
  };

  const isInRange = (date: Date): boolean => {
    if (!rangeStart) return false;
    if (!rangeEnd) return sameDay(date, rangeStart);
    return date.getTime() >= rangeStart.getTime() && date.getTime() <= rangeEnd.getTime();
  };

  const vacacionesCount = solicitudesData.filter((s) => s.tipo === 'VACACIONES').length;
  const ausenciasCount = solicitudesData.filter((s) => s.tipo === 'AUSENCIA').length;
  const pendientesCount = solicitudesData.filter((s) => s.estado === 'PENDIENTE').length;

  const canSubmit =
    tab === 'VACACIONES' ? Boolean(rangeStart) && !createSolicitud.isPending : ausenciaInicio.length > 0 && !createSolicitud.isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setFeedback(null);

    const payload: CreateSolicitudRequest =
      tab === 'VACACIONES'
        ? {
            tipo: 'VACACIONES',
            inicio: toDateInput(rangeStart as Date),
            fin: rangeEnd ? toDateInput(rangeEnd) : undefined,
            motivo: motivo || undefined,
          }
        : {
            tipo: 'AUSENCIA',
            inicio: ausenciaInicio,
            fin: ausenciaFin || undefined,
            motivo: motivo || undefined,
            ausenciaTipo,
          };

    createSolicitud.mutate(payload, {
      onSuccess: (result) => {
        if (result.outcome === 'ok') {
          setFeedback({ type: 'success', message: 'Solicitud enviada.' });
          setMotivo('');
          if (tab === 'VACACIONES') {
            setRangeStart(null);
            setRangeEnd(null);
          } else {
            setAusenciaInicio('');
            setAusenciaFin('');
          }
        } else if (result.outcome === 'overlap') {
          setFeedback({
            type: 'error',
            message: 'Ya tienes una solicitud pendiente o aprobada que se solapa con esas fechas.',
          });
        } else {
          setFeedback({ type: 'error', message: result.message });
        }
      },
      onError: () => setFeedback({ type: 'error', message: 'No se pudo enviar la solicitud. Inténtalo de nuevo.' }),
    });
  };

  // Igual que sidebar.tsx en la web: "Calendario" solo existe para
  // EMPLEADO/GERENTE (ADMIN_SISTEMA no ficha ni pide vacaciones). El tab
  // ya se oculta condicionalmente en app-tabs.tsx, esto es solo defensa
  // por si se llega por URL directa.
  if (role !== 'EMPLEADO' && role !== 'GERENTE') {
    return <Redirect href="/" />;
  }

  return (
    <ThemedView style={styles.screen}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <ThemedText type="heading">Calendario</ThemedText>

          <Card style={styles.card}>
            <View style={styles.monthHeader}>
              <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))} hitSlop={8}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  ‹
                </ThemedText>
              </Pressable>
              <View style={styles.monthTitleGroup}>
                <ThemedText type="smallBold">{monthTitle}</ThemedText>
                <Pressable onPress={() => setViewDate(new Date())}>
                  <ThemedText type="small" style={{ color: theme.primary }}>
                    Ir a hoy
                  </ThemedText>
                </Pressable>
              </View>
              <Pressable onPress={() => setViewDate(new Date(year, month + 1, 1))} hitSlop={8}>
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  ›
                </ThemedText>
              </Pressable>
            </View>

            <View style={styles.weekRow}>
              {weekDays.map((day, index) => (
                <ThemedText
                  key={day}
                  type="small"
                  style={[styles.weekDay, { color: index >= 5 ? theme.accentSky : theme.textMuted }]}>
                  {day}
                </ThemedText>
              ))}
            </View>

            <View style={styles.grid}>
              {cells.map((date, index) => {
                if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const dateKey = buildDateKey(date);
                const markers: DayEventType[] = [];
                if (fichajeDays.has(dateKey)) markers.push('fichaje');
                if (vacacionesDays.has(dateKey)) markers.push('vacaciones');
                if (ausenciaDays.has(dateKey)) markers.push('ausencia');
                const selected = tab === 'VACACIONES' ? isInRange(date) : sameDay(date, selectedDate);
                const isToday = dateKey === todayKey;
                return (
                  <Pressable
                    key={date.toISOString()}
                    onPress={() => handleDayPress(date)}
                    style={[
                      styles.dayCell,
                      styles.dayButton,
                      selected && { backgroundColor: theme.primary },
                      !selected && isToday && { borderWidth: 1, borderColor: theme.primary },
                    ]}>
                    <ThemedText
                      type="small"
                      style={{ color: selected ? '#ffffff' : theme.text, fontFamily: SoraFonts.semiBold }}>
                      {date.getDate()}
                    </ThemedText>
                    {markers.length > 0 && (
                      <View style={styles.markerRow}>
                        {markers.map((marker) => (
                          <View
                            key={marker}
                            style={[styles.marker, { backgroundColor: selected ? '#ffffff' : dotColor[marker] }]}
                          />
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.legendRow}>
              {legendItems.map((item) => (
                <View key={item.type} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: dotColor[item.type] }]} />
                  <ThemedText type="small" themeColor="textMuted">
                    {item.label}
                  </ThemedText>
                </View>
              ))}
            </View>
          </Card>

          <Card style={styles.card}>
            <ThemedText type="default" style={styles.cardTitle}>
              Eventos de {selectedLabel}
            </ThemedText>
            {selectedEvents.length === 0 ? (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No hay eventos registrados para esta fecha.
              </ThemedText>
            ) : (
              selectedEvents.map((event, index) => (
                <View key={`${selectedKey}-${event.type}-${index}`} style={[styles.eventRow, { borderColor: theme.cardBorder }]}>
                  <View style={[styles.eventDot, { backgroundColor: dotColor[event.type] }]} />
                  <View style={styles.eventInfo}>
                    <ThemedText type="smallBold">{event.type === 'fichaje' ? 'Fichaje' : event.label}</ThemedText>
                    <ThemedText type="small" themeColor="textMuted">
                      {event.time ?? 'Sin hora'}
                    </ThemedText>
                  </View>
                </View>
              ))
            )}
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="small" themeColor="textMuted">
                Turno actual
              </ThemedText>
              <StatusBadge
                label={turnoBadge}
                bg={jornadaActiva ? theme.successBg : theme.neutralIconBg}
                text={jornadaActiva ? theme.successText : theme.textMuted}
              />
            </View>
            <ThemedText type="heading" style={styles.timerText}>
              {formatElapsed(elapsedMs)}
            </ThemedText>
            <ThemedText type="small" themeColor="textMuted">
              Horas trabajadas hoy
            </ThemedText>
          </Card>

          <Card style={styles.card}>
            <ThemedText type="heading">Nueva solicitud</ThemedText>
            <ThemedText type="small" themeColor="textMuted" style={styles.cardSubtitle}>
              Vacaciones y ausencias en un mismo panel.
            </ThemedText>

            <SegmentedControl
              options={[
                { value: 'VACACIONES', label: 'Vacaciones' },
                { value: 'AUSENCIA', label: 'Ausencia' },
              ]}
              value={tab}
              onChange={setTab}
            />

            {tab === 'VACACIONES' ? (
              <View style={[styles.rangeSummary, { borderColor: theme.cardBorder, backgroundColor: theme.background }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  {rangeStart
                    ? `Rango seleccionado: ${toDateInput(rangeStart)}${rangeEnd ? ` hasta ${toDateInput(rangeEnd)}` : ''}`
                    : 'Toca días en el calendario para elegir el rango.'}
                </ThemedText>
              </View>
            ) : (
              <>
                <View style={styles.field}>
                  <ThemedText type="small" themeColor="textSecondary">
                    Tipo de ausencia
                  </ThemedText>
                  <SegmentedControl
                    options={[
                      { value: 'FALTA', label: 'He faltado' },
                      { value: 'AVISO', label: 'Voy a faltar' },
                    ]}
                    value={ausenciaTipo}
                    onChange={setAusenciaTipo}
                  />
                </View>
                <View style={styles.dateRow}>
                  <View style={styles.dateField}>
                    <DateField label="Desde" value={ausenciaInicio} onChange={setAusenciaInicio} />
                  </View>
                  <View style={styles.dateField}>
                    <DateField label="Hasta (opcional)" value={ausenciaFin} onChange={setAusenciaFin} />
                  </View>
                </View>
              </>
            )}

            <View style={styles.field}>
              <ThemedText type="small" themeColor="textSecondary">
                Motivo (opcional)
              </ThemedText>
              <TextInput
                value={motivo}
                onChangeText={setMotivo}
                placeholder="Comentario opcional"
                placeholderTextColor={theme.textMuted}
                multiline
                numberOfLines={3}
                style={[
                  styles.textArea,
                  { color: theme.text, borderColor: theme.cardBorder, backgroundColor: theme.backgroundElement },
                ]}
              />
            </View>

            {feedback && (
              <View
                style={[
                  styles.feedbackBanner,
                  {
                    backgroundColor: feedback.type === 'success' ? theme.successBg : theme.errorBg,
                    borderColor: feedback.type === 'success' ? theme.successBorder : theme.errorBorder,
                  },
                ]}>
                <ThemedText type="small" style={{ color: feedback.type === 'success' ? theme.successText : theme.errorText }}>
                  {feedback.message}
                </ThemedText>
              </View>
            )}

            <Pressable
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.submitButton,
                glowShadow(theme.primary),
                { backgroundColor: pressed || createSolicitud.isPending ? theme.primaryPressed : theme.primary, opacity: canSubmit ? 1 : 0.5 },
              ]}>
              <ThemedText style={styles.submitButtonText}>
                {createSolicitud.isPending ? 'Enviando...' : 'Enviar solicitud'}
              </ThemedText>
            </Pressable>
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="default" style={styles.cardTitle}>
                Solicitudes recientes
              </ThemedText>
            </View>
            <View style={styles.countsRow}>
              <ThemedText type="small" themeColor="textMuted">
                Vacaciones: {vacacionesCount}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                Ausencias: {ausenciasCount}
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                Pendientes: {pendientesCount}
              </ThemedText>
            </View>
            {(solicitudes.data?.solicitudes.length ?? 0) === 0 ? (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No hay solicitudes registradas.
              </ThemedText>
            ) : (
              solicitudes.data?.solicitudes.map((item) => {
                const colors = estadoColors[item.estado];
                return (
                  <View key={item.id} style={[styles.solicitudRow, { borderColor: theme.cardBorder }]}>
                    <View style={styles.solicitudInfo}>
                      <ThemedText type="smallBold">{tipoLabel(item)}</ThemedText>
                      <ThemedText type="small" themeColor="textMuted">
                        {formatRange(item.inicio, item.fin)}
                      </ThemedText>
                    </View>
                    <StatusBadge label={estadoLabel[item.estado]} bg={theme[colors.bg]} text={theme[colors.text]} />
                  </View>
                );
              })
            )}
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="default" style={styles.cardTitle}>
                Histórico de fichajes
              </ThemedText>
              <ThemedText type="small" themeColor="textMuted">
                {historial.data?.historial.length ?? 0} registros
              </ThemedText>
            </View>
            {(historial.data?.historial.length ?? 0) === 0 ? (
              <ThemedText type="small" themeColor="textMuted" style={styles.emptyText}>
                No hay fichajes recientes.
              </ThemedText>
            ) : (
              historial.data?.historial.slice(0, 10).map((item) => {
                const entrada = new Date(item.entrada);
                const salida = item.salida ? new Date(item.salida) : null;
                return (
                  <View key={item.id} style={[styles.historialRow, { borderColor: theme.cardBorder }]}>
                    <ThemedText type="small" themeColor="textMuted">
                      {entrada.toLocaleDateString('es-ES')}
                    </ThemedText>
                    <ThemedText type="small">
                      {formatTime(entrada)}
                      {salida ? ` – ${formatTime(salida)}` : ' – en curso'}
                    </ThemedText>
                  </View>
                );
              })
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  card: {
    gap: Spacing.two,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontFamily: SoraFonts.semiBold,
  },
  cardSubtitle: {
    marginTop: -Spacing.two,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  monthTitleGroup: {
    alignItems: 'center',
    gap: 2,
  },
  weekRow: {
    flexDirection: 'row',
    marginTop: Spacing.two,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontFamily: SoraFonts.semiBold,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.two,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  dayButton: {
    borderRadius: Radius.input,
  },
  markerRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  marker: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
    marginTop: Spacing.three,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: Spacing.three,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  eventDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eventInfo: {
    gap: 2,
  },
  timerText: {
    fontSize: 34,
  },
  rangeSummary: {
    borderWidth: 1,
    borderRadius: Radius.input,
    padding: Spacing.three,
  },
  field: {
    gap: Spacing.half,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  dateField: {
    flex: 1,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: SoraFonts.regular,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  feedbackBanner: {
    borderWidth: 1,
    borderRadius: Radius.input,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  submitButton: {
    borderRadius: Radius.input,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontFamily: SoraFonts.semiBold,
  },
  countsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.three,
  },
  solicitudRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
  solicitudInfo: {
    flex: 1,
    gap: 2,
  },
  historialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: Spacing.two,
  },
});
