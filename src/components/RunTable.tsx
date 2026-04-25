import { useMemo } from "react";
import type { RunStep } from "../types/order";

type ExtendedRunStatus = "pending" | "completed" | "cancelled" | "retrying" | "executing" | "timeout";

interface RunTableProps {
  runs: RunStep[];
  runStatuses?: Array<"pending" | "completed" | "cancelled" | "retrying">;
  runErrors?: string[];
  runRetries?: number[];
  runOriginalTimes?: string[];
  runCurrentTimes?: string[];
  runReasons?: string[];
  runActualExecutedTimes?: string[];
  mode?: "schedule" | "logs";
}

const STATUS_CONFIG: Record<ExtendedRunStatus, { label: string; color: string; bg: string; icon: string }> = {
  completed: { label: "Success",   color: "text-emerald-400", bg: "bg-emerald-500/20", icon: "✅" },
  pending:   { label: "Pending",   color: "text-blue-400",    bg: "bg-blue-500/20",    icon: "⏳" },
  retrying:  { label: "Retrying",  color: "text-yellow-400",  bg: "bg-yellow-500/20",  icon: "🔄" },
  executing: { label: "Executing", color: "text-purple-400",  bg: "bg-purple-500/20",  icon: "⚡" },
  cancelled: { label: "Cancelled", color: "text-red-400",     bg: "bg-red-500/20",     icon: "❌" },
  timeout:   { label: "Timeout",   color: "text-orange-400",  bg: "bg-orange-500/20",  icon: "⏰" },
};

