import React, { useEffect, useState } from 'react';
import { ResidentData, HouseData, InsulationData, TechData } from '../types';
import { 
  User, Home, Layers, Battery, Sun, HelpCircle, 
  Sparkles, RefreshCw, FileText, Calendar, MapPin, 
  Phone, Mail, CheckCircle2, ChevronRight, AlertCircle, Info, Zap
} from 'lucide-react';

interface InputFormProps {
  resident: ResidentData;
  setResident: React.Dispatch<React.SetStateAction<ResidentData>>;
  house: HouseData;
  setHouse: React.Dispatch<React.SetStateAction<HouseData>>;
  insulation: InsulationData;
  setInsulation: React.Dispatch<React.SetStateAction<InsulationData>>;
  tech: TechData;
  setTech: React.Dispatch<React.SetStateAction<TechData>>;
  onGenerate: () => void;
  loading: boolean;
}

export default function InputForm({
  resident,
  setResident,
  house,
  setHouse,
  insulation,
  setInsulation,
  tech,
  setTech,
  onGenerate,
  loading
}: InputFormProps) {
  const [fetchingBag, setFetchingBag] = useState(false);
  const [bagSuccess, setBagSuccess] = useState<boolean | null>(null);

  // Auto update registration code when postcode, house number or addition changes
  useEffect(() => {
    const pc = resident.postcode.replace(/\s/g, '').toUpperCase();
    const nr = resident.huisnummer;
    const tv = resident.toevoeging;
    setResident(prev => ({
      ...prev,
      registratiecode: pc + nr + tv
    }));
  }, [resident.postcode, resident.huisnummer, resident.toevoeging]);

  // BAG & EP-Online fetch
  const autoFetchBag = async () => {
    const pc = resident.postcode.replace(/\s/g, '').toUpperCase();
    const nr = resident.huisnummer;

    if (pc.length >= 4 && nr.length >= 1) {
      setFetchingBag(true);
      setBagSuccess(null);
      
      // 1. Kadaster BAG Fetch
      try {
        const kadasterKey = "l7a22b73157f084f1b9dbb5caeba5d1047";
        const url = `https://api.bag.kadaster.nl/lvbag/individuelebevragingen/v2/adressenuitgebreid?postcode=${pc}&huisnummer=${nr}`;
        const response = await fetch(url, { 
          headers: { 
            "X-Api-Key": kadasterKey, 
            "Accept-Crs": "epsg:28992" 
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data._embedded && data._embedded.adressen && data._embedded.adressen.length > 0) {
            const adres = data._embedded.adressen[0];
            const straat = adres.openbareRuimteNaam || '';
            const plaats = adres.woonplaatsNaam || '';
            
            let bouwjaar = adres.oorspronkelijkBouwjaar || 0;
            if (!bouwjaar && adres.panden && adres.panden[0]) {
              bouwjaar = Array.isArray(adres.panden[0].oorspronkelijkBouwjaar) 
                ? adres.panden[0].oorspronkelijkBouwjaar[0] 
                : adres.panden[0].oorspronkelijkBouwjaar;
            }

            let opp = adres.gebruiksoppervlakte || adres.oppervlakte || 0;
            if (!opp && adres.adresseerbaarObject) {
              opp = adres.adresseerbaarObject.gebruiksoppervlakte || adres.adresseerbaarObject.oppervlakte || 0;
            }

            setResident(prev => ({
              ...prev,
              straat,
              plaats: ['Baarlo', 'Beringe', 'Egchel', 'Grashoek', 'Helden', 'Kessel', 'Kessel-Eik', 'Koningslust', 'Maasbree', 'Meijel', 'Panningen'].includes(plaats) ? plaats : prev.plaats
            }));

            setHouse(prev => ({
              ...prev,
              bouwjaar: bouwjaar || prev.bouwjaar,
              woonoppervlakte: opp || prev.woonoppervlakte
            }));
            
            setBagSuccess(true);
          }
        }
      } catch (error) {
        console.warn("Kadaster API error", error);
      }

      // 2. EP-Online Fetch
      try {
        const epOnlineKey = "MjVDQTk3N0FCNzQ4MEMwOUZFOUNFODA4OTg3QTJDRDZCQjY2Mjk0MTBEMjE0NDg5NDE2RERFOTgwNDE3NDc0MzlBM0VFOTREQUQzOUJFNDgwM0REM0MyOTg3RTBCQTk4"; 
        const epUrl = `https://public.ep-online.nl/api/v5/PandEnergielabel/Adres?postcode=${pc}&huisnummer=${nr}`;
        const epResponse = await fetch(epUrl, { headers: { "Authorization": epOnlineKey } });

        if (epResponse.ok) {
          const epData = await epResponse.json();
          if (epData && epData.length > 0) {
            const labelLetter = epData[0].labelLetter || epData[0].labelKlasse || epData[0].energieklasse || "";
            if (labelLetter) {
              const l = labelLetter.toUpperCase();
              let formattedLabel: any = 'Geen';
              if (l.includes("A") || l.includes("B") || l.includes("C")) formattedLabel = "A - B - C";
              else if (l.includes("D")) formattedLabel = "D";
              else if (l.includes("E")) formattedLabel = "E";
              else if (l.includes("F")) formattedLabel = "F";
              else if (l.includes("G")) formattedLabel = "G";

              setHouse(prev => ({
                ...prev,
                energielabel: formattedLabel
              }));
            }
          }
        }
      } catch (error) {
        console.warn("EP-Online API error", error);
      }

      setFetchingBag(false);
    }
  };

  // Presets
  const applyPreset = (type: '70s' | '90s' | 'modern') => {
    if (type === '70s') {
      setResident({
        naam: 'Jan Janssen',
        registratiecode: 'PM-70TJ-88',
        brutoGezinsinkomen: 45000,
        coach: 'Online Zelfscan',
        datum: '2026-04-24',
        aanhef: 'De heer',
        voorletters: 'J.',
        achternaam: 'Janssen',
        straat: 'Kerkstraat',
        huisnummer: '45',
        toevoeging: '',
        postcode: '5981AD',
        plaats: 'Panningen',
        aantalPersonen: 2,
        telefoon: '0612345678',
        email: 'jan@janssen.nl',
        akkoord: true
      });
      setHouse({
        wozWaarde: 325000,
        energielabel: 'E',
        verbruikKwh: 3200,
        verbruikM3: 1600,
        soortWoning: 'Twee onder een kap',
        bouwjaar: 1974,
        woonoppervlakte: 120,
        verwarming: 'CV-ketel',
        afgiftesysteem: 'Radiatoren',
        tapwater: 'CV-ketel',
        koken: 'Gas',
        ventilatie: 'Natuurlijk (Type A)',
        zonnepanelenPresent: 'Nee',
        elektraPrijs: 0.30,
        elektraTeruglevering: 0,
        gasPrijs: 1.30,
        stookgedragOverride: 'auto',
        stookgedragBerekend: 'Normaal (1.0x)',
        stookgedragFactor: 1.0,
        isoDak: 'slecht',
        isoGevel: 'slecht',
        isoGlasBg: 'slecht',
        isoGlasVd: 'slecht',
        isoVloer: 'slecht',
        isoKieren: 'Nee, onderhoud nodig',
        inkomenCheck: true
      });
      setInsulation({
        vloer: 0,
        bodem: 0,
        spouw: 60,
        zolderVliering: 40,
        dakBinnenzijde: 0,
        gevelBuitenzijde: 0,
        glasEnkelHR: 12,
        glasDubbelHR: 0,
        glasTripleHout: 0,
      });
      setTech({
        aantalZonnepanelen: 4,
        dakOrientatie: 45, // South-West
        huidigDirectVerbruik: 30,
        capaciteitAccu: 0,
        omzettingsverliezen: 10,
        typeContract: 'Vast',
      });
    } else if (type === '90s') {
      setResident({
        naam: 'Familie Smeets',
        registratiecode: 'PM-90HW-42',
        brutoGezinsinkomen: 72000,
        coach: 'Online Zelfscan',
        datum: '2026-04-24',
        aanhef: 'De heer en mevrouw',
        voorletters: 'H. & M.',
        achternaam: 'Smeets',
        straat: 'Rijksweg',
        huisnummer: '12',
        toevoeging: 'A',
        postcode: '5991BC',
        plaats: 'Baarlo',
        aantalPersonen: 4,
        telefoon: '0687654321',
        email: 'info@smeets.nl',
        akkoord: true
      });
      setHouse({
        wozWaarde: 410000,
        energielabel: 'D',
        verbruikKwh: 3800,
        verbruikM3: 1200,
        soortWoning: 'Vrijstaand',
        bouwjaar: 1994,
        woonoppervlakte: 160,
        verwarming: 'CV-ketel',
        afgiftesysteem: 'Radiatoren',
        tapwater: 'CV-ketel',
        koken: 'Inductie',
        ventilatie: 'Mechanisch (Type C)',
        zonnepanelenPresent: 'Ja',
        elektraPrijs: 0.28,
        elektraTeruglevering: 1500,
        gasPrijs: 1.30,
        stookgedragOverride: 'auto',
        stookgedragBerekend: 'Normaal (1.0x)',
        stookgedragFactor: 1.0,
        isoDak: 'slecht',
        isoGevel: 'slecht',
        isoGlasBg: 'matig',
        isoGlasVd: 'slecht',
        isoVloer: 'slecht',
        isoKieren: 'Ja, in orde',
        inkomenCheck: false
      });
      setInsulation({
        vloer: 50,
        bodem: 0,
        spouw: 0,
        zolderVliering: 0,
        dakBinnenzijde: 50,
        gevelBuitenzijde: 0,
        glasEnkelHR: 0,
        glasDubbelHR: 15,
        glasTripleHout: 0,
      });
      setTech({
        aantalZonnepanelen: 10,
        dakOrientatie: 0, // South
        huidigDirectVerbruik: 35,
        capaciteitAccu: 5,
        omzettingsverliezen: 8,
        typeContract: 'Dynamisch',
      });
    } else if (type === 'modern') {
      setResident({
        naam: 'Anouk de Vries',
        registratiecode: 'PM-20VS-11',
        brutoGezinsinkomen: 58000,
        coach: 'Online Zelfscan',
        datum: '2026-04-24',
        aanhef: 'Mevrouw',
        voorletters: 'A.',
        achternaam: 'de Vries',
        straat: 'Maasstraat',
        huisnummer: '8',
        toevoeging: '',
        postcode: '5995XH',
        plaats: 'Kessel',
        aantalPersonen: 1,
        telefoon: '0655443322',
        email: 'anouk@devries.nl',
        akkoord: true
      });
      setHouse({
        wozWaarde: 510000,
        energielabel: 'A - B - C',
        verbruikKwh: 2800,
        verbruikM3: 400,
        soortWoning: 'Hoekwoning',
        bouwjaar: 2012,
        woonoppervlakte: 110,
        verwarming: 'Hybride warmtepomp',
        afgiftesysteem: 'Vloerverwarming',
        tapwater: 'Warmtepompboiler',
        koken: 'Inductie',
        ventilatie: 'Balans (Type D/WTW)',
        zonnepanelenPresent: 'Ja',
        elektraPrijs: 0.25,
        elektraTeruglevering: 3000,
        gasPrijs: 1.30,
        stookgedragOverride: 'auto',
        stookgedragBerekend: 'Zuinig (0.7x)',
        stookgedragFactor: 0.7,
        isoDak: 'goed',
        isoGevel: 'goed',
        isoGlasBg: 'goed',
        isoGlasVd: 'goed',
        isoVloer: 'goed',
        isoKieren: 'Ja, in orde',
        inkomenCheck: true
      });
      setInsulation({
        vloer: 0,
        bodem: 0,
        spouw: 0,
        zolderVliering: 0,
        dakBinnenzijde: 0,
        gevelBuitenzijde: 0,
        glasEnkelHR: 0,
        glasDubbelHR: 0,
        glasTripleHout: 0,
      });
      setTech({
        aantalZonnepanelen: 14,
        dakOrientatie: -90, // East
        huidigDirectVerbruik: 40,
        capaciteitAccu: 10,
        omzettingsverliezen: 5,
        typeContract: 'Dynamisch',
      });
    }
  };

  // Quick lookup links
  const openWoz = (e: any) => {
    e.preventDefault();
    const pc = resident.postcode.trim();
    const nr = resident.huisnummer.trim();
    const tv = resident.toevoeging.trim();
    const fullAdres = `${pc} ${nr} ${tv}`.trim();
    if (fullAdres) {
      navigator.clipboard.writeText(fullAdres).then(() => {
        alert("✅ Postcode en huisnummer zijn gekopieerd naar je klembord!\n\nJe kunt dit direct Plakken (Ctrl+V) in het WOZ-waardeloket.");
        window.open('https://www.wozwaardeloket.nl/', '_blank');
      }).catch(() => {
        window.open('https://www.wozwaardeloket.nl/', '_blank');
      });
    } else {
      window.open('https://www.wozwaardeloket.nl/', '_blank');
    }
  };

  const openEpOnline = (e: any) => {
    e.preventDefault();
    const pc = resident.postcode.trim();
    const nr = resident.huisnummer.trim();
    const tv = resident.toevoeging.trim();
    const fullAdres = `${pc} ${nr} ${tv}`.trim();
    if (fullAdres) {
      navigator.clipboard.writeText(fullAdres).then(() => {
        alert("✅ Postcode en huisnummer zijn gekopieerd naar je klembord!\n\nJe kunt dit direct Plakken (Ctrl+V) op de EP-Online website.");
        window.open('https://www.ep-online.nl/', '_blank');
      }).catch(() => {
        window.open('https://www.ep-online.nl/', '_blank');
      });
    } else {
      window.open('https://www.ep-online.nl/', '_blank');
    }
  };

  return (
    <div className="space-y-6" id="input-form">
      {/* Snelkoppelingen Presets */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-emerald-500" />
          Snel Woning-profiel Laden
        </h3>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => applyPreset('70s')}
            className="flex flex-col items-center justify-center p-3 text-xs font-medium border border-orange-100 bg-orange-50/40 text-orange-800 rounded-xl hover:bg-orange-50 transition"
            id="preset-70s-btn"
          >
            <span className="font-bold">Jaren &apos;70</span>
            <span className="text-[10px] text-orange-600/85">Label E • Matig</span>
          </button>
          <button
            onClick={() => applyPreset('90s')}
            className="flex flex-col items-center justify-center p-3 text-xs font-medium border border-amber-100 bg-amber-50/40 text-amber-800 rounded-xl hover:bg-amber-50 transition"
            id="preset-90s-btn"
          >
            <span className="font-bold">Jaren &apos;90</span>
            <span className="text-[10px] text-amber-600/85">Label D • Gemiddeld</span>
          </button>
          <button
            onClick={() => applyPreset('modern')}
            className="flex flex-col items-center justify-center p-3 text-xs font-medium border border-emerald-100 bg-emerald-50/40 text-emerald-800 rounded-xl hover:bg-emerald-50 transition"
            id="preset-modern-btn"
          >
            <span className="font-bold">Nieuwer</span>
            <span className="text-[10px] text-emerald-600/85">Label A • Goed</span>
          </button>
        </div>
      </div>

      {/* 1. Berekening & Metadata */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-700">1. Berekeningsgegevens</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Datum</label>
              <input
                type="date"
                value={resident.datum}
                onChange={(e) => setResident(prev => ({ ...prev, datum: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-emerald-500"
                id="datum"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Berekeningswijze</label>
              <input
                type="text"
                value="Online Zelfscan (NTA 8800)"
                disabled
                className="w-full text-sm bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 text-slate-500 cursor-not-allowed font-medium"
                id="coach"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bewoner & Adres (BAG API!) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-semibold text-slate-700">2. Bewoners & Adres Gegevens</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-2.5 py-1 rounded-full uppercase tracking-wider font-mono">
            {resident.registratiecode || "PM-CONCEPT"}
          </span>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-emerald-50/50 rounded-xl p-4 border border-emerald-100/50 space-y-3">
            <p className="text-[11px] text-emerald-800 leading-normal">
              Vul postcode en huisnummer in. De adresgegevens, het bouwjaar, oppervlak én het <strong>Energielabel</strong> (EP-Online) worden automatisch ingeladen.
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Postcode</label>
                <input
                  type="text"
                  value={resident.postcode}
                  onChange={(e) => setResident(prev => ({ ...prev, postcode: e.target.value.toUpperCase() }))}
                  onBlur={autoFetchBag}
                  placeholder="5981AD"
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-emerald-500 uppercase text-center"
                  id="postcode"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Huisnummer</label>
                <input
                  type="text"
                  value={resident.huisnummer}
                  onChange={(e) => setResident(prev => ({ ...prev, huisnummer: e.target.value }))}
                  onBlur={autoFetchBag}
                  placeholder="12"
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-emerald-500 text-center"
                  id="huisnummer"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Toev.</label>
                <input
                  type="text"
                  value={resident.toevoeging}
                  onChange={(e) => setResident(prev => ({ ...prev, toevoeging: e.target.value }))}
                  onBlur={autoFetchBag}
                  placeholder="A"
                  className="w-full text-sm bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-semibold text-slate-800 focus:outline-emerald-500 text-center"
                  id="toev"
                />
              </div>
            </div>
            {fetchingBag && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                <RefreshCw className="w-3 h-3 animate-spin text-emerald-500" />
                <span>BAG en EP-Online opzoeken...</span>
              </div>
            )}
            {bagSuccess && (
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 fill-emerald-100" />
                <span>Adresgegevens succesvol aangevuld!</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Aanhef</label>
              <select
                value={resident.aanhef}
                onChange={(e) => setResident(prev => ({ ...prev, aanhef: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="aanhef"
              >
                <option>De heer</option>
                <option>Mevrouw</option>
                <option>De heer en mevrouw</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Voorletters</label>
              <input
                type="text"
                value={resident.voorletters}
                onChange={(e) => setResident(prev => ({ ...prev, voorletters: e.target.value, naam: `${e.target.value} ${prev.achternaam}`.trim() }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                placeholder="Bijv. J."
                id="voorletters"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Achternaam</label>
              <input
                type="text"
                value={resident.achternaam}
                onChange={(e) => setResident(prev => ({ ...prev, achternaam: e.target.value, naam: `${prev.voorletters} ${e.target.value}`.trim() }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                placeholder="Bijv. Janssen"
                id="achternaam"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Straat</label>
              <input
                type="text"
                value={resident.straat}
                onChange={(e) => setResident(prev => ({ ...prev, straat: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="straat"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Plaats</label>
              <select
                value={resident.plaats}
                onChange={(e) => setResident(prev => ({ ...prev, plaats: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="plaats"
              >
                <option value="">-- Selecteer Kern --</option>
                {['Baarlo', 'Beringe', 'Egchel', 'Grashoek', 'Helden', 'Kessel', 'Kessel-Eik', 'Koningslust', 'Maasbree', 'Meijel', 'Panningen'].map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Telefoon / mobiel</label>
              <input
                type="tel"
                value={resident.telefoon}
                onChange={(e) => setResident(prev => ({ ...prev, telefoon: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                placeholder="0612345678"
                id="telefoon"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">E-mailadres</label>
              <input
                type="email"
                value={resident.email}
                onChange={(e) => setResident(prev => ({ ...prev, email: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                placeholder="naam@voorbeeld.nl"
                id="email"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <input
              type="checkbox"
              checked={resident.akkoord}
              onChange={(e) => setResident(prev => ({ ...prev, akkoord: e.target.checked }))}
              className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
              id="akkoord"
            />
            <label htmlFor="akkoord" className="text-[11px] font-medium text-slate-600 select-none cursor-pointer">
              Akkoord met AVG gegevensverwerking gemeente Peel en Maas
            </label>
          </div>
        </div>
      </div>

      {/* 3. Woning Kenmerken & Installaties */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Home className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-700">3. Woning &amp; Huidige Installaties</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Soort woning</label>
              <select
                value={house.soortWoning}
                onChange={(e) => setHouse(prev => ({ ...prev, soortWoning: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="soort_woning"
              >
                <option value="">-- Selecteer --</option>
                <option>Vrijstaand</option>
                <option>Twee onder een kap</option>
                <option>Hoekwoning</option>
                <option>Tussenwoning</option>
                <option>Appartement</option>
                <option>Benedenwoning</option>
                <option>Bovenwoning</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Bouwjaar</label>
              <input
                type="number"
                value={house.bouwjaar || ''}
                onChange={(e) => setHouse(prev => ({ ...prev, bouwjaar: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                placeholder="Bijv. 1978"
                id="bouwjaar"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Woonoppervlakte (m²)</label>
              <input
                type="number"
                value={house.woonoppervlakte || ''}
                onChange={(e) => setHouse(prev => ({ ...prev, woonoppervlakte: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                placeholder="Bijv. 115"
                id="woonopp"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Aantal bewoners</label>
              <input
                type="number"
                value={resident.aantalPersonen || ''}
                onChange={(e) => setResident(prev => ({ ...prev, aantalPersonen: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                placeholder="Bijv. 2"
                id="aantal_personen"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5 flex justify-between">
                <span>WOZ-waarde (€)</span>
                <a href="#" onClick={openWoz} className="text-[10px] text-emerald-600 hover:underline">🔗 Zoek op</a>
              </label>
              <input
                type="number"
                value={house.wozWaarde || ''}
                onChange={(e) => setHouse(prev => ({ ...prev, wozWaarde: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-semibold text-slate-800 focus:outline-emerald-500"
                placeholder="Bijv. 385000"
                id="woz_waarde"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-0.5 flex justify-between">
                <span>Energielabel</span>
                <a href="#" onClick={openEpOnline} className="text-[10px] text-emerald-600 hover:underline">🔗 Zoek op</a>
              </label>
              <select
                value={house.energielabel}
                onChange={(e) => setHouse(prev => ({ ...prev, energielabel: e.target.value as any }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-semibold text-slate-800 focus:outline-emerald-500"
                id="energielabel"
              >
                <option value="Geen">Label Geen</option>
                <option value="A - B - C">Label A - B - C</option>
                <option value="D">Label D</option>
                <option value="E">Label E</option>
                <option value="F">Label F</option>
                <option value="G">Label G</option>
              </select>
            </div>
          </div>

          {/* Installaties subgrid */}
          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Verwarming</label>
              <select
                value={house.verwarming}
                onChange={(e) => setHouse(prev => ({ ...prev, verwarming: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="verwarming"
              >
                <option value="">-- Selecteer --</option>
                <option>CV-ketel</option>
                <option>Hybride warmtepomp</option>
                <option>Full electric</option>
                <option>Andere</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Afgiftesysteem</label>
              <select
                value={house.afgiftesysteem}
                onChange={(e) => setHouse(prev => ({ ...prev, afgiftesysteem: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="afgiftesysteem"
              >
                <option value="">-- Selecteer --</option>
                <option>Radiatoren</option>
                <option>Vloerverwarming</option>
                <option>LTV</option>
                <option>Airco</option>
                <option>Andere</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tapwater</label>
              <select
                value={house.tapwater}
                onChange={(e) => setHouse(prev => ({ ...prev, tapwater: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="tapwater"
              >
                <option value="">-- Selecteer --</option>
                <option>CV-ketel</option>
                <option>Boiler (gas)</option>
                <option>Boiler (elektrisch)</option>
                <option>Zonneboiler</option>
                <option>Warmtepompboiler</option>
                <option>Andere</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Koken op</label>
              <select
                value={house.koken}
                onChange={(e) => setHouse(prev => ({ ...prev, koken: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="koken"
              >
                <option value="">-- Selecteer --</option>
                <option>Gas</option>
                <option>Elektrisch</option>
                <option>Inductie</option>
                <option>Andere</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ventilatie</label>
              <select
                value={house.ventilatie}
                onChange={(e) => setHouse(prev => ({ ...prev, ventilatie: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="ventilatie"
              >
                <option value="">-- Selecteer --</option>
                <option>Natuurlijk (Type A)</option>
                <option>Mechanisch (Type C)</option>
                <option>Balans (Type D/WTW)</option>
                <option>Anders</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Al zonnepanelen aanwezig?</label>
              <select
                value={house.zonnepanelenPresent}
                onChange={(e) => setHouse(prev => ({ ...prev, zonnepanelenPresent: e.target.value as any }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="zonnepanelen"
              >
                <option value="Nee">Nee</option>
                <option value="Ja">Ja</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Energie verbruik en kosten */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-700">4. Energieverbruik &amp; Stookgedrag (Jaarrekening)</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Elektra (kWh)</label>
              <input
                type="number"
                value={house.verbruikKwh || ''}
                onChange={(e) => setHouse(prev => ({ ...prev, verbruikKwh: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-800 focus:outline-emerald-500"
                id="elektra_verbruik"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Prijs (€/kWh)</label>
              <input
                type="number"
                value={house.elektraPrijs || ''}
                onChange={(e) => setHouse(prev => ({ ...prev, elektraPrijs: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-800 focus:outline-emerald-500"
                step="0.01"
                id="elektra_prijs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Teruglevering</label>
              <input
                type="number"
                value={house.elektraTeruglevering || ''}
                onChange={(e) => setHouse(prev => ({ ...prev, elektraTeruglevering: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-slate-800 focus:outline-emerald-500"
                id="elektra_teruglevering"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Gasverbruik (m³)</label>
              <input
                type="number"
                value={house.verbruikM3 || ''}
                onChange={(e) => setHouse(prev => ({ ...prev, verbruikM3: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="gas_totaal"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Gas prijs (€/m³)</label>
              <input
                type="number"
                value={house.gasPrijs || ''}
                onChange={(e) => setHouse(prev => ({ ...prev, gasPrijs: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                step="0.01"
                id="gas_prijs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center gap-1">
                <span>Stookgedrag (Auto)</span>
                <span className="group relative inline-block text-slate-400 hover:text-slate-600 cursor-pointer">
                  <Info className="w-3.5 h-3.5" />
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block w-48 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg z-20 font-normal normal-case">
                    Vergelijkt gasverbruik met het theoretische verbruik op basis van de NTA 8800.
                  </span>
                </span>
              </label>
              <input
                type="text"
                value={house.stookgedragBerekend || 'Vul in...'}
                readOnly
                className="w-full text-sm bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-2 font-bold text-emerald-800"
                id="stookgedrag_berekend"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Correctie / Forceer</label>
              <select
                value={house.stookgedragOverride}
                onChange={(e) => setHouse(prev => ({ ...prev, stookgedragOverride: e.target.value as any }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="stookgedrag_override"
              >
                <option value="auto">Berekend (Auto)</option>
                <option value="normaal">Forceer: Normaal (1.0x)</option>
                <option value="zuinig">Forceer: Zuinig (0.7x)</option>
                <option value="minimaal">Forceer: Minimaal (0.4x)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Huidige Isolatie Status & NIP Check */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-700">5. Huidige Isolatie Status</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Dakisolatie</label>
              <select
                value={house.isoDak}
                onChange={(e) => setHouse(prev => ({ ...prev, isoDak: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="iso_dak"
              >
                <option value="">-- Selecteer --</option>
                <option value="slecht">Geen</option>
                <option value="slecht">Matig</option>
                <option value="goed">Goed</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Gevelisolatie</label>
              <select
                value={house.isoGevel}
                onChange={(e) => setHouse(prev => ({ ...prev, isoGevel: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="iso_gevel"
              >
                <option value="">-- Selecteer --</option>
                <option value="slecht">Geen</option>
                <option value="slecht">Spouwmuurisolatie (Oud)</option>
                <option value="goed">Binnenisolatie</option>
                <option value="goed">Buitenisolatie</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Glas (begane grond)</label>
              <select
                value={house.isoGlasBg}
                onChange={(e) => setHouse(prev => ({ ...prev, isoGlasBg: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="iso_glas_bg"
              >
                <option value="">-- Selecteer --</option>
                <option value="slecht">Enkel</option>
                <option value="slecht">Dubbel</option>
                <option value="matig">HR</option>
                <option value="goed">HR++</option>
                <option value="goed">Triple</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Glas (verdieping)</label>
              <select
                value={house.isoGlasVd}
                onChange={(e) => setHouse(prev => ({ ...prev, isoGlasVd: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="iso_glas_vd"
              >
                <option value="">-- Selecteer --</option>
                <option value="slecht">Enkel</option>
                <option value="slecht">Dubbel</option>
                <option value="matig">HR</option>
                <option value="goed">HR++</option>
                <option value="goed">Triple</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Vloer / Bodem</label>
              <select
                value={house.isoVloer}
                onChange={(e) => setHouse(prev => ({ ...prev, isoVloer: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="iso_vloer"
              >
                <option value="">-- Selecteer --</option>
                <option value="slecht">Geen vloer</option>
                <option value="slecht">Matig vloer</option>
                <option value="goed">Goed vloer</option>
                <option value="slecht">Geen bodem</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Naden/kieren in orde?</label>
              <select
                value={house.isoKieren}
                onChange={(e) => setHouse(prev => ({ ...prev, isoKieren: e.target.value }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                id="iso_kieren"
              >
                <option value="">-- Selecteer --</option>
                <option>Ja, in orde</option>
                <option>Nee, onderhoud nodig</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
            <input
              type="checkbox"
              checked={house.inkomenCheck}
              onChange={(e) => setHouse(prev => ({ ...prev, inkomenCheck: e.target.checked }))}
              className="accent-emerald-600 w-4 h-4 rounded cursor-pointer"
              id="inkomen_check"
            />
            <label htmlFor="inkomen_check" className="text-[11px] font-bold text-emerald-800 select-none cursor-pointer">
              Gezinsinkomen-verklaring lager dan € 60.000 gecontroleerd
            </label>
          </div>
        </div>
      </div>

      {/* 6. Ingemeten isolatie oppervlakten (m2) */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Layers className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-700">6. Ingemeten Isolatie Oppervlakten (m²)</h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Vloer (onder)</label>
              <input
                type="number"
                value={insulation.vloer || ''}
                onChange={(e) => setInsulation(prev => ({ ...prev, vloer: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                id="m_vloer_ond"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Bodem (chips)</label>
              <input
                type="number"
                value={insulation.bodem || ''}
                onChange={(e) => setInsulation(prev => ({ ...prev, bodem: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                id="m_bodem"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Spouwmuur</label>
              <input
                type="number"
                value={insulation.spouw || ''}
                onChange={(e) => setInsulation(prev => ({ ...prev, spouw: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                id="m_spouw"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Zoldervloer</label>
              <input
                type="number"
                value={insulation.zolderVliering || ''}
                onChange={(e) => setInsulation(prev => ({ ...prev, zolderVliering: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                id="m_zolder"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Dak binnen</label>
              <input
                type="number"
                value={insulation.dakBinnenzijde || ''}
                onChange={(e) => setInsulation(prev => ({ ...prev, dakBinnenzijde: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                id="m_dak_bin"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Gevel buiten</label>
              <input
                type="number"
                value={insulation.gevelBuitenzijde || ''}
                onChange={(e) => setInsulation(prev => ({ ...prev, gevelBuitenzijde: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                id="m_gev_bui"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Enkel → HR++</label>
              <input
                type="number"
                value={insulation.glasEnkelHR || ''}
                onChange={(e) => setInsulation(prev => ({ ...prev, glasEnkelHR: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                id="m_glas_enk_hr"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Dubbel → HR++</label>
              <input
                type="number"
                value={insulation.glasDubbelHR || ''}
                onChange={(e) => setInsulation(prev => ({ ...prev, glasDubbelHR: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                id="m_glas_dub_hr"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-0.5">Triple + Hout</label>
              <input
                type="number"
                value={insulation.glasTripleHout || ''}
                onChange={(e) => setInsulation(prev => ({ ...prev, glasTripleHout: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-center text-slate-800 focus:outline-emerald-500 font-semibold"
                id="m_glas_trip"
                placeholder="0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 7. Zonnepanelen & Accu */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
          <Sun className="w-4 h-4 text-emerald-600" />
          <h3 className="text-sm font-semibold text-slate-700">7. Zonnepanelen &amp; Accu Instellingen</h3>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-500">Aantal zonnepanelen</label>
              <span className="text-sm font-bold text-slate-700">{tech.aantalZonnepanelen} stuks</span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              step="1"
              value={tech.aantalZonnepanelen}
              onChange={(e) => setTech(prev => ({ ...prev, aantalZonnepanelen: Number(e.target.value) }))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-500">Dakoriëntatie t.o.v. Zuiden</label>
              <span className="text-sm font-bold text-slate-700">
                {tech.dakOrientatie}° {tech.dakOrientatie === 0 ? '(Zuid)' : tech.dakOrientatie === -90 ? '(Oost)' : tech.dakOrientatie === 90 ? '(West)' : tech.dakOrientatie === 180 ? '(Noord)' : ''}
              </span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="15"
              value={tech.dakOrientatie}
              onChange={(e) => setTech(prev => ({ ...prev, dakOrientatie: Number(e.target.value) }))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>-90° (Oost)</span>
              <span>0° (Zuid)</span>
              <span>90° (West)</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-medium text-slate-500">Direct eigen verbruik (%)</label>
              <span className="text-sm font-bold text-slate-700">{tech.huidigDirectVerbruik}%</span>
            </div>
            <input
              type="range"
              min="10"
              max="80"
              step="5"
              value={tech.huidigDirectVerbruik}
              onChange={(e) => setTech(prev => ({ ...prev, huidigDirectVerbruik: Number(e.target.value) }))}
              className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Capaciteit accu (kWh)</label>
              <input
                type="number"
                min="0"
                max="30"
                value={tech.capaciteitAccu || ''}
                onChange={(e) => setTech(prev => ({ ...prev, capaciteitAccu: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-emerald-500"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Omzettingsverliezen (%)</label>
              <input
                type="number"
                min="0"
                max="30"
                value={tech.omzettingsverliezen}
                onChange={(e) => setTech(prev => ({ ...prev, omzettingsverliezen: Number(e.target.value) }))}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:outline-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Type Energiecontract</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTech(prev => ({ ...prev, typeContract: 'Vast' }))}
                className={`py-2 text-xs font-medium rounded-lg border text-center transition ${
                  tech.typeContract === 'Vast'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Vast contract
              </button>
              <button
                type="button"
                onClick={() => setTech(prev => ({ ...prev, typeContract: 'Dynamisch' }))}
                className={`py-2 text-xs font-medium rounded-lg border text-center transition ${
                  tech.typeContract === 'Dynamisch'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Dynamisch contract
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Grote actieknop */}
      <button
        onClick={onGenerate}
        disabled={loading}
        className="w-full bg-emerald-600 text-white font-bold py-4 px-6 rounded-2xl shadow-lg hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        id="generate-coach-report-btn"
      >
        {loading ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Stappenplan opstellen...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 fill-emerald-500/20" />
            <span>Genereer Uitgebreid Adviesrapport</span>
          </>
        )}
      </button>
    </div>
  );
}
