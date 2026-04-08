import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarDays,
  Footprints,
  Moon,
  RotateCcw,
  Scale,
  Trophy,
} from "lucide-react";

const STORAGE_KEY = "karada_nikki_records_v1";

const DINNER_OPTIONS = [
  { value: "normal", label: "ふつう" },
  { value: "half", label: "半分" },
  { value: "none", label: "なし" },
];

const DINNER_TIME_OPTIONS = ["18時ごろ", "19時ごろ", "20時以降"];

const STAGES = [
  { emoji: "🥚", label: "たまご", message: "まずは今日の記録をひとつ残してみましょう。" },
  { emoji: "🐣", label: "ひよこ誕生", message: "いいスタートです。この調子で続けましょう。" },
  { emoji: "🐥", label: "すくすく成長", message: "かなり順調です。あとひとつで満点です。" },
  { emoji: "🐓", label: "にわとり達成", message: "今日はばっちり。しっかり積み上がっています。" },
];

function formatDate(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function toShortDate(date) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function getTodayRecord(records) {
  const today = formatDate(new Date());
  return records.find((record) => record.date === today) ?? null;
}

function getProgress(record) {
  if (!record) return 0;

  let score = 0;
  if (typeof record.weight === "number") score += 1;
  if (record.walkDone) score += 1;
  if (record.dinner === "half" || record.dinner === "none") score += 1;
  return score;
}

function getStage(score) {
  return STAGES[Math.min(Math.max(score, 0), 3)];
}

function calculateStreak(records) {
  const recordMap = new Map(records.map((record) => [record.date, record]));
  const today = new Date();
  let streak = 0;

  for (let offset = 0; offset < 365; offset += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - offset);
    const key = formatDate(date);
    const record = recordMap.get(key);

    if (record && getProgress(record) === 3) {
      streak += 1;
    } else {
      break;
    }
  }

  return streak;
}

function movingAverage(data, windowSize = 7) {
  return data.map((item, index) => {
    const slice = data.slice(Math.max(0, index - windowSize + 1), index + 1);
    const weights = slice.filter((entry) => typeof entry.weight === "number");
    const average = weights.length
      ? Number((weights.reduce((sum, entry) => sum + entry.weight, 0) / weights.length).toFixed(1))
      : null;

    return { ...item, average };
  });
}

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-[32px] border border-amber-100 bg-white/90 shadow-[0_24px_80px_rgba(148,120,72,0.12)] ${className}`}
    >
      {children}
    </section>
  );
}

function CardHeader({ title, description }) {
  return (
    <div className="px-6 pt-6 md:px-7">
      <h2 className="text-xl font-semibold text-stone-900">{title}</h2>
      {description ? <p className="mt-1 text-sm leading-6 text-stone-500">{description}</p> : null}
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtext }) {
  return (
    <div className="rounded-[28px] border border-amber-100 bg-amber-50/70 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-stone-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-stone-900">{value}</p>
          <p className="mt-1 text-xs text-stone-500">{subtext}</p>
        </div>
        <div className="rounded-2xl bg-white p-3 shadow-sm">
          <Icon className="h-5 w-5 text-amber-700" />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
        active ? "bg-stone-900 text-white shadow-sm" : "bg-white text-stone-600 hover:bg-amber-50"
      }`}
    >
      {children}
    </button>
  );
}

