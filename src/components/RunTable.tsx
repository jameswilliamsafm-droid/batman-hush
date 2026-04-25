import type { Run } from "../types/order";

interface RunTableProps {
  runs: Run[];
  runStatuses?: string[];
  runErrors?: string[];
  runRetries?: number[];
  runOriginalTimes?: string[];
  runCurrentTimes?: string[];
  runReasons?: string[];
  runActualExecutedTimes?: (string | null)[];
  mode?: "logs" | "preview";
}

export function RunTable({
  runs,
  runStatuses = [],
  runErrors = [],
  runRetries = [],
  runActualExecutedTimes = [],
  mode = "preview"
}: RunTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[10px] sm:text-xs">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 uppercase tracking-wider">
            <th className="pb-2 pr-2 font-medium">#</th>
            <th className="pb-2 pr-2 font-medium">Scheduled Time</th>
            {mode === "logs" && <th className="pb-2 pr-2 font-medium">Executed At</th>}
            <th className="pb-2 pr-2 font-medium">Views</th>
            <th className="pb-2 pr-2 font-medium">Likes</th>
            <th className="pb-2 pr-2 font-medium">Shares</th>
            <th className="pb-2 pr-2 font-medium">Saves</th>
            <th className="pb-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-900">
          {runs.map((run, i) => {
            const status = runStatuses[i] || "pending";
            const error = runErrors[i];
            const retryCount = runRetries[i] || 0;
            const executedAt = runActualExecutedTimes[i];
            
            const scheduledDate = run.at instanceof Date ? run.at : new Date(run.at);

            return (
              <tr key={i} className="group hover:bg-yellow-500/5">
                <td className="py-2 pr-2 text-gray-600 font-mono">{i + 1}</td>
                <td className="py-2 pr-2 text-gray-400">
                  <div className="flex flex-col">
                    <span>{scheduledDate.toLocaleDateString()}</span>
                    <span className="text-[10px] text-gray-600">
                      {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </td>
                {mode === "logs" && (
                  <td className="py-2 pr-2">
                    {executedAt ? (
                      <div className="flex flex-col text-emerald-500/80">
                        <span>{new Date(executedAt).toLocaleDateString()}</span>
                        <span className="text-[10px]">
                          {new Date(executedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-700">—</span>
                    )}
                  </td>
                )}
                <td className="py-2 pr-2 text-yellow-400 font-medium">
                  {run.views?.toLocaleString() || 0}
                </td>
                <td className="py-2 pr-2 text-pink-400">
                  {run.likes || 0}
                </td>
                <td className="py-2 pr-2 text-blue-400">
                  {run.shares || 0}
                </td>
                <td className="py-2 pr-2 text-purple-400">
                  {run.saves || 0}
                </td>
                <td className="py-2">
                  <div className="flex flex-col gap-1">
                    <span className={`inline-flex items-center gap-1 font-medium ${
                      status === 'completed' ? 'text-emerald-400' :
                      status === 'failed' ? 'text-red-400' :
                      status === 'processing' ? 'text-yellow-400' :
                      'text-gray-500'
                    }`}>
                      {status === 'completed' ? '✅' : 
                       status === 'failed' ? '❌' : 
                       status === 'processing' ? '⚡' : '🕐'}
                      <span className="capitalize">{status}</span>
                    </span>
                    {retryCount > 0 && (
                      <span className="text-[9px] text-orange-400">🔄 Retry #{retryCount}</span>
                    )}
                    {error && (
                      <span className="text-[9px] text-red-500/70 truncate max-w-[100px]" title={error}>
                        {error}
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
