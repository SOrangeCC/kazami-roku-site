"use client";

import { useEffect, useState } from "react";
import { Upload, KeyRound, Sparkles, Save, CheckCircle2 } from "lucide-react";

interface ScheduleRow {
  id: number;
  weekLabel: string | null;
  caption: string | null;
  imageUrl: string;
  parsedJson: string | null;
  publishedAt: string;
}

export default function AdminPage() {
  const [token, setToken] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [weekLabel, setWeekLabel] = useState("");
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [latest, setLatest] = useState<ScheduleRow | null>(null);
  const [parsedText, setParsedText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem("roku_admin_token");
    if (saved) setToken(saved);
    loadLatest();
  }, []);

  const loadLatest = async () => {
    try {
      const res = await fetch("/api/schedule/latest", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { latest: ScheduleRow | null };
      setLatest(data.latest);
      if (data.latest?.parsedJson) {
        try {
          setParsedText(
            JSON.stringify(JSON.parse(data.latest.parsedJson), null, 2)
          );
        } catch {
          setParsedText(data.latest.parsedJson);
        }
      } else {
        setParsedText("");
      }
    } catch {
      // Ignore
    }
  };

  const handleTokenChange = (val: string) => {
    setToken(val);
    sessionStorage.setItem("roku_admin_token", val);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (!token.trim()) {
      setError("请先填写 ADMIN_TOKEN");
      return;
    }
    if (!file) {
      setError("请选择周表图片文件");
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      if (weekLabel.trim()) fd.append("week_label", weekLabel.trim());
      if (caption.trim()) fd.append("caption", caption.trim());

      const res = await fetch("/api/admin/schedule", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.trim()}`,
        },
        body: fd,
      });

      const data = (await res.json()) as { error?: string; schedule?: ScheduleRow };
      if (!res.ok) {
        setError(data.error || `上传失败 (${res.status})`);
        return;
      }

      setMessage("周表上传成功！");
      setFile(null);
      setWeekLabel("");
      setCaption("");
      await loadLatest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReparse = async () => {
    if (!latest || !token.trim()) return;
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({ id: latest.id, reparse: true }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error || "重新解析失败");
        return;
      }
      setMessage("已重新调用 Gemini Vision 解析周表！");
      await loadLatest();
    } catch {
      setError("请求失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveJson = async () => {
    if (!latest || !token.trim()) return;
    setError(null);
    setMessage(null);
    let parsedObj: unknown;
    try {
      parsedObj = JSON.parse(parsedText);
    } catch {
      setError("JSON 格式无效，请检查后再保存");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/schedule", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.trim()}`,
        },
        body: JSON.stringify({ id: latest.id, parsed_json: parsedObj }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error || "保存失败");
        return;
      }
      setMessage("解析 JSON 已保存！");
      await loadLatest();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-3xl border border-frost bg-surface p-6 shadow-sm">
        <h1 className="text-xl font-bold text-ink">后台管理 · 周表上传与解析</h1>
        <p className="mt-1 text-xs text-secondary">
          仅用于手动上传本周直播周表图片或调整 Gemini 解析结构
        </p>

        <div className="mt-4">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-ink">
            <KeyRound className="h-3.5 w-3.5 text-primary" />
            <span>ADMIN_TOKEN（仅保存在当前会话 sessionStorage）</span>
          </label>
          <input
            type="password"
            value={token}
            onChange={(e) => handleTokenChange(e.target.value)}
            placeholder="输入服务器 .env 中的 ADMIN_TOKEN"
            className="w-full rounded-xl border border-frost bg-paper px-3.5 py-2 text-sm text-ink focus:border-highlight focus:outline-none"
          />
        </div>
      </div>

      {message && (
        <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      <form
        onSubmit={handleUpload}
        className="space-y-4 rounded-3xl border border-frost bg-surface p-6 shadow-sm"
      >
        <h2 className="text-base font-bold text-ink">上传新周表（覆盖本周）</h2>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-secondary">
            周表图片（PNG / JPG / WebP）
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block w-full text-xs text-secondary file:mr-3 file:rounded-full file:border-0 file:bg-ribbon file:px-4 file:py-2 file:text-xs file:font-semibold file:text-primary hover:file:opacity-90"
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">
              周标签（可选，如 2026-W48）
            </label>
            <input
              type="text"
              value={weekLabel}
              onChange={(e) => setWeekLabel(e.target.value)}
              placeholder="2026-W48"
              className="w-full rounded-xl border border-frost bg-paper px-3 py-2 text-sm text-ink focus:border-highlight focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-secondary">
              动态摘要（可选）
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="本周直播安排~"
              className="w-full rounded-xl border border-frost bg-paper px-3 py-2 text-sm text-ink focus:border-highlight focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
        >
          <Upload className="h-4 w-4" />
          <span>{submitting ? "上传解析中..." : "上传并设为本周周表"}</span>
        </button>
      </form>

      {latest && (
        <div className="space-y-4 rounded-3xl border border-frost bg-surface p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-ink">
                当前生效周表解析结果 (#{latest.id})
              </h2>
              <p className="text-xs text-secondary">
                {latest.weekLabel || "未命名"} ·{" "}
                {new Date(latest.publishedAt).toLocaleString("zh-CN")}
              </p>
            </div>
            <button
              type="button"
              onClick={handleReparse}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 rounded-full border border-frost bg-paper px-3.5 py-1.5 text-xs font-semibold text-primary hover:border-highlight disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>重新调用 Gemini 解析</span>
            </button>
          </div>

          <textarea
            rows={12}
            value={parsedText}
            onChange={(e) => setParsedText(e.target.value)}
            placeholder="暂无 parsed_json（配置 GEMINI_API_KEY 后上传可自动生成，或在此手动粘贴 JSON）"
            className="w-full rounded-2xl border border-frost bg-paper p-3 font-mono text-xs text-ink focus:border-highlight focus:outline-none"
          />

          <button
            type="button"
            onClick={handleSaveJson}
            disabled={submitting || !parsedText.trim()}
            className="inline-flex items-center gap-1.5 rounded-full bg-ribbon px-4 py-2 text-xs font-semibold text-primary transition hover:opacity-90 disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            <span>保存 JSON 修改</span>
          </button>
        </div>
      )}
    </div>
  );
}