export function RunTable({
  runs,
  runStatuses = [],
  runErrors = [],
  runRetries = [],
  runOriginalTimes = [],
  runCurrentTimes = [],
  runReasons = [],
  runActualExecutedTimes = [],
  mode = "logs",
}: RunTableProps) {
  const safeRuns               = runs                    || [];
  const safeRunStatuses        = runStatuses             || [];
  const safeRunErrors          = runErrors               || [];
  const safeRunRetries         = runRetries              || [];
  const safeRunOriginalTimes   = runOriginalTimes        || [];
  const safeRunCurrentTimes    = runCurrentTimes         || [];
  const safeRunReasons         = runReasons              || [];
  const safeRunActualExecutedTimes = runActualExecutedTimes || [];

  const getTimeDisplay = (index: number, originalRunTime: Date) => {
    const originalTime = safeRunOriginalTimes[index];
    const currentTime  = safeRunCurrentTimes[index];
    if (originalTime && currentTime) {
      const origDate = new Date(originalTime);
      const currDate = new Date(currentTime);
      return { original: origDate, current: currDate, isRescheduled: origDate.getTime() !== currDate.getTime() };
    }
    return { original: originalRunTime, current: originalRunTime, isRescheduled: false };
  };

  const getStatus = (index: number): ExtendedRunStatus => {
    const status     = safeRunStatuses[index];
    const retryCount = safeRunRetries[index] || 0;
    const reason     = safeRunReasons[index];
    if (status === "cancelled") return "cancelled";
    if (status === "completed") return "completed";
    if (reason?.toLowerCase().includes("timeout")) return "timeout";
    if (status === "retrying" || retryCount > 0) return "retrying";
    return "pending";
  };

  const formatTime = (date: Date) =>
    date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const formatRelativeTime = (date: Date) => {
    const diff = date.getTime() - Date.now();
    if (diff < 0) {
      const m = Math.abs(Math.floor(diff / 60000));
      if (m < 60) return `${m}m ago`;
      return `${Math.floor(m / 60)}h ago`;
    }
    const m = Math.floor(diff / 60000);
    if (m < 60) return `in ${m}m`;
    return `in ${Math.floor(m / 60)}h`;
  };

  const stats = useMemo(() => ({
    total:        safeRuns.length,
    completed:    safeRunStatuses.filter(s => s === "completed").length,
    retrying:     safeRunStatuses.filter(s => s === "retrying").length,
    pending:      safeRunStatuses.filter(s => s === "pending").length,
    cancelled:    safeRunStatuses.filter(s => s === "cancelled").length,
    totalRetries: safeRunRetries.reduce((sum, r) => sum + (r || 0), 0),
  }), [safeRuns, safeRunStatuses, safeRunRetries]);

  /* ─── SCHEDULE MODE ─── */
  if (mode === "schedule") {
    return (
      <div className="mt-3 max-h-72 overflow-auto rounded-xl border border-yellow-500/20">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="sticky top-0 z-10 bg-gray-900 text-slate-400">
            <tr className="border-b border-yellow-500/20">
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-yellow-500/70">Run</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-yellow-500/70">Time</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-yellow-400/70 text-right">Views</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-pink-500/70 text-right">Likes</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-blue-500/70 text-right">Shares</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-purple-500/70 text-right">Saves</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-green-500/70 text-right">Cmts</th>
            </tr>
          </thead>
          <tbody>
            {safeRuns.map((run) => {
              const runTime = run.at instanceof Date ? run.at : new Date(run.at);
              const isPast  = runTime.getTime() <= Date.now();
              return (
                <tr
                  key={run.run}
                  className={`border-t border-slate-800/60 transition-colors ${isPast ? "bg-emerald-500/5" : "hover:bg-gray-800/30"}`}
                >
                  <td className="px-3 py-2 text-gray-500 text-[10px] font-mono">#{run.run}</td>
                  <td className="px-3 py-2">
                    <div className="text-[10px] text-gray-300">{formatTime(runTime)}</div>
                    <div className={`text-[9px] mt-0.5 ${isPast ? "text-emerald-500" : "text-gray-600"}`}>
                      {isPast ? "✓ Passed" : formatRelativeTime(runTime)}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-[10px] font-mono text-yellow-400">{(run.views || 0).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-[10px] font-mono text-pink-400">{run.likes  || 0}</td>
                  <td className="px-3 py-2 text-right text-[10px] font-mono text-blue-400">{run.shares || 0}</td>
                  <td className="px-3 py-2 text-right text-[10px] font-mono text-purple-400">{run.saves  || 0}</td>
                  <td className="px-3 py-2 text-right text-[10px] font-mono text-green-400">{run.comments || 0}</td>
                </tr>
              );
            })}
          </tbody>
          {/* Totals footer */}
          <tfoot>
            <tr className="border-t border-yellow-500/20 bg-gray-900">
              <td colSpan={2} className="px-3 py-2 text-[10px] text-gray-500 font-medium">Total ({safeRuns.length} runs)</td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold font-mono text-yellow-400">{safeRuns.reduce((s, r) => s + (r.views   || 0), 0).toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold font-mono text-pink-400">{safeRuns.reduce((s, r) => s + (r.likes   || 0), 0).toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold font-mono text-blue-400">{safeRuns.reduce((s, r) => s + (r.shares  || 0), 0).toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold font-mono text-purple-400">{safeRuns.reduce((s, r) => s + (r.saves   || 0), 0).toLocaleString()}</td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold font-mono text-green-400">{safeRuns.reduce((s, r) => s + (r.comments|| 0), 0).toLocaleString()}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  /* ─── LOGS MODE ─── */
  return (
    <div className="mt-3 space-y-3">

      {/* Stats pills */}
      {stats.total > 0 && (
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-400">✅ {stats.completed} completed</span>
          {stats.retrying > 0 && (
            <span className="rounded-full bg-yellow-500/20 px-2 py-0.5 text-yellow-400">🔄 {stats.retrying} retrying</span>
          )}
          {stats.pending > 0 && (
            <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-blue-400">⏳ {stats.pending} pending</span>
          )}
          {stats.cancelled > 0 && (
            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-red-400">❌ {stats.cancelled} cancelled</span>
          )}
          {stats.totalRetries > 0 && (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-orange-400">↻ {stats.totalRetries} total retries</span>
          )}
        </div>
      )}

      {/* Main table */}
      <div className="overflow-auto rounded-xl border border-yellow-500/20 max-h-96">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">

          {/* Header */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-900 border-b border-yellow-500/20">
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-yellow-500/70 w-12">Run</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-yellow-500/70 min-w-[130px]">Scheduled</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-yellow-400/70 text-right">Views</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-pink-500/70 text-right">Likes</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-blue-500/70 text-right">Shares</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-purple-500/70 text-right">Saves</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-green-500/70 text-right">Cmts</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-yellow-500/70 min-w-[85px]">Status</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-yellow-500/70 min-w-[120px]">Placed At</th>
              <th className="px-3 py-2.5 text-[10px] uppercase tracking-wider text-yellow-500/70 min-w-[150px]">Info</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {safeRuns.map((run, index) => {
              const status     = getStatus(index);
              const config     = STATUS_CONFIG[status];
              const retryCount = safeRunRetries[index] || 0;
              const error      = safeRunErrors[index];
              const reason     = safeRunReasons[index];
              const timeData   = getTimeDisplay(index, run.at instanceof Date ? run.at : new Date(run.at));

              const rowBg =
                status === "completed" ? "bg-emerald-500/5 hover:bg-emerald-500/8" :
                status === "retrying"  ? "bg-yellow-500/5 hover:bg-yellow-500/8"  :
                status === "cancelled" ? "bg-red-500/5 hover:bg-red-500/8"        :
                "hover:bg-gray-800/30";

              return (
                <tr key={run.run} className={`border-t border-slate-800/60 transition-colors align-top ${rowBg}`}>

                  {/* Run # */}
                  <td className="px-3 py-2.5 font-mono text-[10px] text-gray-500">#{run.run}</td>

                  {/* Scheduled time */}
                  <td className="px-3 py-2.5">
                    <div className={`text-[10px] font-medium ${timeData.isRescheduled ? "text-yellow-400" : "text-slate-300"}`}>
                      {formatTime(timeData.current)}
                    </div>
                    <div className="text-[9px] text-slate-600 mt-0.5">
                      {formatRelativeTime(timeData.current)}
                    </div>
                    {timeData.isRescheduled && (
                      <div className="text-[9px] text-slate-700 line-through mt-0.5">
                        {formatTime(timeData.original)}
                      </div>
                    )}
                  </td>

                  {/* Quantities */}
                  <td className="px-3 py-2.5 text-right font-mono text-[10px] text-yellow-400">{(run.views    || 0).toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[10px] text-pink-400"  >{(run.likes    || 0).toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[10px] text-blue-400"  >{(run.shares   || 0).toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[10px] text-purple-400">{(run.saves    || 0).toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-[10px] text-green-400" >{(run.comments || 0).toLocaleString()}</td>

                  {/* Status badge */}
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium ${config.bg} ${config.color}`}>
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                  </td>

                  {/* Placed At */}
                  <td className="px-3 py-2.5">
                    {(() => {
                      const actualTime = safeRunActualExecutedTimes[index];
                      if (actualTime) {
                        const actualDate  = new Date(actualTime);
                        const delayMs     = actualDate.getTime() - timeData.original.getTime();
                        const delayMin    = Math.round(delayMs / 60000);
                        const wasDelayed  = delayMin > 2;
                        return (
                          <div className="space-y-0.5">
                            <p className={`text-[10px] font-medium ${wasDelayed ? "text-yellow-400" : "text-emerald-400"}`}>
                              {formatTime(actualDate)}
                            </p>
                            {wasDelayed && (
                              <p className="text-[9px] text-yellow-600">
                                +{delayMin}m delay{retryCount > 0 ? ` (${retryCount} retries)` : ""}
                              </p>
                            )}
                          </div>
                        );
                      }
                      if (retryCount > 0) {
                        return (
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-yellow-500/20 px-2 py-0.5 text-[9px] font-medium text-yellow-400">
                            ↻ retry {retryCount}
                          </span>
                        );
                      }
                      return <span className="text-slate-700 text-[10px]">—</span>;
                    })()}
                  </td>

                  {/* Info / Error */}
                  <td className="px-3 py-2.5 max-w-[180px]">
                    {reason ? (
                      <p
                        className={`text-[9px] truncate ${
                          reason.toLowerCase().includes("waiting") ? "text-yellow-400" :
                          reason.toLowerCase().includes("timeout") ? "text-orange-400" :
                          reason.toLowerCase().includes("success") ? "text-emerald-400" :
                          "text-slate-500"
                        }`}
                        title={reason}
                      >
                        {reason.length > 45 ? `${reason.slice(0, 45)}…` : reason}
                      </p>
                    ) : null}
                    {error && !reason?.includes(error) ? (
                      <p className="text-[9px] text-rose-400 truncate mt-0.5" title={error}>
                        ⚠️ {error.length > 40 ? `${error.slice(0, 40)}…` : error}
                      </p>
                    ) : null}
                    {!reason && !error && <span className="text-slate-700 text-[10px]">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Totals footer */}
          <tfoot>
            <tr className="border-t border-yellow-500/20 bg-gray-900">
              <td colSpan={2} className="px-3 py-2 text-[10px] text-gray-500 font-medium">
                Total ({safeRuns.length} runs)
              </td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold font-mono text-yellow-400">
                {safeRuns.reduce((s, r) => s + (r.views    || 0), 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold font-mono text-pink-400">
                {safeRuns.reduce((s, r) => s + (r.likes    || 0), 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold font-mono text-blue-400">
                {safeRuns.reduce((s, r) => s + (r.shares   || 0), 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold font-mono text-purple-400">
                {safeRuns.reduce((s, r) => s + (r.saves    || 0), 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold font-mono text-green-400">
                {safeRuns.reduce((s, r) => s + (r.comments || 0), 0).toLocaleString()}
              </td>
              <td colSpan={3} className="px-3 py-2 text-[10px] text-gray-600">
                {stats.completed}/{stats.total} completed
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[9px] text-slate-600 pt-1">
        <span>Legend:</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Completed</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" /> Pending</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse" /> Retrying</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" /> Cancelled</span>
        <span className="flex items-center gap-1"><span className="text-yellow-400">Yellow time</span> = Rescheduled</span>
        <span className="flex items-center gap-1"><span className="text-yellow-400">Placed At</span> = Actual execution (yellow = delayed)</span>
      </div>
    </div>
  );
}
