import React from 'react';
import { createPortal } from 'react-dom';
import { CalculationResult } from '../types';
import { formatTvt } from '../utils/calculator';
import { Mail, Sparkles, AlertTriangle, Check, Loader2, Send, FileText, CheckCircle2 } from 'lucide-react';

export interface EmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  calculation: CalculationResult;
  adviceMarkdown: string | null;
}

export type ReportType = 'compact' | 'uitgebreid';

export default function EmailModal({
  isOpen,
  onClose,
  calculation,
  adviceMarkdown
}: EmailModalProps) {
  const [targetEmail, setTargetEmail] = React.useState(calculation.resident.email || '');
  const [reportType, setReportType] = React.useState<ReportType>('compact');
  const [senderOrg, setSenderOrg] = React.useState('Energiecoöperatie Peel en Maas & Gemeente');
  const [coachName, setCoachName] = React.useState(calculation.resident.coach || 'Vrijwillige Energiecoach');
  const [customIntro, setCustomIntro] = React.useState(
    'Hierbij ontvangt u het onafhankelijke verduurzamingsadvies voor uw woning, samengesteld namens de lokale energiecoöperatie en de gemeente. Samen helpen we u met praktische stappen, eerlijke subsidies (ISDE en NIP) en lagere maandlasten.'
  );
  const [includeKeyFigures, setIncludeKeyFigures] = React.useState(true);
  const [sendingEmail, setSendingEmail] = React.useState(false);
  const [emailStatus, setEmailStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [emailStatusMessage, setEmailStatusMessage] = React.useState('');

  // Update targetEmail when calculation data updates
  React.useEffect(() => {
    if (calculation.resident.email) {
      setTargetEmail(calculation.resident.email);
    }
  }, [calculation.resident.email]);

  if (!isOpen) return null;

  const clientName = `${calculation.resident.aanhef || ''} ${calculation.resident.voorletters || ''} ${calculation.resident.achternaam || ''}`.trim() || 'Bewoner';
  const address = `${calculation.resident.straat || ''} ${calculation.resident.huisnummer || ''} ${calculation.resident.toevoeging || ''}, ${calculation.resident.postcode || ''} ${calculation.resident.plaats || ''}`.trim().replace(/^,\s*/, '');

  // Format compact content
  const formatCompactContent = () => {
    const lines = [
      `SAMENVATTING VERDUURZAMINGSADVIES (COMPACT RAPPORT)`,
      `==================================================`,
      `Woning: ${address || 'Uw woning'}`,
      `Bouwjaar: ${calculation.house.bouwjaar || 'Onbekend'} | Energielabel: ${calculation.house.energielabel || 'Onbekend'}`,
      ``,
      `KERNCIJFERS & INVESTERING:`,
      `• Totale bruto kosten maatregelen: € ${Math.round(calculation.totals.bruto).toLocaleString('nl-NL')}`,
      `• Totale subsidies (ISDE + NIP): € ${Math.round(calculation.totals.isde + calculation.totals.nip).toLocaleString('nl-NL')}`,
      `• Netto eigen investering: € ${Math.round(calculation.totals.net).toLocaleString('nl-NL')}`,
      `• Verwachte jaarlijkse energiebesparing: € ${Math.round(calculation.totals.savingsEuro).toLocaleString('nl-NL')} per jaar`,
      `• Gemiddelde terugverdientijd: ${formatTvt(calculation.totals.tvt, calculation.totals.net, calculation.totals.savingsEuro)}`,
      ``
    ];

    if (calculation.measures && calculation.measures.length > 0) {
      lines.push(`AANBEVOLEN ISOLATIEMAATREGELEN:`);
      calculation.measures.forEach(m => {
        lines.push(`- ${m.name} (${m.area} m²): Bruto € ${Math.round(m.brutoCosts).toLocaleString('nl-NL')} | Subsidie € ${Math.round(m.isdeSubsidy + m.nipSubsidy).toLocaleString('nl-NL')} | Netto € ${Math.round(m.netCosts).toLocaleString('nl-NL')} | Besparing € ${Math.round(m.savingEuro).toLocaleString('nl-NL')}/jr (TVT: ${formatTvt(m.tvt, m.netCosts, m.savingEuro, ' jr')})`);
      });
      lines.push(``);
    }

    if (calculation.tech.aantalZonnepanelen > 0) {
      lines.push(`ZONNEPANELEN:`);
      lines.push(`- ${calculation.tech.aantalZonnepanelen} panelen | Verwachte opbrengst: ~${Math.round(calculation.solar.annualYieldKwh).toLocaleString('nl-NL')} kWh/jr`);
      lines.push(``);
    }

    if (calculation.tech.capaciteitAccu > 0) {
      lines.push(`THUISBATTERIJ:`);
      lines.push(`- Capaciteit: ${calculation.tech.capaciteitAccu} kWh (${calculation.tech.typeContract} contract)`);
      lines.push(``);
    }

    if (calculation.heatpump && calculation.heatpump.isRecommended) {
      lines.push(`WARMTEPOMP:`);
      lines.push(`- Advies: ${calculation.heatpump.explanation || 'Geschikt voor hybride of all-electric warmtepomp'}`);
      lines.push(`- Verwachte netto investering: € ${Math.round(calculation.heatpump.estimatedInvestment).toLocaleString('nl-NL')} | Besparing: € ${Math.round(calculation.heatpump.estimatedSavingsEuro).toLocaleString('nl-NL')}/jr`);
      lines.push(``);
    }

    lines.push(`Heeft u vragen over offertes of het aanvragen van subsidies? Neem gerust contact op met de lokale energiecoach.`);
    return lines.join('\n');
  };

  const handleSendEmail = async () => {
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailStatus('error');
      setEmailStatusMessage('Vul a.u.b. een geldig e-mailadres in.');
      return;
    }

    setSendingEmail(true);
    setEmailStatus('idle');
    setEmailStatusMessage('');

    try {
      const keyFigures = includeKeyFigures ? {
        savingsEuro: Math.round(calculation.totals.savingsEuro),
        netInvestment: Math.round(calculation.totals.net),
        totalSubsidies: Math.round(calculation.totals.isde + calculation.totals.nip),
        tvt: formatTvt(calculation.totals.tvt, calculation.totals.net, calculation.totals.savingsEuro),
      } : null;

      const reportContent = reportType === 'uitgebreid' 
        ? (adviceMarkdown || formatCompactContent()) 
        : formatCompactContent();

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: targetEmail,
          clientName: clientName,
          reportText: reportContent,
          reportType: reportType,
          senderOrganization: senderOrg,
          senderCoach: coachName,
          customIntroText: customIntro,
          address: address,
          keyFigures: keyFigures,
          customSubject: `${reportType === 'uitgebreid' ? 'Uitgebreid' : 'Compact'} Verduurzamingsadvies ${address ? `voor ${address}` : `voor ${clientName}`} – ${senderOrg}`
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailStatus('success');
        if (data.isSimulated) {
          setEmailStatusMessage(`Adviesrapport (${reportType === 'uitgebreid' ? 'Uitgebreid' : 'Compact'}) klaargezet voor ${targetEmail} (Simulatiemodus: rapport gelogd op server).`);
        } else {
          setEmailStatusMessage(`Adviesrapport (${reportType === 'uitgebreid' ? 'Uitgebreid' : 'Compact'}) succesvol verzonden naar ${targetEmail}!`);
        }
      } else {
        throw new Error(data.error || 'Er ging iets fout bij het verzenden.');
      }
    } catch (err: any) {
      setEmailStatus('error');
      setEmailStatusMessage(err.message || 'Mislukt om e-mail te verzenden. Controleer de verbinding of server configuratie.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handleMailto = () => {
    const reportSubject = `${reportType === 'uitgebreid' ? 'Uitgebreid' : 'Compact'} Verduurzamingsadvies ${address ? `voor ${address}` : `voor ${clientName}`} – ${senderOrg}`;
    const subject = encodeURIComponent(reportSubject);
    
    const reportBodyText = reportType === 'uitgebreid'
      ? (adviceMarkdown ? `\n--- VOLLEDIG UITGEBREID ADVIESRAPPORT ---\n\n${adviceMarkdown}\n` : formatCompactContent())
      : formatCompactContent();

    const bodyContent = `
Beste ${clientName},

${customIntro}

Hier zijn de belangrijkste uitkomsten van het verduurzamingsadvies voor uw woning (${address || 'uw adres'}):
• Totale bruto kosten: €${Math.round(calculation.totals.bruto).toLocaleString('nl-NL')}
• Totale ISDE subsidie: €${Math.round(calculation.totals.isde).toLocaleString('nl-NL')}
• Totale NIP subsidie: €${Math.round(calculation.totals.nip).toLocaleString('nl-NL')}
• Netto eigen bijdrage: €${Math.round(calculation.totals.net).toLocaleString('nl-NL')}
• Verwachte jaarlijkse besparing: €${Math.round(calculation.totals.savingsEuro).toLocaleString('nl-NL')} / jr
• Gemiddelde terugverdientijd: ${formatTvt(calculation.totals.tvt, calculation.totals.net, calculation.totals.savingsEuro)}

${reportBodyText}

Heeft u vragen over offertes of het aanvragen van subsidies? Neem gerust contact op met de lokale energiecoach.

Met vriendelijke groet,
${coachName}
${senderOrg}
    `.trim();

    const body = encodeURIComponent(bodyContent);
    window.location.href = `mailto:${targetEmail}?subject=${subject}&body=${body}`;
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-150 max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-scaleIn">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 sm:p-5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-white leading-tight">
                Verstuur Adviesrapport naar Bewoner
              </h3>
              <p className="text-xs text-emerald-100 opacity-90">
                Vriendelijk begeleidend sjabloon namens de energiecoöperatie en gemeente
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 space-y-4 overflow-y-auto grow text-slate-700 text-xs">
          
          {/* Keuze Rapport Type: Compact vs Uitgebreid */}
          <div className="bg-gradient-to-r from-slate-50 to-emerald-50/30 p-3.5 rounded-2xl border border-emerald-100/80 space-y-2">
            <label className="text-[10.5px] font-bold text-slate-700 uppercase tracking-wider block">
              1. Kies Type Rapportage
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setReportType('compact')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  reportType === 'compact'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/30'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${reportType === 'compact' ? 'text-white' : 'text-slate-400'}`} />
                    Compact Rapport
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    reportType === 'compact' ? 'bg-emerald-700/60 text-emerald-100' : 'bg-slate-100 text-slate-600'
                  }`}>
                    Aanbevolen
                  </span>
                </div>
                <p className={`text-[11px] leading-snug ${reportType === 'compact' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Overzichtelijk &amp; snel leesbaar met kerncijfers, investering, subsidies en concrete maatregelen.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setReportType('uitgebreid')}
                className={`p-3 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between ${
                  reportType === 'uitgebreid'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm ring-2 ring-emerald-400/30'
                    : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="font-extrabold text-xs flex items-center gap-1.5">
                    <FileText className={`w-3.5 h-3.5 ${reportType === 'uitgebreid' ? 'text-white' : 'text-slate-400'}`} />
                    Uitgebreid Rapport
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    reportType === 'uitgebreid' ? 'bg-emerald-700/60 text-emerald-100' : 'bg-slate-100 text-slate-600'
                  }`}>
                    9-Fasen AI Advies
                  </span>
                </div>
                <p className={`text-[11px] leading-snug ${reportType === 'uitgebreid' ? 'text-emerald-100' : 'text-slate-500'}`}>
                  Volledig gedetailleerd adviesrapport inclusief ISSO-onderbouwing, warmtepomp- en stookgedrag-analyses.
                </p>
              </button>
            </div>
          </div>

          {/* Afzender & Ontvanger details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Ontvanger (E-mailadres bewoner) *
              </label>
              <input
                type="email"
                value={targetEmail}
                onChange={(e) => setTargetEmail(e.target.value)}
                placeholder="bewoner@example.nl"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-500 font-medium"
              />
              <span className="text-[10px] text-slate-400 block">
                Naam: {clientName} {address ? `• ${address}` : ''}
              </span>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Afzender (Organisatie / Coöperatie)
              </label>
              <input
                type="text"
                value={senderOrg}
                onChange={(e) => setSenderOrg(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-500 font-medium"
              />
              <div className="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                <span>Energiecoach:</span>
                <input
                  type="text"
                  value={coachName}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="bijv. Jan Jansen"
                  className="border-b border-slate-300 focus:outline-none focus:border-emerald-500 px-1 py-0.5 text-[10px] grow bg-transparent"
                />
              </div>
            </div>
          </div>

          {/* Vriendelijke Begeleidende Introductietekst */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Vriendelijke Begeleidende Tekst (Sjabloon)
              </label>
              <button
                type="button"
                onClick={() => setCustomIntro(
                  'Hierbij ontvangt u het onafhankelijke verduurzamingsadvies voor uw woning, samengesteld namens de lokale energiecoöperatie en de gemeente. Samen helpen we u met praktische stappen, eerlijke subsidies (ISDE en NIP) en lagere maandlasten.'
                )}
                className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold cursor-pointer"
              >
                Herstel standaardsjabloon
              </button>
            </div>
            <textarea
              rows={3}
              value={customIntro}
              onChange={(e) => setCustomIntro(e.target.value)}
              className="w-full text-xs p-3 border border-slate-200 rounded-xl bg-slate-50/50 focus:bg-white focus:outline-none focus:border-emerald-500 font-normal leading-relaxed resize-none"
              placeholder="Typ hier de begeleidende toelichting..."
            />
          </div>

          {/* Inbegrepen Kerncijfers preview */}
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-emerald-900 text-xs flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Inbegrepen Kerncijfers in de e-mail:
              </span>
              <label className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeKeyFigures}
                  onChange={(e) => setIncludeKeyFigures(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Toon kerncijfers overzicht</span>
              </label>
            </div>

            {includeKeyFigures && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center pt-1">
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Besparing</span>
                  <span className="text-xs font-black text-emerald-700">
                    € {Math.round(calculation.totals.savingsEuro).toLocaleString('nl-NL')}/jr
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Netto Investering</span>
                  <span className="text-xs font-black text-slate-800">
                    € {Math.round(calculation.totals.net).toLocaleString('nl-NL')}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Subsidies (ISDE+NIP)</span>
                  <span className="text-xs font-black text-blue-600">
                    € {Math.round(calculation.totals.isde + calculation.totals.nip).toLocaleString('nl-NL')}
                  </span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-emerald-100">
                  <span className="text-[9px] text-slate-400 block font-bold uppercase">Terugverdientijd</span>
                  <span className="text-xs font-black text-amber-600">
                    {formatTvt(calculation.totals.tvt, calculation.totals.net, calculation.totals.savingsEuro)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Status notificaties */}
          {emailStatusMessage && (
            <div className={`p-3 rounded-xl text-xs leading-relaxed border flex items-start gap-2 ${
              emailStatus === 'success' 
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200' 
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}>
              {emailStatus === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <span>{emailStatusMessage}</span>
            </div>
          )}

        </div>

        {/* Modal Footer met verzendknoppen */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <span className="text-[11px] text-slate-400 text-center sm:text-left">
            Geselecteerd: <strong>{reportType === 'uitgebreid' ? 'Uitgebreid Rapport (9-fasen)' : 'Compact Rapport (Overzicht)'}</strong>
          </span>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleMailto}
              className="flex items-center justify-center gap-1.5 bg-white hover:bg-slate-100 active:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 px-3.5 rounded-xl border border-slate-200 transition cursor-pointer"
              title="Open in uw standaard e-mailprogramma"
            >
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              <span>Eigen Mailer</span>
            </button>

            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sendingEmail || !targetEmail}
              className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition cursor-pointer disabled:cursor-not-allowed grow sm:grow-0"
            >
              {sendingEmail ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verzenden...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Verstuur {reportType === 'uitgebreid' ? 'Uitgebreid' : 'Compact'}</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
