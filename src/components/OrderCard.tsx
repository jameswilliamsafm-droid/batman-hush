import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { CreatedOrder, OrderStatus } from "../types/order";
import { RunTable } from "./RunTable";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface OrderCardProps {
  order: CreatedOrder;
  onControl: (order: CreatedOrder, action: "pause" | "resume" | "cancel") => void;
  onClone: (order: CreatedOrder) => void;
  controlBusy: boolean;
}

const statusColor: Record<OrderStatus, string> = {
  running: "text-yellow-300",
  paused: "text-amber-300",
  cancelled: "text-red-300",
  completed: "text-emerald-300",
  processing: "text-yellow-300",
  failed: "text-red-300",
};

export function OrderCard({ order, onControl, onClone, controlBusy }: OrderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const safeRuns = order?.runs || [];
  const safeRunStatuses = order?.runStatuses || [];
  const safeRunErrors = order?.runErrors || [];
  const finishTime = safeRuns[safeRuns.length - 1]?.at;

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 4000);
    return () => window.clearInterval(timer);
  }, []);

  const { totalRuns, completedRuns, progressPercent } = useMemo(() => {
    const nextTotalRuns = Math.max(1, safeRuns.length);
    const completedFromStatuses = safeRunStatuses.filter((status) => status === "completed").length;
    const completedFromTime = safeRuns.reduce((count, run) => {
      const runTime = run?.at instanceof Date ? run.at.getTime() : new Date(run?.at ?? Date.now()).getTime();
      return runTime <= nowMs ? count + 1 : count;
    }, 0);
    const isTimeTrackedStatus = order.status === "running" || order.status === "processing" || order.status === "completed";
    const nextCompletedRuns = Math.min(
      nextTotalRuns,
      Math.max(
        0,
        order.status === "completed" ? nextTotalRuns : 0,
        Number.isFinite(order.completedRuns) ? order.completedRuns : 0,
        completedFromStatuses,
        isTimeTrackedStatus ? completedFromTime : 0
      )
    );
    const nextProgressPercent = Math.round((nextCompletedRuns / nextTotalRuns) * 100);
    return { totalRuns: nextTotalRuns, completedRuns: nextCompletedRuns, progressPercent: nextProgressPercent };
  }, [safeRuns, safeRunStatuses, order.status, order.completedRuns, nowMs]);

  const effectiveStatus = useMemo(() => {
    const runs = order.runs || [];
    const now = Date.now();
    if (runs.length > 0) {
      const allCompleted = runs.every((run) => {
        const runTime = new Date(run.at).getTime();
        return runTime <= now;
      });
      if (allCompleted) return "completed";
    }
    if (order.status === "processing") return "running";
    return order.status;
  }, [order, nowMs]);

  // 🔥 FIX: Build chart data from actual run data (cumulative over time)
  const chartData = useMemo(() => {
    const runs = Array.isArray(order?.runs) ? order.runs : [];
    if (runs.length === 0) return [];

    let cumulativeViews = 0;
    let cumulativeLikes = 0;
    let cumulativeShares = 0;
    let cumulativeSaves = 0;
    let cumulativeComments = 0;

    return runs.map((run) => {
      if (!run) return null;

      const runTime = run?.at instanceof Date
        ? run.at.getTime()
        : new Date(run?.at ?? 0).getTime();

      const isPast = runTime <= nowMs;

      // Only accumulate past runs
      if (isPast) {
        cumulativeViews += Number(run?.views || 0);
        cumulativeLikes += Number(run?.likes || 0);
        cumulativeShares += Number(run?.shares || 0);
        cumulativeSaves += Number(run?.saves || 0);
        cumulativeComments += Number(run?.comments || 0);
      }

      const timeLabel = run?.at instanceof Date
        ? run.at
        : new Date(run?.at ?? 0);

      return {
        time: timeLabel,
        timeMs: runTime,
        views: isPast ? cumulativeViews : null,
        likes: isPast ? cumulativeLikes : null,
        shares: isPast ? cumulativeShares : null,
        saves: isPast ? cumulativeSaves : null,
        comments: isPast ? cumulativeComments : null,
        // Planned lines (full schedule)
        plannedViews: cumulativeViews + (isPast ? 0 : Number(run?.views || 0)),
        plannedLikes: cumulativeLikes + (isPast ? 0 : Number(run?.likes || 0)),
      };
    }).filter(Boolean);
  }, [order?.runs, nowMs]);

  // 🔥 FIX: Build planned data from all runs regardless of time
  const plannedData = useMemo(() => {
    const runs = Array.isArray(order?.runs) ? order.runs : [];
    if (runs.length === 0) return [];

    let cv = 0;
    let cl = 0;

    return runs.map((run) => {
      if (!run) return null;
      cv += Number(run?.views || 0);
      cl += Number(run?.likes || 0);

      const timeLabel = run?.at instanceof Date
        ? run.at
        : new Date(run?.at ?? 0);

      return {
        time: timeLabel,
        plannedViews: cv,
        plannedLikes: cl,
      };
    }).filter(Boolean);
  }, [order?.runs]);

  // 🔥 FIX: Check if there is any meaningful data to show
  const hasChartData = safeRuns.length > 0;
  const hasActualData = safeRuns.some((run) => {
    const runTime = run?.at instanceof Date ? run.at.getTime() : new Date(run?.at ?? 0).getTime();
    return runTime <= nowMs && (run?.views || 0) > 0;
  });

  const shortLink =
    order.link.length > 56
      ? `${order.link.slice(0, 36)}...${order.link.slice(-14)}`
      : order.link;

  const handleControl = async (action: "pause" | "resume" | "cancel") => {
    try {
      if (action === "cancel") {
        const confirmCancel = window.confirm("Are you sure you want to cancel this mission?");
        if (!confirmCancel) return;
      }
      onControl(order, action);
    } catch (err) {
      console.error("Control action failed", err);
      alert("Action failed. Please try again.");
    }
  };

  return (
    <article className="rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-gray-900 to-black p-3 sm:p-5">

      {/* Top Section */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">

        {/* Left - Mission Info */}
        <div className="space-y-1 sm:space-y-2 min-w-0">
          <p className="text-[10px] sm:text-xs uppercase tracking-wide text-gray-600">Mission ID</p>
          <h3 className="text-base sm:text-lg font-semibold text-yellow-400">{order.id}</h3>
          <p className="text-xs sm:text-sm text-yellow-300">{order.name || `Mission #${order.id}`}</p>
          <p className="max-w-full truncate text-xs sm:text-sm text-gray-500" title={order.link || "No link provided"}>
            {shortLink || "No link provided"}
          </p>
          {order.schedulerOrderId && (
            <p className="text-[10px] sm:text-xs text-gray-600 font-mono">
              Scheduler: {order.schedulerOrderId}
            </p>
          )}
        </div>

        {/* Right - Order Details */}
        <div className="flex flex-row flex-wrap gap-x-4 gap-y-1 sm:flex-col sm:space-y-2 sm:text-right">
          <p className="text-xs sm:text-sm text-gray-500">
            Panel ID: <span className="font-semibold text-yellow-300">{order.smmOrderId}</span>
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Service: <span className="font-semibold text-gray-300">{order.serviceId}</span>
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Qty: <span className="font-semibold text-gray-300">{order.totalViews}</span>
          </p>
          <p className="text-xs sm:text-sm text-gray-500">
            Status: <span className={`font-semibold ${statusColor[effectiveStatus]}`}>{effectiveStatus}</span>
          </p>
          {order.errorMessage && (
            <p className="text-[10px] sm:text-xs text-red-400 break-words">Error: {order.errorMessage}</p>
          )}
          {finishTime && (
            <p className="text-[10px] sm:text-xs text-gray-600">
              ETA: {finishTime instanceof Date ? finishTime.toLocaleString() : new Date(finishTime).toLocaleString()}
            </p>
          )}
          <p className="text-[10px] sm:text-xs text-gray-600">
            Updated: {new Date(order.lastUpdatedAt || order.createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mt-3 sm:mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-yellow-500 transition-all"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-gray-500">{completedRuns} / {totalRuns} runs completed</p>

        {/* 🔥 FIX: Chart with proper data */}
        {hasChartData && (
          <div className="mt-3 sm:mt-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-gray-500">📈 Delivery Progress</p>
              <div className="flex items-center gap-3 text-[9px]">
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded bg-yellow-400" />
                  <span className="text-gray-500">Views</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="inline-block h-2 w-4 rounded bg-pink-400" />
                  <span className="text-gray-500">Likes</span>
                </span>
              </div>
            </div>
            <div className="h-36 sm:h-48 w-full rounded-xl border border-yellow-500/10 bg-black/30 p-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={plannedData}
                  margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" opacity={0.5} />
                  <XAxis
                    dataKey="time"
                    stroke="#4b5563"
                    tick={{ fontSize: 8, fill: "#6b7280" }}
                    tickFormatter={(time) => {
                      try {
                        const d = new Date(time);
                        return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
                      } catch {
                        return "";
                      }
                    }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    stroke="#4b5563"
                    tick={{ fontSize: 8, fill: "#6b7280" }}
                    width={35}
                    tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#000",
                      border: "1px solid #eab308",
                      borderRadius: "8px",
                      fontSize: "10px",
                      color: "#e5e7eb",
                    }}
                    labelFormatter={(label) => {
                      try {
                        return new Date(label).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        });
                      } catch {
                        return label;
                      }
                    }}
                    formatter={(value: number, name: string) => {
                      if (value === null || value === undefined) return ["-", name];
                      const labels: Record<string, string> = {
                        plannedViews: "Views",
                        plannedLikes: "Likes",
                      };
                      return [value.toLocaleString(), labels[name] || name];
                    }}
                  />
                  {/* Planned Views - solid yellow */}
                  <Line
                    type="monotone"
                    dataKey="plannedViews"
                    stroke="#eab308"
                    strokeWidth={2}
                    dot={false}
                    name="plannedViews"
                    connectNulls
                  />
                  {/* Planned Likes - solid pink */}
                  <Line
                    type="monotone"
                    dataKey="plannedLikes"
                    stroke="#ec4899"
                    strokeWidth={1.5}
                    dot={false}
                    name="plannedLikes"
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            {!hasActualData && (
              <p className="text-center text-[10px] text-gray-600 mt-1">
                📅 Showing planned schedule — actual data will appear as runs complete
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="mt-3 sm:mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={controlBusy || effectiveStatus !== "running"}
          onClick={() => handleControl("pause")}
          className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-300 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ⏸️ Pause
        </button>
        <button
          type="button"
          disabled={controlBusy || effectiveStatus !== "paused"}
          onClick={() => handleControl("resume")}
          className="rounded-lg border border-emerald-500/50 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ▶️ Resume
        </button>
        <button
          type="button"
          disabled={controlBusy || effectiveStatus === "cancelled" || effectiveStatus === "completed"}
          onClick={() => handleControl("cancel")}
          className="rounded-lg border border-red-500/50 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ❌ Cancel
        </button>
        <button
          type="button"
          onClick={() => onClone(order)}
          className="rounded-lg border border-yellow-500/50 bg-yellow-500/10 px-2.5 py-1.5 text-xs text-yellow-300 transition hover:bg-yellow-500/20"
        >
          📋 Clone
        </button>
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className={`ml-auto rounded-lg border px-2.5 py-1.5 text-xs transition ${
            expanded
              ? "border-yellow-500/50 bg-yellow-500/20 text-yellow-300"
              : "border-yellow-500/30 bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20"
          }`}
        >
          {expanded ? "🔼 Hide Runs" : `📋 View Runs (${totalRuns})`}
        </button>
      </div>

      {/* Run Table */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
          >
            <RunTable
              runs={safeRuns}
              runStatuses={safeRunStatuses}
              runErrors={safeRunErrors}
              runRetries={order.runRetries || []}
              runOriginalTimes={order.runOriginalTimes || []}
              runCurrentTimes={order.runCurrentTimes || []}
              runReasons={order.runReasons || []}
              mode="logs"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
}
