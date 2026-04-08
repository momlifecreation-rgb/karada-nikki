import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { CalendarDays, Dumbbell, Scale, Moon, Trophy, RotateCcw } from "lucide-react";

const STORAGE_KEY = "karada_nikki_records_v1";

const DINNER_OPTIONS = [
  { value: "normal", label: "ふつう" },
  { value: "half", label: "半分" },
  { value: "none", label: "なし" },
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
  return records.find((r) => r.date === today) || null;
}

function getProgress(record) {
  if (!record) return 0;
  let score = 0;
  if (record.weight) score += 1;
  if (record.walkDone) score += 1;
  if (record.dinner !== "normal" && record.dinner) score += 1;
  return score;
}

function getStage(score) {
  if (score <= 0) return "🥚";
  if (score === 1) return "🐣";
  if (score === 2) return "🐥";
  return "🐓";
}

function getStageLabel(score) {
  if (score <= 0) return "たまご";
  if (score === 1) return "ひよこ誕生";
  if (score === 2) return "すくすく成長";
  return "にわとり完成";
}

function calculateStreak(records) {
  const sorted = [...records].sort((a, b) => new Date(b.date) - new Date(a.date));
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i += 1) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const key = formatDate(checkDate);
    const record = sorted.find((r) => r.date === key);
    if (record && getProgress(record) === 3) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

function movingAverage(data, windowSize = 7) {
  return data.map((item, idx) => {
    const slice = data.slice(Math.max(0, idx - windowSize + 1), idx + 1);
    const valid = slice.filter((x) => typeof x.weight === "number");
    const avg = valid.length
      ? Number((valid.reduce((sum, x) => sum + x.weight, 0) / valid.length).toFixed(1))
      : null;
    return { ...item, average: avg };
  });
}

function Card({ children, className = "" }) {
  return <div className={`rounded-[28px] border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

function CardHeader({ title, description }) {
  return (
    <div className="px-6 pt-6">
      <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
      {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
    </div>
  );
}

function StatCard({ icon: Icon, title, value, subtext }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
          {subtext ? <p className="mt-1 text-xs text-slate-500">{subtext}</p> : null}
        </div>
        <div className="rounded-2xl bg-slate-100 p-3">
          <Icon className="h-5 w-5 text-slate-700" />
        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
        active ? "bg-slate-900 text-white" : "bg-white text-slate-700 hover:bg-slate-100"
      }`}
    >
      {children}
    </button>
  );
}

