import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import api from '../api';
import type { NotificationTemplateKind } from '../lib/notifications';

type Props = {
  label: string;
  hint?: string;
  kind: NotificationTemplateKind;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  aiEndpoint: string;
  onError: (msg: string) => void;
};

export default function AiTemplateField({
  label,
  hint,
  kind,
  value,
  onChange,
  multiline = false,
  aiEndpoint,
  onError,
}: Props) {
  const [editing, setEditing] = useState(() => value.trim().length > 0);
  const [generating, setGenerating] = useState(false);

  const generateWithAi = async () => {
    setGenerating(true);
    try {
      const res = await api.post(aiEndpoint, { kind });
      const text = (res.data.data as { text?: string })?.text ?? '';
      if (!text) {
        onError('AI boş yanıt döndü.');
        return;
      }
      onChange(text);
      setEditing(true);
    } catch (err: unknown) {
      const m = err as { response?: { data?: { message?: string } } };
      onError(m.response?.data?.message || 'AI şablon üretilemedi.');
    } finally {
      setGenerating(false);
    }
  };

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary dark:border-slate-700 dark:bg-slate-900';

  return (
    <div className="rounded-xl border border-slate-200/90 bg-white p-4 dark:border-slate-700 dark:bg-slate-900/50">
      <motion.div layout className="flex flex-wrap items-start justify-between gap-2">
        <motion.div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{label}</p>
          {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
        </motion.div>
        {!editing ? (
          <button
            type="button"
            onClick={() => void generateWithAi()}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {generating ? 'Oluşturuluyor…' : 'AI ile oluştur'}
          </button>
        ) : null}
      </motion.div>

      {editing ? (
        <div className="mt-3 space-y-2">
          {multiline ? (
            <textarea
              rows={3}
              className={inputClass}
              value={value}
              onChange={(e) => onChange(e.target.value)}
            />
          ) : (
            <input type="text" className={inputClass} value={value} onChange={(e) => onChange(e.target.value)} />
          )}
          <button
            type="button"
            onClick={() => void generateWithAi()}
            disabled={generating}
            className="text-xs font-semibold text-violet-600 hover:underline dark:text-violet-400"
          >
            {generating ? 'Yeniden oluşturuluyor…' : 'AI ile yeniden oluştur'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
