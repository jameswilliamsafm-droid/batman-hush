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
  mode?: "schedule" | "logs";
}

const STATUS_CONFIG: Record<ExtendedRunStatus, { label: string; color: string; bg: string; border: string; icon: string }> = {
  completed: { label: "Completed", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: "✅" },
  pending:   { label: "Pending",   color: "text-blue-300",    bg: "bg-blue-500/10",    border: "border-blue-500/30",    icon: "⏳" },
  retrying:  { label: "Retrying",  color: "text-yellow-300",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30",  icon: "🔄" },
  executing: { label: "Running",   color: "text-purple-300",  bg: "bg-purple-500/10",  border: "border-purple-500/30",  icon: "⚡" },
  cancelled: { label: "Cancelled", color: "text-red-300",     bg: "bg-red-500/10",     border: "border-red-500/30",     icon: "❌" },
  timeout:   { label: "Timeout",   color: "text-orange-300",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  icon: "⏰" },
};

const ROW_BG: Record<ExtendedRunStatus, string> = {
  completed: "bg-emerald-500/5 hover:bg-emerald-500/10",
  pending:   "hover:bg-gray-800/50",
  retrying:  "bg-yellow-500/5 hover:bg-yellow-500/10",
  executing: "bg-purple-500/5 hover:bg-purple-500/10",
  cancelled: "bg-red-500/5 hover:bg-red-500/10",
  timeout:   "bg-orange-500/5 hover:bg-orange-500/10",
};

export function RunTable({
  runs,
  runStatuses = [],
  runErrors = [],
  runRetries = [],
  runOriginalTimes = [],
  runCurrentTimes = [],
  runReasons = [],
  mode = "logs",
}: RunTableProps) {
  const safeRuns = runs || [];
  const safeRunStatuses = runStatuses || [];
  const safeRunErrors = runErrors || [];
  const safeRunRetries = runRetries || [];
  const safeRunOriginalTimes = runOriginalTimes || [];
  const safeRunCurrentTimes = runCurrentTimes || [];
  const safeRunReasons = runReasons || [];

  const getTimeDisplay = (index: number, originalRunTime: Date) => {
    const originalTime = safeRunOriginalTimes[index];
    const currentTime = safeRunCurrentTimes[index];
    if (originalTime && currentTime) {
      const origDate = new Date(originalTime);
      const currDate = new Date(currentTime);
      const isRescheduled = origDate.getTime() !== currDate.getTime();
      return { original: origDate, current: currDate, isRescheduled };
    }
    return { original: originalRunTime, current: originalRunTime, isRescheduled: false };
  };

  const getStatus = (index: number): ExtendedRunStatus => {
    const status = safeRunStatuses[index];
    const retryCount = safeRunRetries[index] || 0;
    const reason = safeRunReasons[index];
    if (status === "cancelled") return "cancelled";
    if (status === "completed") return "completed";
    if (reason?.toLowerCase().includes("timeout")) return "timeout";
    if (status === "retrying" || retryCount > 0) return "retrying";
    return "pending";
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    if (diff < 0) {
      const minutes = Math.abs(Math.floor(diff / (1000 * 60)));
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    }
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `in ${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `in ${hours}h`;
    return `in ${Math.floor(hours / 24)}d`;
  };

  const stats = useMemo(() => ({
    total: safeRuns.length,
    completed: safeRunStatuses.filter(s => s === "completed").length,
    retrying: safeRunStatuses.filter(s => s === "retrying").length,
    pending: safeRunStatuses.filter(s => s === "pending").length,
    cancelled: safeRunStatuses.filter(s => s === "cancelled").length,
    totalRetries: safeRunRetries.reduce((sum, r) => sum + (r || 0), 0),
  }), [safeRuns, safeRunStatuses, safeRunRetries]);

  // =====================
  // SCHEDULE MODE
  // =====================
  if (mode === "schedule") {
    return (
      <div className="mt-3 space-y-2">
        {/* Summary */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[10px] text-gray-500">
            📋 {safeRuns.length} scheduled runs
          </p>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-xl border border-yellow-500/20 max-h-72">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-900 border-b border-yellow-500/20">
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 w-12">#</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70">Scheduled Time</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 text-right">Views</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 text-right">Likes</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 text-right">Shares</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 text-right">Saves</th>
                <th className="px-3 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 text-right">Cmts</th>
              </tr>
            </thead>
            <tbody>
              {safeRuns.map((run, index) => {
                const runTime = run.at instanceof Date ? run.at : new Date(run.at);
                const isPast = runTime.getTime() <= Date.now();
                return (
                  <tr
                    key={run.run}
                    className={`border-t border-gray-800/50 transition-colors ${
                      isPast ? "bg-emerald-500/5" : "hover:bg-gray-800/30"
                    }`}
                  >
                    <td className="px-3 py-2 text-gray-500 text-[10px]">#{run.run}</td>
                    <td className="px-3 py-2">
                      <div className="text-[10px] text-gray-300">
                        {runTime.toLocaleString(undefined, {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </div>
                      <div className={`text-[9px] mt-0.5 ${isPast ? "text-emerald-500" : "text-gray-600"}`}>
                        {isPast ? "✓ Passed" : formatRelativeTime(runTime)}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-[10px] text-yellow-400 font-mono">{(run.views || 0).toLocaleString()}</td>
                    <td className="px-3 py-2 text-right text-[10px] text-pink-400 font-mono">{run.likes || 0}</td>
                    <td className="px-3 py-2 text-right text-[10px] text-blue-400 font-mono">{run.shares || 0}</td>
                    <td className="px-3 py-2 text-right text-[10px] text-purple-400 font-mono">{run.saves || 0}</td>
                    <td className="px-3 py-2 text-right text-[10px] text-green-400 font-mono">{run.comments || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // =====================
  // LOGS MODE
  // =====================
  return (
    <div className="mt-3 space-y-3">

      {/* Stats Summary Bar */}
      {stats.total > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-800 bg-black/50 px-3 py-2">
          <span className="text-[10px] text-gray-600 font-medium">Summary:</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] text-emerald-400">
            ✅ {stats.completed} done
          </span>
          {stats.pending > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[10px] text-blue-400">
              ⏳ {stats.pending} pending
            </span>
          )}
          {stats.retrying > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 px-2 py-0.5 text-[10px] text-yellow-400">
              🔄 {stats.retrying} retrying
            </span>
          )}
          {stats.cancelled > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[10px] text-red-400">
              ❌ {stats.cancelled} cancelled
            </span>
          )}
          {stats.totalRetries > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[10px] text-orange-400">
              ↻ {stats.totalRetries} retries
            </span>
          )}
          <span className="ml-auto text-[10px] text-gray-600">{stats.total} total runs</span>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-auto rounded-xl border border-yellow-500/20 max-h-96">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">

          {/* Header */}
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-900 border-b border-yellow-500/20">
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 w-12">#</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 min-w-[140px]">Scheduled Time</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-yellow-400/70 text-right">Views</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-pink-500/70 text-right">Likes</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-blue-500/70 text-right">Shares</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-purple-500/70 text-right">Saves</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-green-500/70 text-right">Cmts</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 min-w-[90px]">Status</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 text-center w-14">Retry</th>
              <th className="px-3 py-3 text-[10px] font-semibold uppercase tracking-wider text-yellow-500/70 min-w-[160px]">Info</th>
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {safeRuns.map((run, index) => {
              const status = getStatus(index);
              const config = STATUS_CONFIG[status];
              const rowBg = ROW_BG[status];
              const retryCount = safeRunRetries[index] || 0;
              const error = safeRunErrors[index];
              const reason = safeRunReasons[index];
              const timeData = getTimeDisplay(index, run.at instanceof Date ? run.at : new Date(run.at));

              return (
                <tr
                  key={run.run}
                  className={`border-t border-gray-800/50 transition-colors ${rowBg}`}
                >
                  {/* Run # */}
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] font-mono text-gray-500">#{run.run}</span>
                  </td>

                  {/* Time */}
                  <td className="px-3 py-2.5">
                    <div className={`text-[10px] font-medium ${
                      timeData.isRescheduled ? "text-yellow-400" : "text-gray-300"
                    }`}>
                      {formatTime(timeData.current)}
                    </div>
                    <div className="text-[9px] text-gray-600 mt-0.5">
                      {formatRelativeTime(timeData.current)}
                    </div>
                    {timeData.isRescheduled && (
                      <div className="text-[9px] text-gray-700 line-through mt-0.5">
                        {formatTime(timeData.original)}
                      </div>
                    )}
                  </td>

                  {/* Views */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-[10px] font-mono text-yellow-400">
                      {(run.views || 0).toLocaleString()}
                    </span>
                  </td>

                  {/* Likes */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-[10px] font-mono text-pink-400">
                      {run.likes || 0}
                    </span>
                  </td>

                  {/* Shares */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-[10px] font-mono text-blue-400">
                      {run.shares || 0}
                    </span>
                  </td>

                  {/* Saves */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-[10px] font-mono text-purple-400">
                      {run.saves || 0}
                    </span>
                  </td>

                  {/* Comments */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-[10px] font-mono text-green-400">
                      {run.comments || 0}
                    </span>
                  </td>

                  {/* Status Badge */}
                  <td className="px-3 py-2.5">
                    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[9px] font-medium ${config.bg} ${config.border} ${config.color}`}>
                      <span>{config.icon}</span>
                      <span>{config.label}</span>
                    </span>
                  </td>

                  {/* Retry Count */}
                  <td className="px-3 py-2.5 text-center">
                    {retryCount > 0 ? (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 text-[9px] font-medium text-orange-400">
                        ↻ {retryCount}
                      </span>
                    ) : (
                      <span className="text-gray-700 text-[10px]">—</span>
                    )}
                  </td>

                  {/* Error / Reason Info */}
                  <td className="px-3 py-2.5 max-w-[200px]">
                    {reason ? (
                      <p
                        className={`text-[9px] truncate ${
                          reason.toLowerCase().includes("waiting") ? "text-yellow-400" :
                          reason.toLowerCase().includes("timeout") ? "text-orange-400" :
                          reason.toLowerCase().includes("success") ? "text-emerald-400" :
                          "text-gray-500"
                        }`}
                        title={reason}
                      >
                        {reason}
                      </p>
                    ) : null}
                    {error && !reason?.includes(error) ? (
                      <p
                        className="text-[9px] text-red-400 truncate mt-0.5"
                        title={error}
                      >
                        ⚠️ {error}
                      </p>
                    ) : null}
                    {!reason && !error && (
                      <span className="text-gray-700 text-[10px]">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Footer totals */}
          <tfoot className="sticky bottom-0">
            <tr className="bg-gray-900 border-t border-yellow-500/20">
              <td colSpan={2} className="px-3 py-2 text-[10px] text-gray-500 font-medium">
                Totals ({safeRuns.length} runs)
              </td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold text-yellow-400 font-mono">
                {safeRuns.reduce((sum, r) => sum + (r.views || 0), 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold text-pink-400 font-mono">
                {safeRuns.reduce((sum, r) => sum + (r.likes || 0), 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold text-blue-400 font-mono">
                {safeRuns.reduce((sum, r) => sum + (r.shares || 0), 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold text-purple-400 font-mono">
                {safeRuns.reduce((sum, r) => sum + (r.saves || 0), 0).toLocaleString()}
              </td>
              <td className="px-3 py-2 text-right text-[10px] font-semibold text-green-400 font-mono">
                {safeRuns.reduce((sum, r) => sum + (r.comments || 0), 0).toLocaleString()}
              </td>
              <td colSpan={3} className="px-3 py-2 text-[10px] text-gray-600">
                {stats.completed}/{stats.total} completed
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[9px] text-gray-600 px-1">
        <span className="font-medium">Legend:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <span key={key} className="flex items-center gap-1">
            <span>{cfg.icon}</span>
            <span className={cfg.color}>{cfg.label}</span>
          </span>
        ))}
        <span className="flex items-center gap-1 ml-2">
          <span className="text-yellow-400">Yellow time</span>
          <span>= Rescheduled</span>
        </span>
      </div>
    </div>
  );
}
