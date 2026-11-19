import React from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, X } from 'lucide-react';
import { MissingFieldItem } from '../utils/formValidation';

interface MissingFieldsModalProps {
  isOpen: boolean;
  actionLabel: string;
  missingFields: MissingFieldItem[];
  onJumpToField: (elementId: string) => void;
  onProceedAnyway: () => void;
  onClose: () => void;
}

export default function MissingFieldsModal({
  isOpen,
  actionLabel,
  missingFields,
  onJumpToField,
  onProceedAnyway,
  onClose,
}: MissingFieldsModalProps) {
  if (!isOpen || missingFields.length === 0) return null;

  // Group missing fields by blockTitle preserving block order
  const groups: { title: string; items: MissingFieldItem[] }[] = [];
  for (const field of missingFields) {
    let group = groups.find(g => g.title === field.blockTitle);
    if (!group) {
      group = { title: field.blockTitle, items: [] };
      groups.push(group);
    }
    group.items.push(field);
  }

  const firstField = missingFields[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="missing-fields-modal-title"
    >
      <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-amber-200 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 id="missing-fields-modal-title" className="text-base font-bold text-slate-900">
                Nog {missingFields.length} {missingFields.length === 1 ? 'veld' : 'velden'} niet ingevuld
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Voor een volledig en betrouwbaar resultaat bij <strong>{actionLabel}</strong> zijn onderstaande gegevens nog leeg of niet geselecteerd. Klik op een veld om er direct naartoe te springen.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition cursor-pointer"
            aria-label="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto space-y-2.5 pr-1">
          {groups.map(group => (
            <div key={group.title} className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-1.5">
              <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">
                {group.title}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map(item => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => onJumpToField(item.elementId)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-950 bg-white hover:bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-lg transition cursor-pointer shadow-2xs"
                    title={`Spring direct naar ${item.label}`}
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="w-3 h-3 text-amber-600" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            id="btn-jump-first-missing"
            onClick={() => onJumpToField(firstField.elementId)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 transition cursor-pointer shadow-sm"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Ga naar eerste open veld ({firstField.label})</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              id="btn-proceed-anyway"
              onClick={onProceedAnyway}
              className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Toch doorgaan</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Annuleren
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
