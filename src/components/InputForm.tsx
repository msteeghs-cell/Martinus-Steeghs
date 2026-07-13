import React, { useEffect, useState } from 'react';
import { ResidentData, HouseData, InsulationData, TechData } from '../types';
import { 
  User, Home, Layers, Battery, Sun, HelpCircle, 
  Sparkles, RefreshCw, Calendar, CheckCircle2, Zap, Info,
  TrendingDown, Gauge
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
  activeTab: 'isolatie' | 'zon' | 'accu' | 'saldering' | 'warmtepomp' | 'laadpaal';
  setActiveTab: (tab: 'isolatie' | 'zon' | 'accu' | 'saldering' | 'warmtepomp' | 'laadpaal') => void;
}

function Tooltip({ text, align = 'left' }: { text: React.ReactNode; align?: 'left' | 'right' | 'center' }) {
  // Use left-0 or right-0 to keep tooltip text completely within the narrow screen column
  let alignClasses = 'left-0 translate-x-0';
  let arrowClasses = 'left-3';

  if (align === 'center') {
    alignClasses = 'left-1/2 -translate-x-1/2';
    arrowClasses = 'left-1/2 -translate-x-1/2';
  } else if (align === 'right') {
    alignClasses = 'right-0 translate-x-0';
    arrowClasses = 'right-3';
  }

  return (
    <span className="group relative inline-block text-slate-400 hover:text-slate-600 cursor-help ml-1.5 align-middle shrink-0 z-10">
      <HelpCircle className="w-3.5 h-3.5" />
      <span className={`pointer-events-none absolute bottom-full mb-2 hidden group-hover:block w-64 bg-slate-900 text-white text-[11px] p-3 rounded-xl shadow-xl z-50 font-normal leading-relaxed normal-case text-left ${alignClasses}`}>
        {text}
        <span className={`absolute top-full border-4 border-transparent border-t-slate-900 ${arrowClasses}`} />
      </span>
    </span>
  );
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
  loading,
  activeTab,
  setActiveTab
}: InputFormProps) {
  const [fetchingBag, setFetchingBag] = useState(false);
  const [bagSuccess, setBagSuccess] = useState<boolean | null>(null);
  const [smartCalcReason, setSmartCalcReason] = useState<string>('');
  const [simulatedSpotPrice, setSimulatedSpotPrice] = useState<number>(0.08);

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

  const calculateSmartSelfConsumption = () => {
    let base = 30;
    const details: string[] = [];

    // Household size
    if (resident.aantalPersonen === 1) {
      base = 25;
      details.push('1 persoon');
    } else if (resident.aantalPersonen >= 4) {
      base = 35;
      details.push(`${resident.aantalPersonen} personen`);
    } else {
      details.push(`${resident.aantalPersonen} personen`);
    }

    // Heating system
    if (house.verwarming === 'Hybride warmtepomp') {
      base += 5;
      details.push('hybride WP (+5%)');
    } else if (house.verwarming === 'Full electric') {
      base += 10;
      details.push('full electric WP (+10%)');
    }

    // Airco/Cooling system
    if (house.afgiftesysteem === 'Airco') {
      base += 5;
      details.push('airco (+5%)');
    }

    // Induction cooking
    if (house.koken === 'Inductie') {
      base += 2;
      details.push('inductie (+2%)');
    }

    // Ventilation type
    if (house.ventilatie === 'Balans (Type D / WTW)') {
      base += 3;
      details.push('balansvent. (+3%)');
    }

    // Generation vs consumption ratio
    const totalWp = tech.aantalZonnepanelen * 400;
    const orientRad = (tech.dakOrientatie * Math.PI) / 180;
    const cosOrient = Math.cos(orientRad);
    let orientationFactor = 1.0;
    if (cosOrient >= 0) {
      orientationFactor = 0.85 + 0.15 * cosOrient;
    } else {
      orientationFactor = 0.85 + 0.30 * cosOrient;
    }
    const annualYieldKwh = (totalWp / 1000) * 900 * orientationFactor;

    if (annualYieldKwh > 0 && house.verbruikKwh > 0) {
      const ratio = annualYieldKwh / house.verbruikKwh;
      if (ratio < 0.5) {
        base += 15;
        details.push('lage opwek/vraag verhouding (+15%)');
      } else if (ratio < 0.8) {
        base += 5;
        details.push('matige opwek/vraag verhouding (+5%)');
      } else if (ratio > 1.2 && ratio <= 1.8) {
        base -= 5;
        details.push('hoge opwek/vraag verhouding (-5%)');
      } else if (ratio > 1.8) {
        base -= 10;
        details.push('zeer hoge opwek/vraag verhouding (-10%)');
      }
    }

    const finalVal = Math.max(10, Math.min(80, Math.round(base / 5) * 5));
    setTech(prev => ({ ...prev, huidigDirectVerbruik: finalVal }));
    setSmartCalcReason(`Slim berekend op ${finalVal}% op basis van ingevoerde gegevens.`);
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
        evKilometers: 0,
        evVerbruik: 18,
        evThuisLaden: 0,
        laadvermogen: 0,
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
        evKilometers: 10000,
        evVerbruik: 18,
        evThuisLaden: 60,
        laadvermogen: 11,
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
        evKilometers: 20000,
        evVerbruik: 16,
        evThuisLaden: 80,
        laadvermogen: 11,
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

  // Calculate local solar yield and break-even points for the 'zon' tab
  const totalWpLocal = tech.aantalZonnepanelen * 400;
  const orientRadLocal = (tech.dakOrientatie * Math.PI) / 180;
  const cosOrientLocal = Math.cos(orientRadLocal);
  let orientationFactorLocal = 1.0;
  if (cosOrientLocal >= 0) {
    orientationFactorLocal = 0.85 + 0.15 * cosOrientLocal;
  } else {
    orientationFactorLocal = 0.85 + 0.30 * cosOrientLocal;
  }
  const tiltLocal = tech.dakHellingshoek !== undefined ? tech.dakHellingshoek : 35;
  const tiltFactorLocal = Math.max(0.5, 1 - 0.0001 * Math.pow(tiltLocal - 35, 2));
  const localAnnualYieldKwh = Math.round((totalWpLocal / 1000) * 900 * orientationFactorLocal * tiltFactorLocal);

  const opslagLeverancier = tech.opslagLeverancier !== undefined ? tech.opslagLeverancier : 0.02;

  // Personal break-even calculations
  const breakEvenFeedIn = opslagLeverancier; // Spot price at which net feed-in is negative
  const energyTaxAndVat = 0.15; // standard ODE + tax + VAT in NL is around 15 cents
  const breakEvenImport = -(opslagLeverancier + energyTaxAndVat); // Spot price at which importing is net-free

  // Active advice calculation
  let adviceTitle = '';
  let adviceText = '';
  let adviceColor = '';

  if (simulatedSpotPrice > breakEvenFeedIn) {
    adviceTitle = 'Zorgeloos Terugleveren';
    adviceText = `De spotprijs (€${simulatedSpotPrice.toFixed(2)}/kWh) is hoger dan je inkoopopslag van €${opslagLeverancier.toFixed(2)}/kWh. Je verdient momenteel netto €${(simulatedSpotPrice - opslagLeverancier).toFixed(3)} per teruggeleverde kWh. Jouw zonnepanelen leveren nu direct winst op!`;
    adviceColor = 'bg-emerald-50 border-emerald-200 text-emerald-800';
  } else if (simulatedSpotPrice <= breakEvenFeedIn && simulatedSpotPrice > breakEvenImport) {
    adviceTitle = 'Licht Negatieve Prijs: Verbruik Direct Stroom';
    adviceText = `Ondanks de lage of negatieve spotprijs (€${simulatedSpotPrice.toFixed(2)}/kWh), kost het importeren van stroom van het net nog steeds geld (€${(simulatedSpotPrice + opslagLeverancier + energyTaxAndVat).toFixed(3)}/kWh incl. belastingen). Zet nu grote stroomverbruikers (wasmachine, vaatwasser) aan om je EIGEN gratis zonnestroom te verbruiken en voorkom dat je betaalt om terug te leveren!`;
    adviceColor = 'bg-amber-50 border-amber-200 text-amber-800';
  } else {
    adviceTitle = 'Extreem Negatieve Prijs: Schakel uiterlijk uit of Laad op!';
    adviceText = `De spotprijs is extreem negatief (€${simulatedSpotPrice.toFixed(2)}/kWh). Zelfs inclusief alle belastingen en opslagen levert het afnemen van stroom van het net je geld op! Schakel de omvormer van je zonnepanelen (indien mogelijk) tijdelijk uit en laad je elektrische auto of thuisaccu maximaal op vanaf het stroomnet!`;
    adviceColor = 'bg-blue-50 border-blue-200 text-blue-800';
  }

  return (
    <div className="space-y-6" id="input-form">
      {/* 6-Tab Navigation Bar matching user design */}
      <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/60 grid grid-cols-3 md:grid-cols-6 gap-1" id="panelTabbar">
        {[
          { id: 'isolatie', label: 'Isolatie', icon: Layers },
          { id: 'zon', label: 'Zon', icon: Sun },
          { id: 'accu', label: 'Accu', icon: Battery },
          { id: 'saldering', label: 'Saldering', icon: RefreshCw },
          { id: 'warmtepomp', label: 'Warmtepomp', icon: Zap },
          { id: 'laadpaal', label: 'Laadpaal', icon: Zap },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id as any)}
              className={`flex flex-col md:flex-row items-center justify-center gap-1.5 py-2.5 px-1 rounded-xl text-[10px] md:text-xs font-bold transition-all duration-200 ${
                isActive
                  ? 'bg-white text-emerald-800 shadow-md border-b-2 border-emerald-500 scale-[1.02]'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span className="truncate">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Conditional rendering of tab panels */}
      {activeTab === 'isolatie' && (
        <div className="space-y-6 animate-fadeIn">
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
                <h3 className="text-sm font-semibold text-slate-700">2. Bewoners &amp; Adres Gegevens</h3>
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

              {/* Inkomens- & NIP-check */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">NIP-Subsidie criteria (Inkomenseis)</span>
                  <Tooltip text="Het Nationaal Isolatieprogramma (NIP) heeft in Peel en Maas een inkomenseis van maximaal €60.000 bruto gezinsinkomen per jaar OF een handmatige controle door de coach." />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Bruto gezinsjaarinkomen (€)</label>
                    <input
                      type="number"
                      value={resident.brutoGezinsinkomen || ''}
                      onChange={(e) => setResident(prev => ({ ...prev, brutoGezinsinkomen: Number(e.target.value) }))}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-mono"
                      placeholder="Bijv. 45000"
                      id="bruto_gezinsinkomen"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Inkomensverklaring gecontroleerd?</label>
                    <select
                      value={house.inkomenCheck ? "Ja" : "Nee"}
                      onChange={(e) => setHouse(prev => ({ ...prev, inkomenCheck: e.target.value === "Ja" }))}
                      className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                      id="inkomen_check"
                    >
                      <option value="Nee">Nee (toetsing via inkomen &lt; €60.000)</option>
                      <option value="Ja">Ja (altijd akkoord via coach controle)</option>
                    </select>
                  </div>
                </div>
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
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Verwarming</span>
                    <Tooltip text={
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">Hoofdverwarming types:</p>
                        <p>• <strong>CV-ketel:</strong> Traditionele gasverwarming d.m.v. aardgas.</p>
                        <p>• <strong>Hybride warmtepomp:</strong> Warmtepomp gecombineerd met een CV-ketel voor koude dagen en tapwater.</p>
                        <p>• <strong>Full electric:</strong> Volledig gasloos verwarmen op elektriciteit d.m.v. een warmtepomp.</p>
                      </div>
                    } />
                  </label>
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
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Afgiftesysteem</span>
                    <Tooltip text={
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">Type warmteafgifte:</p>
                        <p>• <strong>Radiatoren:</strong> Traditionele verwarming met een hoge watertemperatuur (65-80°C).</p>
                        <p>• <strong>Vloerverwarming / LTV:</strong> Zeer lage watertemperatuur (30-40°C), optimaal rendement voor warmtepompen.</p>
                        <p>• <strong>Airco:</strong> Verwarmen en koelen via lucht-lucht warmtepomp blaasunits.</p>
                      </div>
                    } align="right" />
                  </label>
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
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Tapwater</span>
                    <Tooltip text={
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">Warmwaterbereiding:</p>
                        <p>• <strong>CV-ketel:</strong> Warm water via de combiketel op gas.</p>
                        <p>• <strong>Warmtepompboiler:</strong> Zuinige elektrische boiler die warmte uit de binnenlucht haalt om water te verwarmen.</p>
                        <p>• <strong>Zonneboiler:</strong> Verwarmt tapwater d.m.v. zonnecollectoren op het dak.</p>
                      </div>
                    } />
                  </label>
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
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Koken op</span>
                    <Tooltip text={
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">Type kookplaat:</p>
                        <p>• <strong>Gas:</strong> Koken op traditioneel aardgas.</p>
                        <p>• <strong>Inductie:</strong> Elektrisch koken met magnetische velden. Zeer veilig en energiezuinig.</p>
                        <p>• <strong>Elektrisch:</strong> Koken via keramische of gietijzeren kookplaten.</p>
                      </div>
                    } align="right" />
                  </label>
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
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Ventilatie</span>
                    <Tooltip text={
                      <div className="space-y-1.5">
                        <p className="font-bold text-slate-200">Ventilatietypes:</p>
                        <p>• <strong>Natuurlijk (Type A):</strong> Verse lucht via ventilatieroosters of open ramen, afvoer via natuurlijke trek (schoorsteen).</p>
                        <p>• <strong>Mechanisch (Type C):</strong> Toevoer via roosters in gevel/ramen, mechanische afzuiging in vochtige ruimtes (keuken/badkamer/toilet).</p>
                        <p>• <strong>Balans (Type D / WTW):</strong> Volledig mechanische toevoer &amp; afvoer. Warmte uit de afgevoerde binnenlucht warmt de koude toevoerlucht op (WTW), wat veel stookenergie bespaart!</p>
                      </div>
                    } />
                  </label>
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
                  <label className="block text-xs font-medium text-slate-500 mb-1">Teruglevering (kWh)</label>
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
                    <Tooltip text="Vergelijkt gasverbruik met het theoretische verbruik op basis van de NTA 8800." />
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

          {/* 5. Huidige Isolatie Status */}
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
        </div>
      )}

      {activeTab === 'zon' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Zonnepanelen Instellingen */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Sun className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Zonnepanelen Instellingen</h3>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-500">Aantal zonnepanelen</label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="36"
                      value={tech.aantalZonnepanelen}
                      onChange={(e) => {
                        const val = Math.min(36, Math.max(0, Number(e.target.value)));
                        setTech(prev => ({ ...prev, aantalZonnepanelen: val }));
                      }}
                      className="w-14 text-center text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-emerald-500 font-mono"
                    />
                    <span className="text-xs text-slate-500 font-semibold">stuks</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="36"
                  step="1"
                  value={tech.aantalZonnepanelen}
                  onChange={(e) => setTech(prev => ({ ...prev, aantalZonnepanelen: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center">
                    <span>Dakoriëntatie t.o.v. Zuiden</span>
                    <Tooltip text={
                      <div className="space-y-1">
                        <p className="font-bold text-slate-200">Richting van het dak:</p>
                        <p>De oriëntatie beïnvloedt de dagelijkse opbrengstcurve van je zonnepanelen.</p>
                        <p>• <strong>0° (Zuid):</strong> Maximale opbrengst rond het middaguur.</p>
                        <p>• <strong>-90° (Oost) of 90° (West):</strong> Meer opbrengst in de ochtend of namiddag, wat gunstig is om direct in huis te verbruiken.</p>
                      </div>
                    } />
                  </label>
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
                  <label className="text-xs font-medium text-slate-500 flex items-center">
                    <span>Hellingshoek (°)</span>
                    <Tooltip text="De hellingshoek van de zonnepanelen t.o.v. het horizontale vlak. Optimaal in Nederland is circa 35 graden. Platte daken liggen vaak onder 10-15 graden." />
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="90"
                      value={tech.dakHellingshoek !== undefined ? tech.dakHellingshoek : 35}
                      onChange={(e) => {
                        const val = Math.min(90, Math.max(0, Number(e.target.value)));
                        setTech(prev => ({ ...prev, dakHellingshoek: val }));
                      }}
                      className="w-14 text-center text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-emerald-500 font-mono"
                    />
                    <span className="text-xs text-slate-500 font-semibold">°</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  step="5"
                  value={tech.dakHellingshoek !== undefined ? tech.dakHellingshoek : 35}
                  onChange={(e) => setTech(prev => ({ ...prev, dakHellingshoek: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0° (Plat dak)</span>
                  <span>35° (Optimaal)</span>
                  <span>90° (Verticaal)</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center">
                    <span>Direct eigen verbruik (%)</span>
                    <Tooltip text="Het percentage zonnestroom dat direct in huis wordt gebruikt op het moment dat de zon schijnt (bijv. door de koelkast, wasmachine, etc.). Gemiddeld 30%." />
                  </label>
                  <span className="text-sm font-bold text-slate-700">{tech.huidigDirectVerbruik}%</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="80"
                  step="5"
                  value={tech.huidigDirectVerbruik}
                  onChange={(e) => {
                    setTech(prev => ({ ...prev, huidigDirectVerbruik: Number(e.target.value) }));
                    setSmartCalcReason('');
                  }}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between items-center mt-1.5">
                  <button
                    type="button"
                    onClick={calculateSmartSelfConsumption}
                    className="text-[10px] font-semibold text-emerald-600 hover:text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/50 rounded-lg px-2 py-0.5 flex items-center gap-1 transition-all"
                  >
                    <Sparkles className="w-3 h-3 text-emerald-500" />
                    <span>Bereken slimme inschatting</span>
                  </button>
                  {smartCalcReason && (
                    <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 border border-emerald-100 rounded px-1.5 py-0.5">
                      {smartCalcReason}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Dynamisch Contract & Omslagpunt widget */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden space-y-4">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gauge className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-semibold text-slate-700 font-sans">Dynamisch Contract & Omslagpunt</h3>
              </div>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">Slimme Tool</span>
            </div>
            
            <div className="p-5 space-y-5">
              {/* Context text in simple wording */}
              <div className="text-xs text-slate-600 leading-relaxed space-y-2">
                <p>
                  Bij een dynamisch contract betaal je bij negatieve spotprijzen om stroom terug te leveren. 
                  Maar wanneer precies is het omslagpunt? Dat hangt af van je opwek, verbruik, en de opslagen van je leverancier. 
                  Deze tool berekent je persoonlijke break-even punt en geeft realtime advies.
                </p>
                
                {/* Statistic highlight box */}
                <div className="bg-amber-50/70 border border-amber-100 rounded-xl p-3 flex items-start gap-2.5 text-amber-900">
                  <TrendingDown className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-xs">
                    <span className="font-bold">Sterke marktverandering:</span> In 2025 waren er maar liefst <strong className="text-amber-700">107 dagen</strong> met minstens één kwartier een negatieve spotprijs. 
                    Dat is <strong className="text-amber-700">vier keer meer</strong> dan in 2022! Dit maakt slim omgaan met je zonnestroom steeds belangrijker.
                  </div>
                </div>
              </div>

              {/* Surcharge setting */}
              <div className="pt-2 border-t border-slate-50 space-y-2.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-slate-500 flex items-center">
                    <span>Leverancier opslag / inkoopkosten (€/kWh)</span>
                    <Tooltip text="De extra kosten of marge die je energieleverancier per kWh rekent bij een dynamisch contract. Dit ligt meestal tussen €0,01 en €0,05 per kWh." />
                  </label>
                  <span className="text-sm font-bold text-slate-700 font-mono">
                    € {opslagLeverancier.toFixed(4)} / kWh
                  </span>
                </div>
                <input
                  type="range"
                  min="0.000"
                  max="0.080"
                  step="0.0001"
                  value={opslagLeverancier}
                  onChange={(e) => setTech(prev => ({ ...prev, opslagLeverancier: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                
                {/* Supplier presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">Snelkeuze energieleverancier:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { name: 'Zonneplan', val: 0.0218, desc: 'Populair, vaste inkoopkosten' },
                      { name: 'Tibber', val: 0.0202, desc: 'Slim laden, lage opslag' },
                      { name: 'ANWB Energie', val: 0.0224, desc: 'Samen naar duurzamer' },
                      { name: 'Frank Energie', val: 0.0240, desc: 'Volledig transparant' }
                    ].map((provider) => {
                      const isSelected = Math.abs(opslagLeverancier - provider.val) < 0.0002;
                      return (
                        <button
                          key={provider.name}
                          type="button"
                          onClick={() => setTech(prev => ({ ...prev, opslagLeverancier: provider.val }))}
                          className={`text-[10px] px-2.5 py-1 rounded-md font-medium border transition-all ${
                            isSelected 
                              ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm' 
                              : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-800'
                          }`}
                          title={`${provider.name}: €${provider.val.toFixed(4)}/kWh (${provider.desc})`}
                        >
                          {provider.name} (€{provider.val.toFixed(3)})
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Personal break-even results dashboard */}
              <div className="bg-slate-50 rounded-xl p-4 grid grid-cols-2 gap-4 border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Verwachte jaaropwekking</span>
                  <strong className="text-slate-700 text-sm font-mono">{localAnnualYieldKwh} kWh / jaar</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Jaarlijks stroomverbruik</span>
                  <strong className="text-slate-700 text-sm font-mono">{house.verbruikKwh || 0} kWh / jaar</strong>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/50 flex flex-col sm:flex-row justify-between gap-2">
                  <div>
                    <span className="text-slate-500 font-medium">Jouw persoonlijke Teruglever-omslagpunt:</span>
                    <Tooltip text="Zodra de beursstroomprijs onder dit punt daalt, is je netto terugleververgoeding negatief en betaal je dus effectief om terug te leveren." />
                  </div>
                  <span className="font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded font-mono text-center shrink-0">
                    Minder dan € {breakEvenFeedIn.toFixed(3)} / kWh
                  </span>
                </div>
              </div>

              {/* Real-time Simulator section */}
              <div className="space-y-3 pt-2 border-t border-slate-50">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                    <span>Interactieve Spotprijs Simulator & Advies</span>
                  </h4>
                  <span className="text-xs font-bold text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">
                    Beursstroomprijs: € {simulatedSpotPrice.toFixed(2)} / kWh
                  </span>
                </div>
                
                <input
                  type="range"
                  min="-0.25"
                  max="0.25"
                  step="0.01"
                  value={simulatedSpotPrice}
                  onChange={(e) => setSimulatedSpotPrice(Number(e.target.value))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                
                <div className="flex justify-between text-[10px] text-slate-400 px-1">
                  <span>-€0.25 (Extreem negatief)</span>
                  <span>€0.00</span>
                  <span>€0.25 (Hoog tarief)</span>
                </div>

                {/* Real-time feedback box */}
                <div className={`p-3.5 rounded-xl border transition-all duration-300 ${adviceColor}`}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <Zap className="w-4 h-4 shrink-0" />
                    <h5 className="font-bold text-xs">{adviceTitle}</h5>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-95">
                    {adviceText}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'accu' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Thuisbatterij Instellingen */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Battery className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Thuisbatterij Instellingen</h3>
            </div>
            <div className="p-5 space-y-5">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-slate-500 flex items-center">
                    <span>Capaciteit accu (kWh)</span>
                    <Tooltip text="Bepaalt de maximale opslagcapaciteit van je thuisbatterij. Stem de grootte af op je zonne-opwekking en nachtverbruik." />
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      step="0.5"
                      value={tech.capaciteitAccu}
                      onChange={(e) => {
                        const val = Math.min(30, Math.max(0, Number(e.target.value)));
                        setTech(prev => ({ ...prev, capaciteitAccu: val }));
                      }}
                      className="w-16 text-center text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-emerald-500 font-mono"
                    />
                    <span className="text-xs font-semibold text-slate-500">kWh</span>
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="30"
                  step="0.5"
                  value={tech.capaciteitAccu}
                  onChange={(e) => setTech(prev => ({ ...prev, capaciteitAccu: Number(e.target.value) }))}
                  className="w-full accent-emerald-500 h-1.5 bg-slate-100 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>0 kWh (Geen)</span>
                  <span>10 kWh</span>
                  <span>20 kWh</span>
                  <span>30 kWh</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                  <span>Omzettingsverliezen (%)</span>
                  <Tooltip text="Laden en ontladen geeft warmte en energieverlies door de omvormer. Standaard is 10% tot 15%." />
                </label>
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
          </div>
        </div>
      )}

      {activeTab === 'saldering' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Energiecontract & Saldering */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Contract &amp; Tarieven</h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Type Energiecontract</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTech(prev => ({ ...prev, typeContract: 'Vast' }))}
                    className={`py-2 px-1 text-xs font-medium rounded-lg border text-center transition ${
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
                    className={`py-2 px-1 text-xs font-medium rounded-lg border text-center transition ${
                      tech.typeContract === 'Dynamisch'
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Dynamisch contract
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Elektra prijs (€/kWh)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={house.elektraPrijs}
                    onChange={(e) => setHouse(prev => ({ ...prev, elektraPrijs: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Teruglevering (kWh)</label>
                  <input
                    type="number"
                    value={house.elektraTeruglevering}
                    onChange={(e) => setHouse(prev => ({ ...prev, elektraTeruglevering: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 text-[11px] text-slate-600 leading-relaxed border border-slate-100">
                <span className="font-bold text-slate-700 block mb-1">Let op: Afschaffing Salderingsregeling</span>
                Vanaf <strong>1 januari 2027</strong> wordt de salderingsregeling in Nederland volledig afgeschaft. Dit betekent dat teruggeleverde stroom direct minder oplevert en direct eigen verbruik én thuisbatterijen cruciaal worden voor het rendement!
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'warmtepomp' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Warmtepomp & Verwarming */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Verwarming &amp; Gas Parameters</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Verwarming Type</label>
                  <select
                    value={house.verwarming}
                    onChange={(e) => setHouse(prev => ({ ...prev, verwarming: e.target.value }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-semibold"
                  >
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
                  >
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
                  <label className="block text-xs font-medium text-slate-500 mb-1">Gasverbruik (m³)</label>
                  <input
                    type="number"
                    value={house.verbruikM3}
                    onChange={(e) => setHouse(prev => ({ ...prev, verbruikM3: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Gas prijs (€/m³)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={house.gasPrijs}
                    onChange={(e) => setHouse(prev => ({ ...prev, gasPrijs: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-[11px] text-blue-800 leading-relaxed">
                <span className="font-bold block mb-1">Waarom deze gasgegevens?</span>
                Op basis van je huidige gasverbruik en afgiftesysteem berekent onze rekentool direct de haalbaarheid van een warmtepomp, de benodigde capaciteit, de jaarlijkse besparingen en de netto ISDE-subsidies!
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'laadpaal' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Laadpaal & Elektrisch Rijden */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-700">Elektrisch Rijden &amp; Laadpaal</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Jaarkilometrage EV (km)</label>
                  <input
                    type="number"
                    value={tech.evKilometers ?? 15000}
                    onChange={(e) => setTech(prev => ({ ...prev, evKilometers: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-semibold"
                    placeholder="Bijv. 15000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Verbruik EV (kWh/100km)</span>
                    <Tooltip text="Het gemiddelde verbruik van de elektrische auto. Een gemiddelde EV verbruikt tussen de 15 en 20 kWh per 100 kilometer." />
                  </label>
                  <input
                    type="number"
                    value={tech.evVerbruik ?? 18}
                    onChange={(e) => setTech(prev => ({ ...prev, evVerbruik: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="Bijv. 18"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1 flex items-center">
                    <span>Aandeel thuis geladen (%)</span>
                    <Tooltip text="Het percentage van de totale laadbeurten dat thuis op de eigen oprit wordt gedaan, in plaats van openbaar laden of snelladen." />
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={tech.evThuisLaden ?? 70}
                    onChange={(e) => setTech(prev => ({ ...prev, evThuisLaden: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500"
                    placeholder="Bijv. 70"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Laadvermogen laadpaal (kW)</label>
                  <select
                    value={tech.laadvermogen ?? 11}
                    onChange={(e) => setTech(prev => ({ ...prev, laadvermogen: Number(e.target.value) }))}
                    className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:outline-emerald-500 font-semibold"
                  >
                    <option value="3.7">3.7 kW (1-fase 16A)</option>
                    <option value="7.4">7.4 kW (1-fase 32A)</option>
                    <option value="11">11 kW (3-fase 16A • Standaard)</option>
                    <option value="22">22 kW (3-fase 32A)</option>
                  </select>
                </div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-[11px] text-emerald-800 leading-relaxed space-y-2">
                <div>
                  <span className="font-bold block mb-1">Rendement van een Eigen Laadpaal</span>
                  Thuis laden is aanzienlijk goedkoper dan openbaar laden (gemiddeld € 0,25 - € 0,30 per kWh thuis versus € 0,45 - € 0,60 openbaar). Bovendien kun je met zonnepanelen overdag nagenoeg gratis laden! De rekentool toont in de resultaten direct je besparingen en terugverdientijd.
                </div>
                <div className="border-t border-emerald-200/50 pt-2 font-medium">
                  <span className="font-bold text-emerald-950 block mb-1">🎁 Extra inkomsten via ERE-vergoeding (circa € 0,12 / kWh)</span>
                  Bovenop alles wat je al bespaart, verdien je ook nog eens geld terug! Voor elke kWh die je thuis laadt, zijn oliemaatschappijen zoals Shell en BP wettelijk verplicht een vergoeding te betalen van circa <strong>€ 0,12 per kWh</strong>. Deze vergoeding, de ERE, kun je eenvoudig claimen via gespecialiseerde partijen zoals <strong>Zonneplan</strong>, <strong>Laadpaal App</strong> of <strong>EREclaim.nl</strong>.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
