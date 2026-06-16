import { useRef, useState, type ChangeEvent } from "react";
import { exportData, importData } from "../api";

export default function BackupBar({ onImported }: { onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState("");

  async function handleExport() {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `watchlist-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm("Importing will REPLACE your current list. Continue?")) {
      e.target.value = "";
      return;
    }
    try {
      const data = JSON.parse(await file.text());
      const res = await importData(data);
      setMsg(`Imported ${res.count} comics.`);
      onImported();
    } catch (err: any) {
      setMsg("Import failed: " + err.message);
    } finally {
      e.target.value = "";
    }
  }

  return (
    <div className="backup-bar">
      <span className="bb-label">Backup</span>
      <button className="mini-btn" onClick={handleExport}>↓ Export JSON</button>
      <button className="mini-btn" onClick={() => fileRef.current?.click()}>↑ Import JSON</button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
      {msg && <span className="bb-msg">{msg}</span>}
    </div>
  );
}