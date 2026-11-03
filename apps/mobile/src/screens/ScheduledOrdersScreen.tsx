/**
 * ScheduledOrdersScreen.tsx
 * -----------------------------------------------------------------------------
 * The "calendar": the user's recurring orders and when they run. A week strip
 * at the top lights up the days that have an active order; below, each schedule
 * is a card you can pause/resume or delete. The "New schedule" form builds a
 * cron expression from a few simple choices (frequency + weekday + hour).
 */

import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  createSchedule,
  deleteSchedule,
  getSchedules,
  runSchedule,
  updateSchedule,
  type ScheduleRow,
} from "../api";
import {
  activeWeekdays,
  buildCron,
  describeCron,
  formatHour,
  WEEKDAYS,
  type Frequency,
} from "../lib/schedule";
import { colors, fonts, formatDate, formatMoney, radius, spacing } from "../theme";

interface Props {
  token: string;
  onBack: () => void;
}

// JS getDay() is 0=Sun..6=Sat; map to our Mon-first strip index.
const TODAY_CRON = new Date().getDay();

export default function ScheduledOrdersScreen({ token, onBack }: Props) {
  const [schedules, setSchedules] = useState<ScheduleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      setSchedules(await getSchedules(token));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load your schedules.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  // Which weekdays (cron numbers) have at least one ACTIVE schedule.
  const litDays = new Set<number>();
  for (const s of schedules) {
    if (s.active) for (const d of activeWeekdays(s.cron)) litDays.add(d);
  }

  async function toggle(s: ScheduleRow) {
    setBusy(s.id);
    setError(null);
    try {
      const updated = await updateSchedule(s.id, { active: !s.active }, token);
      setSchedules((list) => list.map((x) => (x.id === s.id ? updated : x)));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't update the schedule.");
    } finally {
      setBusy(null);
    }
  }

  async function remove(id: string) {
    setBusy(id);
    setError(null);
    try {
      await deleteSchedule(id, token);
      setSchedules((list) => list.filter((x) => x.id !== id));
      setConfirmDelete(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete the schedule.");
    } finally {
      setBusy(null);
    }
  }

  async function runNow(s: ScheduleRow) {
    if (running) return;
    setRunning(s.id);
    setError(null);
    setBanner(null);
    try {
      const out = await runSchedule(s.id, token);
      const ok = out.result.status === "confirmed";
      setBanner(
        ok
          ? `Ordered now — ${formatMoney(out.result.totalCents)} ✓`
          : out.result.message ?? "Couldn't place the order.",
      );
      await load(); // refresca lastRunAt
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't run the schedule.");
    } finally {
      setRunning(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel="Back" hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={styles.title}>Scheduled orders</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Week strip */}
        <View style={styles.weekStrip}>
          {WEEKDAYS.map((d) => {
            const lit = litDays.has(d.cron);
            const today = d.cron === TODAY_CRON;
            return (
              <View key={d.cron} style={styles.weekCell}>
                <Text style={[styles.weekLetter, today && styles.weekLetterToday]}>
                  {d.short[0]}
                </Text>
                <View style={[styles.weekDot, lit && styles.weekDotLit]} />
              </View>
            );
          })}
        </View>

        {banner ? (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{banner}</Text>
          </View>
        ) : null}

        {adding ? (
          <ScheduleForm
            token={token}
            onCancel={() => setAdding(false)}
            onCreated={(s) => {
              setSchedules((list) => [s, ...list]);
              setAdding(false);
            }}
          />
        ) : (
          <Pressable
            style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
            onPress={() => setAdding(true)}
            accessibilityRole="button"
            accessibilityLabel="New schedule"
          >
            <Ionicons name="add" size={20} color={colors.bg} />
            <Text style={styles.newBtnText}>New schedule</Text>
          </Pressable>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.sectionLabel}>YOUR SCHEDULES</Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
        ) : schedules.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={30} color={colors.placeholder} />
            <Text style={styles.muted}>No scheduled orders yet.</Text>
            <Text style={styles.muted}>
              Set one up — like the weekly supermarket run.
            </Text>
          </View>
        ) : (
          schedules.map((s) => (
            <View key={s.id} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cadence}>{describeCron(s.cron)}</Text>
                <View style={[styles.pill, s.active ? styles.pillOn : styles.pillOff]}>
                  <Text style={[styles.pillText, s.active ? styles.pillTextOn : styles.pillTextOff]}>
                    {s.active ? "Active" : "Paused"}
                  </Text>
                </View>
              </View>
              <Text style={styles.message}>{s.message}</Text>
              {s.budgetCents ? (
                <Text style={styles.budget}>Budget: {formatMoney(s.budgetCents)}</Text>
              ) : null}
              {s.lastRunAt ? (
                <Text style={styles.lastRun}>Last run: {formatDate(s.lastRunAt)}</Text>
              ) : null}

              {confirmDelete === s.id ? (
                <View style={styles.actions}>
                  <Text style={styles.confirmText}>Delete this schedule?</Text>
                  <Pressable onPress={() => remove(s.id)} disabled={busy === s.id} hitSlop={6}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmDelete(null)} hitSlop={6}>
                    <Text style={styles.actionText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.actions}>
                  <Pressable
                    onPress={() => runNow(s)}
                    disabled={running !== null}
                    style={styles.actionBtn}
                    hitSlop={6}
                    accessibilityLabel="Run now"
                  >
                    {running === s.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons name="flash" size={15} color={colors.primary} />
                        <Text style={styles.actionText}>Run now</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable
                    onPress={() => toggle(s)}
                    disabled={busy === s.id}
                    style={styles.actionBtn}
                    hitSlop={6}
                  >
                    {busy === s.id ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Ionicons
                          name={s.active ? "pause" : "play"}
                          size={15}
                          color={colors.primary}
                        />
                        <Text style={styles.actionText}>{s.active ? "Pause" : "Resume"}</Text>
                      </>
                    )}
                  </Pressable>
                  <Pressable onPress={() => setConfirmDelete(s.id)} style={styles.actionBtn} hitSlop={6}>
                    <Ionicons name="trash-outline" size={15} color={colors.danger} />
                    <Text style={styles.deleteText}>Delete</Text>
                  </Pressable>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </View>
  );
}

/** Inline form to create a schedule: message + frequency + weekday + hour + budget. */
function ScheduleForm({
  token,
  onCancel,
  onCreated,
}: {
  token: string;
  onCancel: () => void;
  onCreated: (s: ScheduleRow) => void;
}) {
  const [message, setMessage] = useState("");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [weekdayCron, setWeekdayCron] = useState(1); // Monday
  const [hour, setHour] = useState(9);
  const [budget, setBudget] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function save() {
    const trimmed = message.trim();
    if (!trimmed) {
      setFormError("Write what you want to order.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const budgetNum = Number.parseFloat(budget.replace(/[^0-9.]/g, ""));
      const budgetCents =
        budget.trim() && !Number.isNaN(budgetNum) && budgetNum > 0
          ? Math.round(budgetNum * 100)
          : undefined;
      const created = await createSchedule(
        { message: trimmed, cron: buildCron({ frequency, weekdayCron, hour }), budgetCents },
        token,
      );
      onCreated(created);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Couldn't create the schedule.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.form}>
      <TextInput
        style={styles.input}
        value={message}
        onChangeText={setMessage}
        placeholder="What to order, e.g. 2 big mac combo medium"
        placeholderTextColor={colors.placeholder}
        multiline
        accessibilityLabel="What to order"
      />

      <Text style={styles.formLabel}>Frequency</Text>
      <View style={styles.chipRow}>
        {(["daily", "weekly"] as Frequency[]).map((f) => (
          <Chip key={f} label={f === "daily" ? "Daily" : "Weekly"} active={frequency === f} onPress={() => setFrequency(f)} />
        ))}
      </View>

      {frequency === "weekly" ? (
        <>
          <Text style={styles.formLabel}>Day</Text>
          <View style={styles.chipRow}>
            {WEEKDAYS.map((d) => (
              <Chip
                key={d.cron}
                label={d.short}
                active={weekdayCron === d.cron}
                onPress={() => setWeekdayCron(d.cron)}
                compact
              />
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.formLabel}>Time</Text>
      <View style={styles.hourRow}>
        <Pressable
          onPress={() => setHour((h) => (h + 23) % 24)}
          style={styles.stepBtn}
          accessibilityRole="button"
          accessibilityLabel="Earlier"
          hitSlop={6}
        >
          <Ionicons name="chevron-down" size={18} color={colors.primary} />
        </Pressable>
        <Text style={styles.hourText}>{formatHour(hour)}</Text>
        <Pressable
          onPress={() => setHour((h) => (h + 1) % 24)}
          style={styles.stepBtn}
          accessibilityRole="button"
          accessibilityLabel="Later"
          hitSlop={6}
        >
          <Ionicons name="chevron-up" size={18} color={colors.primary} />
        </Pressable>
      </View>

      <Text style={styles.formLabel}>Budget (optional)</Text>
      <TextInput
        style={styles.budgetInput}
        value={budget}
        onChangeText={setBudget}
        placeholder="$ e.g. 40"
        placeholderTextColor={colors.placeholder}
        keyboardType="decimal-pad"
        accessibilityLabel="Budget"
      />

      {formError ? <Text style={styles.error}>{formError}</Text> : null}

      <View style={styles.formActions}>
        <Pressable onPress={onCancel} style={styles.cancelBtn} hitSlop={6}>
          <Text style={styles.actionText}>Cancel</Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [styles.saveBtn, saving && styles.pressed, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Save schedule"
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.bg} />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function Chip({
  label,
  active,
  onPress,
  compact,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, compact && styles.chipCompact, active && styles.chipActive]}
      accessibilityRole="button"
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: 56,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  title: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.primary },
  content: { paddingHorizontal: spacing.md, paddingBottom: spacing.xl },

  weekStrip: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  weekCell: { alignItems: "center", gap: 8, flex: 1 },
  weekLetter: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },
  weekLetterToday: { fontFamily: fonts.bodyMedium, color: colors.primary },
  weekDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "transparent" },
  weekDotLit: { backgroundColor: colors.accent },

  newBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 14,
  },
  newBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },
  pressed: { opacity: 0.85 },

  sectionLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: spacing.xl,
    marginBottom: spacing.sm,
  },

  empty: { alignItems: "center", gap: 6, paddingVertical: spacing.xl },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.textMuted, textAlign: "center" },
  error: { fontFamily: fonts.body, fontSize: 13, color: colors.danger, marginTop: spacing.sm },
  banner: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  bannerText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.bg },
  lastRun: { fontFamily: fonts.body, fontSize: 12, color: colors.placeholder, marginTop: 2 },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 4,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cadence: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.primary, flex: 1 },
  message: { fontFamily: fonts.body, fontSize: 14, color: colors.text },
  budget: { fontFamily: fonts.body, fontSize: 13, color: colors.textMuted },

  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
    flexWrap: "wrap",
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.primary },
  deleteText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.danger },
  confirmText: { fontFamily: fonts.body, fontSize: 13, color: colors.text, flex: 1 },

  pill: { borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 10 },
  pillOn: { backgroundColor: "#E4F2EA" },
  pillOff: { backgroundColor: colors.bg },
  pillText: { fontFamily: fonts.bodyMedium, fontSize: 11 },
  pillTextOn: { color: colors.success },
  pillTextOff: { color: colors.textMuted },

  // Form
  form: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 60,
  },
  formLabel: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  chipCompact: { paddingHorizontal: 12 },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontFamily: fonts.body, fontSize: 13, color: colors.primary },
  chipTextActive: { color: colors.bg, fontFamily: fonts.bodyMedium },

  hourRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stepBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  hourText: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colors.text, minWidth: 92, textAlign: "center" },

  budgetInput: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },

  formActions: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: { paddingVertical: 12, paddingHorizontal: spacing.md },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.bg },
});
