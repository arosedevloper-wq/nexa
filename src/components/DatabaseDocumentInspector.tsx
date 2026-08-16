import React, { useState, useEffect } from "react";
import { fetchBankingRequestById, databaseConfig } from "../lib/db";
import { Database, RefreshCw, CheckCircle2, AlertCircle, Search } from "lucide-react";

interface DatabaseDocumentInspectorProps {
  collectionName?: string;
  documentId?: string;
  onClose?: () => void;
}

export const DatabaseDocumentInspector: React.FC<DatabaseDocumentInspectorProps> = ({
  collectionName = "banking_requests",
  documentId = "req-102",
  onClose
}) => {
  const [colName, setColName] = useState(collectionName);
  const [docId, setDocId] = useState(documentId);
  const [docData, setDocData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchDocument = async () => {
    if (!colName || !docId) return;
    setLoading(true);
    setError(null);
    try {
      if (colName.trim() === "banking_requests") {
        const item = await fetchBankingRequestById(docId.trim());
        if (item) {
          setDocData(item);
        } else {
          setDocData(null);
          setError(`Document "${docId}" was not found in collection "${colName}".`);
        }
      } else {
        const local = localStorage.getItem(`casino_${colName.trim()}_v1`) || localStorage.getItem(colName.trim());
        if (local) {
          const list = JSON.parse(local);
          const item = Array.isArray(list) ? list.find((i: any) => i.id === docId.trim() || i.email === docId.trim()) : list;
          if (item) {
            setDocData(item);
          } else {
            setDocData(null);
            setError(`Document "${docId}" was not found in collection "${colName}".`);
          }
        } else {
          setDocData(null);
          setError(`Collection "${colName}" was not found.`);
        }
      }
      setFetchedAt(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error("Error fetching document:", err);
      setError(err?.message || "Failed to fetch document.");
      setDocData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocument();
  }, []);

  return (
    <div className="bg-slate-900/95 border border-emerald-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-md max-w-2xl mx-auto my-4 text-slate-100 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Database Document Inspector
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                DB: {databaseConfig.dbName}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Engine: <code className="text-emerald-300 font-mono">{databaseConfig.type}</code>
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 transition"
          >
            Close
          </button>
        )}
      </div>

      {/* Query Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 mb-4">
        <div className="sm:col-span-5">
          <label className="text-[11px] font-medium text-slate-400 block mb-1">Collection</label>
          <input
            type="text"
            value={colName}
            onChange={(e) => setColName(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            placeholder="e.g. banking_requests"
          />
        </div>
        <div className="sm:col-span-5">
          <label className="text-[11px] font-medium text-slate-400 block mb-1">Document ID</label>
          <input
            type="text"
            value={docId}
            onChange={(e) => setDocId(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
            placeholder="e.g. req-102"
          />
        </div>
        <div className="sm:col-span-2 flex items-end">
          <button
            onClick={fetchDocument}
            disabled={loading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Fetch
          </button>
        </div>
      </div>

      {/* Result Display Card */}
      <div className="bg-slate-950 rounded-xl border border-slate-800 p-4">
        <div className="flex items-center justify-between mb-3 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-semibold text-slate-300">
              Document: <span className="text-emerald-400 font-mono">{colName}/{docId}</span>
            </span>
          </div>
          {fetchedAt && (
            <span className="text-[10px] font-mono text-slate-500">
              Fetched: {fetchedAt}
            </span>
          )}
        </div>

        {loading && (
          <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-emerald-400" />
            Querying database server...
          </div>
        )}

        {!loading && error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs text-rose-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Database Query Notice</p>
              <p className="text-rose-200/80">{error}</p>
            </div>
          </div>
        )}

        {!loading && !error && docData && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
              <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                <CheckCircle2 className="w-4 h-4" /> Document Loaded Successfully
              </span>
              <span className="text-[11px] text-slate-400 font-mono">ID: {docData.id || docData._id}</span>
            </div>

            {/* Key-Value Fields Card Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {Object.entries(docData).map(([key, value]) => (
                <div key={key} className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold mb-1">{key}</span>
                  <span className="text-white font-mono text-xs break-all">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>

            {/* JSON view option */}
            <details className="text-[11px] text-slate-400">
              <summary className="cursor-pointer hover:text-emerald-400 font-mono">View Raw JSON Payload</summary>
              <pre className="bg-slate-900 p-3 rounded-lg border border-slate-800 text-[10px] font-mono text-emerald-200/90 overflow-x-auto mt-2">
                {JSON.stringify(docData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};