export default function App() {
  const [records, setRecords] = useState([]);
  const [weightInput, setWeightInput] = useState("");
  const [walkDone, setWalkDone] = useState(false);
  const [dinner, setDinner] = useState("normal");
  const [dinnerTime, setDinnerTime] = useState("19時ごろ");
  const [activeTab, setActiveTab] = useState("today");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setRecords(parsed);
      }
    } catch (error) {
      console.error("Failed to load records", error);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  useEffect(() => {
    const todayRecord = getTodayRecord(records);

    if (!todayRecord) {
      setWeightInput("");
      setWalkDone(false);
      setDinner("normal");
      setDinnerTime("19時ごろ");
      return;
    }

    setWeightInput(typeof todayRecord.weight === "number" ? String(todayRecord.weight) : "");
    setWalkDone(Boolean(todayRecord.walkDone));
    setDinner(todayRecord.dinner ?? "normal");
    setDinnerTime(todayRecord.dinnerTime ?? "19時ごろ");
  }, [records]);

  const today = formatDate(new Date());
  const todayRecord = useMemo(() => getTodayRecord(records), [records]);
  const todayScore = useMemo(() => getProgress(todayRecord), [todayRecord]);
  const todayStage = useMemo(() => getStage(todayScore), [todayScore]);
  const streak = useMemo(() => calculateStreak(records), [records]);

  const sortedRecords = useMemo(
    () =>
      [...records]
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .map((record) => ({ ...record, shortDate: toShortDate(record.date) })),
    [records],
  );

  const chartData = useMemo(() => movingAverage(sortedRecords), [sortedRecords]);

  const walkRate = useMemo(() => {
    if (!records.length) return 0;
    return Math.round((records.filter((record) => record.walkDone).length / records.length) * 100);
  }, [records]);

  const dinnerControlRate = useMemo(() => {
    if (!records.length) return 0;
    const controlled = records.filter(
      (record) => record.dinner === "half" || record.dinner === "none",
    ).length;
    return Math.round((controlled / records.length) * 100);
  }, [records]);

  const completedBirds = useMemo(
    () => records.filter((record) => getProgress(record) === 3).length,
    [records],
  );

  const checklist = [
    { label: "体重を記録した", done: weightInput.trim() !== "" },
    { label: "夜に歩いた", done: walkDone },
    { label: "夜の主食量を控えめにした", done: dinner === "half" || dinner === "none" },
  ];

  const saveTodayRecord = () => {
    const trimmedWeight = weightInput.trim();
    const parsedWeight = trimmedWeight === "" ? null : Number(trimmedWeight);

    if (trimmedWeight !== "" && Number.isNaN(parsedWeight)) {
      return;
    }

    const nextRecord = {
      date: today,
      weight: parsedWeight,
      walkDone,
      dinner,
      dinnerTime,
    };

    setRecords((previous) => {
      const remaining = previous.filter((record) => record.date !== today);
      return [...remaining, nextRecord].sort((a, b) => new Date(a.date) - new Date(b.date));
    });
  };

  const resetToday = () => {
    setWeightInput("");
    setWalkDone(false);
    setDinner("normal");
    setDinnerTime("19時ごろ");
    setRecords((previous) => previous.filter((record) => record.date !== today));
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(254,243,199,0.8),_transparent_34%),linear-gradient(180deg,_#fffdfa_0%,_#fffaf2_48%,_#f7fde7_100%)] px-4 py-5 text-stone-900 md:px-8 md:py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="overflow-hidden">
            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <CalendarDays className="h-4 w-4" />
                    <span>{today}</span>
                  </div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight md:text-4xl">
                    からだにっき
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-stone-600 md:text-base">
                    体重、夜の歩行、夜の主食量をやさしく続けるための記録アプリです。
                    毎日の達成度は、たまごからにわとりまでの成長で見える化されます。
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-4 py-1.5 text-sm text-amber-900">
                    {todayStage.label}
                  </span>
                  {streak >= 2 ? (
                    <span className="rounded-full bg-lime-100 px-4 py-1.5 text-sm text-lime-900">
                      {streak}日連続で満点
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </Card>

          <section className="rounded-[32px] bg-stone-900 p-6 text-white shadow-[0_24px_80px_rgba(28,25,23,0.22)] md:p-8">
            <p className="text-sm text-stone-300">今日の達成度</p>
            <div className="mt-4 flex items-center gap-4">
              <motion.span
                className="text-5xl"
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ duration: 1.8, repeat: Infinity }}
              >
                {todayStage.emoji}
              </motion.span>
              <div>
                <p className="text-xl font-semibold">{todayStage.label}</p>
                <p className="mt-1 text-sm leading-6 text-stone-300">{todayStage.message}</p>
              </div>
            </div>
            <div className="mt-6 rounded-3xl bg-white/10 p-4 text-sm text-stone-200">
              🥚 → 🐣 → 🐥 → 🐓 の順に育ちます
            </div>
          </section>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard icon={Scale} title="記録日数" value={`${records.length}日`} subtext="保存された日ごとの記録" />
          <StatCard icon={Trophy} title="満点の日" value={`${completedBirds}日`} subtext="3項目そろった達成日" />
          <StatCard icon={Footprints} title="夜の歩行率" value={`${walkRate}%`} subtext="記録日のうち歩けた割合" />
          <StatCard icon={Moon} title="主食コントロール率" value={`${dinnerControlRate}%`} subtext="半分・なしを選べた割合" />
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-3xl bg-white/70 p-2 shadow-sm ring-1 ring-amber-100">
          <TabButton active={activeTab === "today"} onClick={() => setActiveTab("today")}>
            今日の記録
          </TabButton>
          <TabButton active={activeTab === "graph"} onClick={() => setActiveTab("graph")}>
            グラフ
          </TabButton>
          <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>
            履歴
          </TabButton>
        </div>

        {activeTab === "today" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <Card>
              <CardHeader
                title="今日の入力"
                description="3つの項目をその日のうちに記録して、からだの変化をやさしく続けていきます。"
              />
              <div className="space-y-5 p-6 md:p-7">
                <div className="rounded-[28px] border border-amber-100 p-4">
                  <label className="mb-2 block text-sm font-medium text-stone-700">体重</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="例: 67.8"
                      value={weightInput}
                      onChange={(event) => setWeightInput(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 outline-none transition focus:border-amber-400"
                    />
                    <span className="text-sm text-stone-500">kg</span>
                  </div>
                </div>

                <div className="rounded-[28px] border border-amber-100 p-4">
                  <label className="mb-3 block text-sm font-medium text-stone-700">夜に歩いた</label>
                  <label className="flex items-center gap-3 text-sm text-stone-700">
                    <input
                      type="checkbox"
                      checked={walkDone}
                      onChange={(event) => setWalkDone(event.target.checked)}
                      className="h-5 w-5 rounded border-stone-300 text-amber-500"
                    />
                    10分以上歩けた
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[28px] border border-amber-100 p-4">
                    <label className="mb-3 block text-sm font-medium text-stone-700">夜の主食量</label>
                    <select
                      value={dinner}
                      onChange={(event) => setDinner(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 outline-none transition focus:border-amber-400"
                    >
                      {DINNER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-[28px] border border-amber-100 p-4">
                    <label className="mb-3 block text-sm font-medium text-stone-700">夜ごはんの時間</label>
                    <select
                      value={dinnerTime}
                      onChange={(event) => setDinnerTime(event.target.value)}
                      className="h-12 w-full rounded-2xl border border-stone-200 bg-white px-4 outline-none transition focus:border-amber-400"
                    >
                      {DINNER_TIME_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={saveTodayRecord}
                    className="h-12 rounded-2xl bg-stone-900 px-6 text-white transition hover:opacity-90"
                  >
                    今日の記録を保存
                  </button>
                  <button
                    type="button"
                    onClick={resetToday}
                    className="flex h-12 items-center justify-center rounded-2xl border border-stone-200 px-6 text-stone-700 transition hover:bg-stone-50"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    今日の入力をリセット
                  </button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader
                title="今日のチェック"
                description="できたことが増えるほど、動物が少しずつ成長していきます。"
              />
              <div className="space-y-4 p-6 md:p-7">
                {checklist.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between rounded-[24px] bg-amber-50/70 p-4"
                  >
                    <span className="text-sm text-stone-700">{item.label}</span>
                    <span className="text-2xl">{item.done ? "〇" : "△"}</span>
                  </div>
                ))}

                <div className="rounded-[32px] bg-[linear-gradient(180deg,_#fff4db_0%,_#eef8d3_100%)] p-6 text-center">
                  <motion.div
                    key={todayScore}
                    initial={{ opacity: 0.65, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className="text-7xl"
                  >
                    {todayStage.emoji}
                  </motion.div>
                  <p className="mt-3 text-lg font-medium text-stone-800">{todayStage.label}</p>
                  <p className="mt-1 text-sm leading-6 text-stone-600">{todayStage.message}</p>
                </div>
              </div>
            </Card>
          </div>
        ) : null}

        {activeTab === "graph" ? (
          <Card>
            <CardHeader
              title="体重グラフ"
              description="日ごとの体重と、直近7日間の平均を見比べられます。"
            />
            <div className="p-6 md:p-7">
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid stroke="#e7e5e4" strokeDasharray="3 3" />
                    <XAxis dataKey="shortDate" stroke="#78716c" />
                    <YAxis stroke="#78716c" width={40} />
                    <Tooltip
                      formatter={(value, name) => [`${value} kg`, name === "weight" ? "体重" : "7日平均"]}
                      labelFormatter={(label) => `日付: ${label}`}
                    />
                    <Line type="monotone" dataKey="weight" stroke="#292524" strokeWidth={3} dot={{ r: 3 }} name="weight" connectNulls />
                    <Line type="monotone" dataKey="average" stroke="#84cc16" strokeWidth={2} dot={false} strokeDasharray="6 4" name="average" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        ) : null}

        {activeTab === "history" ? (
          <Card>
            <CardHeader title="履歴" description="これまでの記録を日付ごとに確認できます。" />
            <div className="grid gap-3 p-6 md:p-7">
              {[...records]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((record) => {
                  const score = getProgress(record);
                  const stage = getStage(score);
                  const dinnerLabel = DINNER_OPTIONS.find((option) => option.value === record.dinner)?.label ?? "-";

                  return (
                    <div
                      key={record.date}
                      className="grid gap-3 rounded-[28px] border border-amber-100 p-4 md:grid-cols-[0.9fr_0.8fr_0.9fr_0.8fr_0.6fr] md:items-center"
                    >
                      <div>
                        <p className="text-xs text-stone-500">日付</p>
                        <p className="font-medium text-stone-900">{record.date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">体重</p>
                        <p className="font-medium text-stone-900">{typeof record.weight === "number" ? `${record.weight} kg` : "-"}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">夜の主食量</p>
                        <p className="font-medium text-stone-900">{dinnerLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-stone-500">夜の歩行</p>
                        <p className="font-medium text-stone-900">{record.walkDone ? "できた" : "まだ"}</p>
                      </div>
                      <div className="text-3xl" aria-label={stage.label}>
                        {stage.emoji}
                      </div>
                    </div>
                  );
                })}

              {records.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-stone-300 p-10 text-center text-sm leading-6 text-stone-500">
                  まだ記録はありません。今日の体重から、ゆっくり始めてみましょう。
                </div>
              ) : null}
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