export default function KaradaNikkiApp() {
  const [records, setRecords] = useState([]);
  const [weightInput, setWeightInput] = useState("");
  const [walkDone, setWalkDone] = useState(false);
  const [dinner, setDinner] = useState("normal");
  const [dinnerTime, setDinnerTime] = useState("19時台");
  const [activeTab, setActiveTab] = useState("today");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      setRecords(Array.isArray(parsed) ? parsed : []);
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
      setDinnerTime("19時台");
      return;
    }
    setWeightInput(todayRecord.weight ? String(todayRecord.weight) : "");
    setWalkDone(!!todayRecord.walkDone);
    setDinner(todayRecord.dinner || "normal");
    setDinnerTime(todayRecord.dinnerTime || "19時台");
  }, [records]);

  const today = formatDate(new Date());
  const todayRecord = useMemo(() => getTodayRecord(records), [records]);
  const todayScore = useMemo(() => getProgress(todayRecord), [todayRecord]);
  const streak = useMemo(() => calculateStreak(records), [records]);

  const sortedRecords = useMemo(() => {
    return [...records]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((r) => ({ ...r, shortDate: toShortDate(r.date) }));
  }, [records]);

  const chartData = useMemo(() => movingAverage(sortedRecords), [sortedRecords]);

  const walkRate = useMemo(() => {
    if (!records.length) return 0;
    const done = records.filter((r) => r.walkDone).length;
    return Math.round((done / records.length) * 100);
  }, [records]);

  const dinnerControlRate = useMemo(() => {
    if (!records.length) return 0;
    const done = records.filter((r) => r.dinner === "half" || r.dinner === "none").length;
    return Math.round((done / records.length) * 100);
  }, [records]);

  const completedBirds = useMemo(() => records.filter((r) => getProgress(r) === 3).length, [records]);

  const saveTodayRecord = () => {
    const parsedWeight = weightInput.trim() === "" ? null : Number(weightInput);
    if (weightInput.trim() !== "" && Number.isNaN(parsedWeight)) return;

    const newRecord = {
      date: today,
      weight: parsedWeight,
      walkDone,
      dinner,
      dinnerTime,
    };

    setRecords((prev) => {
      const others = prev.filter((r) => r.date !== today);
      return [...others, newRecord].sort((a, b) => new Date(a.date) - new Date(b.date));
    });
  };

  const resetToday = () => {
    setWeightInput("");
    setWalkDone(false);
    setDinner("normal");
    setDinnerTime("19時台");
    setRecords((prev) => prev.filter((r) => r.date !== today));
  };

  const message =
    todayScore === 3
      ? "今日はばっちり。1羽そだちました。"
      : todayScore === 2
      ? "あとひとつで完成です。"
      : todayScore === 1
      ? "いいスタートです。もう少し。"
      : "まずは今日の記録から始めましょう。";

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-lime-50 p-4 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 grid gap-4 md:grid-cols-[1.3fr_0.7fr]">
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white/85 shadow-xl backdrop-blur">
            <div className="p-6 md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <CalendarDays className="h-4 w-4" />
                    <span>{today}</span>
                  </div>
                  <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">からだにっき</h1>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 md:text-base">
                    体重と夜の習慣を、やさしく記録するアプリです。数値だけでなく、今日できたことも残せます。
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-4 py-1.5 text-sm text-slate-800">{getStageLabel(todayScore)}</span>
                  {streak >= 3 ? (
                    <span className="rounded-full bg-lime-100 px-4 py-1.5 text-sm text-lime-900">{streak}日連続コンプリート</span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-slate-800 bg-slate-900 text-white shadow-xl">
            <div className="flex h-full flex-col justify-between p-6 md:p-8">
              <div>
                <p className="text-sm text-slate-300">今日の育ち具合</p>
                <div className="mt-4 flex items-center gap-3 text-4xl md:text-5xl">
                  <motion.span animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 1.6, repeat: Infinity }}>
                    {getStage(todayScore)}
                  </motion.span>
                  <div>
                    <p className="text-xl font-semibold">{getStageLabel(todayScore)}</p>
                    <p className="mt-1 text-sm text-slate-300">{message}</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 rounded-2xl bg-white/10 p-4 text-sm text-slate-200">🥚 → 🐣 → 🐥 → 🐓</div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard icon={Scale} title="記録日数" value={`${records.length}日`} subtext="これまでの入力数" />
          <StatCard icon={Trophy} title="育った数" value={`${completedBirds}羽`} subtext="3項目達成の日" />
          <StatCard icon={Dumbbell} title="夜さんぽ達成率" value={`${walkRate}%`} subtext="全記録日の平均" />
          <StatCard icon={Moon} title="主食コントロール率" value={`${dinnerControlRate}%`} subtext="半分またはなし" />
        </div>

        <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-slate-100 p-2">
          <TabButton active={activeTab === "today"} onClick={() => setActiveTab("today")}>今日の記録</TabButton>
          <TabButton active={activeTab === "graph"} onClick={() => setActiveTab("graph")}>グラフ</TabButton>
          <TabButton active={activeTab === "history"} onClick={() => setActiveTab("history")}>履歴</TabButton>
        </div>

        {activeTab === "today" && (
          <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
            <Card>
              <CardHeader title="今日のタスク" description="3つそろうと、今日のにわとりが完成します。" />
              <div className="space-y-5 p-6">
                <div className="rounded-2xl border border-slate-200 p-4">
                  <label className="mb-2 block text-sm font-medium text-slate-700">体重</label>
                  <div className="flex items-center gap-3">
                    <input
                      inputMode="decimal"
                      placeholder="例 67.8"
                      value={weightInput}
                      onChange={(e) => setWeightInput(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-slate-300 px-4 outline-none focus:border-slate-500"
                    />
                    <span className="text-sm text-slate-500">kg</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4">
                  <label className="mb-3 block text-sm font-medium text-slate-700">夜ごはん後10分歩いた？</label>
                  <label className="flex items-center gap-3 text-sm text-slate-700">
                    <input type="checkbox" checked={walkDone} onChange={(e) => setWalkDone(e.target.checked)} className="h-5 w-5" />
                    やった
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="mb-3 block text-sm font-medium text-slate-700">夜の主食</label>
                    <select value={dinner} onChange={(e) => setDinner(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-300 px-4 outline-none focus:border-slate-500">
                      {DINNER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-4">
                    <label className="mb-3 block text-sm font-medium text-slate-700">夕食時間</label>
                    <select value={dinnerTime} onChange={(e) => setDinnerTime(e.target.value)} className="h-11 w-full rounded-2xl border border-slate-300 px-4 outline-none focus:border-slate-500">
                      <option value="18時台">18時台</option>
                      <option value="19時台">19時台</option>
                      <option value="20時以降">20時以降</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <button onClick={saveTodayRecord} className="h-11 rounded-2xl bg-slate-900 px-6 text-white transition hover:opacity-90">
                    今日の記録を保存
                  </button>
                  <button onClick={resetToday} className="flex h-11 items-center justify-center rounded-2xl border border-slate-300 px-6 text-slate-700 transition hover:bg-slate-50">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    今日の入力をリセット
                  </button>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader title="今日の進み具合" description="できたことが、そのまま育ちになります。" />
              <div className="space-y-4 p-6">
                {[
                  { label: "体重を記録した", done: weightInput.trim() !== "" },
                  { label: "夜ごはん後10分歩いた", done: walkDone },
                  { label: "夜の主食を控えめにした", done: dinner === "half" || dinner === "none" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                    <span className="text-sm text-slate-700">{item.label}</span>
                    <span className="text-2xl">{item.done ? "✅" : "⬜"}</span>
                  </div>
                ))}

                <div className="rounded-3xl bg-gradient-to-br from-amber-100 to-lime-100 p-6 text-center">
                  <motion.div key={todayScore} initial={{ opacity: 0.6, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.25 }} className="text-7xl">
                    {getStage(todayScore)}
                  </motion.div>
                  <p className="mt-3 text-lg font-medium text-slate-800">{getStageLabel(todayScore)}</p>
                  <p className="mt-1 text-sm text-slate-600">{message}</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {activeTab === "graph" && (
          <Card>
            <CardHeader title="体重グラフ" description="日ごとの体重と、見やすい7日平均を表示します。" />
            <div className="p-6">
              <div className="h-[360px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 12, right: 16, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="shortDate" />
                    <YAxis domain={["dataMin - 1", "dataMax + 1"]} />
                    <Tooltip formatter={(value, name) => [`${value} kg`, name === "weight" ? "体重" : "7日平均"]} labelFormatter={(label) => `日付: ${label}`} />
                    <Line type="monotone" dataKey="weight" stroke="#0f172a" strokeWidth={3} dot={{ r: 3 }} name="weight" connectNulls />
                    <Line type="monotone" dataKey="average" stroke="#84cc16" strokeWidth={2} dot={false} strokeDasharray="6 4" name="average" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>
        )}

        {activeTab === "history" && (
          <Card>
            <CardHeader title="履歴" description="最近の記録一覧です。" />
            <div className="grid gap-3 p-6">
              {[...records]
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .map((record) => {
                  const score = getProgress(record);
                  const dinnerLabel = DINNER_OPTIONS.find((d) => d.value === record.dinner)?.label || "-";
                  return (
                    <div key={record.date} className="grid gap-3 rounded-2xl border border-slate-200 p-4 md:grid-cols-[0.9fr_0.8fr_0.9fr_0.8fr_0.7fr] md:items-center">
                      <div>
                        <p className="text-xs text-slate-500">日付</p>
                        <p className="font-medium text-slate-900">{record.date}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">体重</p>
                        <p className="font-medium text-slate-900">{record.weight ?? "-"} {record.weight ? "kg" : ""}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">夜の主食</p>
                        <p className="font-medium text-slate-900">{dinnerLabel}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">夜さんぽ</p>
                        <p className="font-medium text-slate-900">{record.walkDone ? "やった" : "やってない"}</p>
                      </div>
                      <div className="text-3xl">{getStage(score)}</div>
                    </div>
                  );
                })}

              {records.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                  まだ記録がありません。今日の体重から始めてみましょう。
                </div>
              ) : null}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
