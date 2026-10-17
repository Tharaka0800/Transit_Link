import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Button from '../Button';
import {
  defaultDeparture,
  formatTicketDate,
  formatTicketTime,
  parseDeparture,
} from '../../utils/ticketUtils';
import { colors } from '../../theme';

export type JourneyDeparture = { date: string; time: string };
const pad = (value: number) => String(value).padStart(2, '0');
const dateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export default function JourneyDateTimePicker({
  value,
  onChange,
  disabled = false,
  error,
}: {
  value: JourneyDeparture;
  onChange: (value: JourneyDeparture) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const [stage, setStage] = useState<'date' | 'time' | null>(null);
  const [draft, setDraft] = useState(value);
  const timeColumns = useRef<
    Partial<Record<'hour' | 'minute', ScrollView | null>>
  >({});
  const [month, setMonth] = useState(() => new Date().getMonth());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [, setClock] = useState(0);
  useEffect(() => {
    if (!stage) return;
    const timer = setInterval(() => setClock((n) => n + 1), 15000);
    return () => clearInterval(timer);
  }, [stage]);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const last = new Date(now.getTime() + 30 * 86400000);
  const lastDay = new Date(last.getFullYear(), last.getMonth(), last.getDate());
  const firstDay = new Date(year, month, 1);
  const candidate = parseDeparture(draft.date, draft.time);
  const valid = !!candidate && candidate > now && candidate <= last;
  const display = parseDeparture(value.date, value.time);
  const open = (nextStage: 'date' | 'time') => {
    if (disabled) return;
    const initial = display ? value : defaultDeparture();
    const initialDate = parseDeparture(initial.date, initial.time)!;
    setDraft(initial);
    setMonth(initialDate.getMonth());
    setYear(initialDate.getFullYear());
    setStage(nextStage);
  };
  const moveMonth = (offset: number) => {
    const next = new Date(year, month + offset, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  };
  const previousAllowed = new Date(year, month, 0) >= today;
  const nextAllowed = new Date(year, month + 1, 1) <= lastDay;
  const cells = Array.from(
    { length: firstDay.getDay() + new Date(year, month + 1, 0).getDate() },
    (_, i) => i - firstDay.getDay() + 1
  );
  const [hour, minute] = draft.time.split(':');
  return (
    <View>
      <View style={styles.fields}>
        <TouchableOpacity
          style={styles.field}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Choose travel date"
          onPress={() => open('date')}
        >
          <Ionicons name="calendar-outline" size={22} color={colors.brand} />
          <Text style={styles.label}>Travel date</Text>
          <Text style={styles.value}>
            {display ? formatTicketDate(display.toISOString()) : 'Choose date'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.field}
          disabled={disabled}
          accessibilityRole="button"
          accessibilityLabel="Choose journey time"
          onPress={() => open('time')}
        >
          <Ionicons name="time-outline" size={22} color={colors.brand} />
          <Text style={styles.label}>Start time</Text>
          <Text style={styles.value}>
            {display ? formatTicketTime(display.toISOString()) : 'Choose time'}
          </Text>
        </TouchableOpacity>
      </View>
      {error && (
        <Text style={styles.error} accessibilityRole="alert">
          {error}
        </Text>
      )}
      <Modal
        transparent
        visible={stage !== null}
        animationType="slide"
        onRequestClose={() => setStage(null)}
      >
        <View style={styles.backdrop}>
          <SafeAreaView style={styles.sheet} edges={['bottom']}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {stage === 'date'
                  ? 'Choose your travel date'
                  : 'Choose your start time'}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Close date and time picker"
                onPress={() => setStage(null)}
                style={styles.close}
              >
                <Ionicons name="close" size={24} color={colors.gray700} />
              </TouchableOpacity>
            </View>
            <Text style={styles.subtitle}>
              Plan your journey within the next 30 days.
            </Text>
            {stage === 'date' ? (
              <>
                <View style={styles.monthRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Previous month"
                    accessibilityState={{ disabled: !previousAllowed }}
                    disabled={!previousAllowed}
                    onPress={() => moveMonth(-1)}
                    style={styles.close}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color={previousAllowed ? colors.brand : colors.gray300}
                    />
                  </TouchableOpacity>
                  <Text style={styles.month}>
                    {firstDay.toLocaleDateString('en-LK', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </Text>
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Next month"
                    accessibilityState={{ disabled: !nextAllowed }}
                    disabled={!nextAllowed}
                    onPress={() => moveMonth(1)}
                    style={styles.close}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={nextAllowed ? colors.brand : colors.gray300}
                    />
                  </TouchableOpacity>
                </View>
                <View style={styles.grid}>
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(
                    (day) => (
                      <Text key={day} style={styles.weekday}>
                        {day}
                      </Text>
                    )
                  )}
                  {cells.map((day, index) => {
                    if (day < 1)
                      return <View key={`blank-${index}`} style={styles.day} />;
                    const date = new Date(year, month, day);
                    const enabled = date >= today && date <= lastDay;
                    const selected = dateKey(date) === draft.date;
                    return (
                      <TouchableOpacity
                        key={day}
                        style={[styles.day, selected && styles.daySelected]}
                        disabled={!enabled}
                        accessibilityRole="radio"
                        accessibilityLabel={formatTicketDate(
                          date.toISOString()
                        )}
                        accessibilityState={{
                          checked: selected,
                          disabled: !enabled,
                        }}
                        onPress={() =>
                          setDraft((d) => ({ ...d, date: dateKey(date) }))
                        }
                      >
                        <Text
                          style={[
                            styles.dayText,
                            !enabled && styles.muted,
                            selected && styles.white,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Button onPress={() => setStage('time')} style={styles.action}>
                  Choose time
                </Button>
              </>
            ) : (
              <>
                <Text style={styles.summary}>
                  {candidate
                    ? formatTicketDate(candidate.toISOString())
                    : draft.date}{' '}
                  · {draft.time}
                </Text>
                <View style={styles.timeRow}>
                  {(['hour', 'minute'] as const).map((part) => (
                    <View key={part} style={styles.timeColumn}>
                      <Text style={styles.timeLabel}>
                        {part === 'hour' ? 'Hour (24-hour)' : 'Minute'}
                      </Text>
                      <ScrollView
                        ref={(column) => {
                          timeColumns.current[part] = column;
                        }}
                        style={styles.timeScroll}
                        nestedScrollEnabled
                        contentContainerStyle={styles.timeOptions}
                        onContentSizeChange={() =>
                          timeColumns.current[part]?.scrollTo({
                            y: Math.max(
                              0,
                              Number(part === 'hour' ? hour : minute) * 56 - 84
                            ),
                            animated: false,
                          })
                        }
                      >
                        {Array.from(
                          { length: part === 'hour' ? 24 : 60 },
                          (_, i) => pad(i)
                        ).map((option) => {
                          const selected =
                            option === (part === 'hour' ? hour : minute);
                          return (
                            <TouchableOpacity
                              key={option}
                              accessibilityRole="radio"
                              accessibilityLabel={`${part} ${option}`}
                              accessibilityState={{ checked: selected }}
                              style={[
                                styles.timeOption,
                                selected && styles.timeSelected,
                              ]}
                              onPress={() =>
                                setDraft((d) => ({
                                  ...d,
                                  time:
                                    part === 'hour'
                                      ? `${option}:${minute}`
                                      : `${hour}:${option}`,
                                }))
                              }
                            >
                              <Text
                                style={[
                                  styles.timeText,
                                  selected && styles.white,
                                ]}
                              >
                                {option}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ))}
                </View>
                {!valid && (
                  <Text style={styles.error} accessibilityRole="alert">
                    Choose a future time within the next 30 days.
                  </Text>
                )}
                <Button
                  disabled={!valid}
                  style={styles.action}
                  onPress={() => {
                    if (valid) {
                      onChange(draft);
                      setStage(null);
                    }
                  }}
                >
                  Set journey time
                </Button>
                <Button
                  variant="secondary"
                  style={styles.action}
                  onPress={() => setStage('date')}
                >
                  Change date
                </Button>
              </>
            )}
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
const styles = StyleSheet.create({
  fields: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  field: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.gray50,
  },
  label: { fontSize: 12, color: colors.gray500, marginTop: 10 },
  value: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.gray900,
    marginTop: 5,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(17,24,39,0.45)',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '95%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: { flex: 1, color: colors.gray900, fontSize: 21, fontWeight: '800' },
  close: { padding: 10 },
  subtitle: { color: colors.gray500, fontSize: 13, marginVertical: 12 },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  month: { fontSize: 17, fontWeight: '700', color: colors.gray900 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekday: {
    width: '14.2857%',
    textAlign: 'center',
    color: colors.gray500,
    fontSize: 11,
    paddingBottom: 12,
  },
  day: {
    width: '14.2857%',
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: colors.brand },
  dayText: { color: colors.gray900, fontSize: 15, fontWeight: '600' },
  muted: { color: colors.gray300 },
  white: { color: colors.white },
  action: { marginTop: 14 },
  summary: {
    fontSize: 18,
    color: colors.brand,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 14,
  },
  timeRow: { flexDirection: 'row', gap: 16 },
  timeColumn: { flex: 1 },
  timeLabel: {
    color: colors.gray500,
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  timeScroll: { height: 220 },
  timeOptions: { gap: 8 },
  timeOption: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timeSelected: { backgroundColor: colors.brand },
  timeText: { fontSize: 18, fontWeight: '700', color: colors.gray900 },
  error: { color: '#B91C1C', fontSize: 12, lineHeight: 19, marginBottom: 8 },
});
