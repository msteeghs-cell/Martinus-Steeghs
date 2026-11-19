export type FixedProviderId = 'Essent' | 'Vattenfall' | 'Eneco' | 'Greenchoice' | 'Custom';
export type DynamicProviderId = 'Zonneplan' | 'Tibber' | 'Frank' | 'Anwb' | 'Custom';

export interface FixedProviderInfo {
  id: FixedProviderId;
  name: string;
  subtitle: string;
  badge: string;
  marketShareNote?: string;
  stroomTarief: number; // €/kWh levering incl. energiebelasting & btw
  gasTarief: number; // €/m³ levering incl. belasting & btw
  terugleverkosten: number; // €/kWh vaste terugleverkosten bij zonnepanelen
  terugleverVergoeding: number; // €/kWh netto vergoeding voor overschot boven jaarverbruik
  vastrechtMaand: number; // €/maand vastrecht indicatie
  description: string;
}

export interface DynamicProviderInfo {
  id: DynamicProviderId;
  name: string;
  subtitle: string;
  badge: string;
  usp?: string;
  stroomInkoop: number; // €/kWh gemiddeld dynamisch inkooptarief
  stroomTeruglever: number; // €/kWh gemiddeld opbrengsttarief zonne-uren
  gasTarief: number; // €/m³ dynamisch gas
  terugleverkosten: number; // Altijd €0 boete bij dynamisch!
  opslagLeverancier: number; // €/kWh inkoopopslag van de leverancier
  batteryTradingYieldPerKwh: number; // €/kWh/jaar opbrengst slimme thuisbatterij / arbitrage
  description: string;
}

export const TOP4_FIXED_PROVIDERS: FixedProviderInfo[] = [
  {
    id: 'Essent',
    name: 'Essent',
    subtitle: 'Marktleider Nederland',
    badge: 'Nr. 1 Aanbieder',
    marketShareNote: 'Grootste aanbieder van NL met vaste zekerheid',
    stroomTarief: 0.310,
    gasTarief: 1.50,
    terugleverkosten: 0.123,
    terugleverVergoeding: 0.060,
    vastrechtMaand: 9.25,
    description: 'Grootste energieleverancier van Nederland met vaste zekerheidstarieven.',
  },
  {
    id: 'Vattenfall',
    name: 'Vattenfall',
    subtitle: 'Vaste Zekerheid',
    badge: 'Top 3 NL',
    marketShareNote: 'Top 3 aanbieder met scherpe vaste tarieven',
    stroomTarief: 0.320,
    gasTarief: 1.65,
    terugleverkosten: 0.118,
    terugleverVergoeding: 0.055,
    vastrechtMaand: 8.99,
    description: 'Eén van de grootste aanbieders met vaste en variabele zekerheidscontracten.',
  },
  {
    id: 'Eneco',
    name: 'Eneco',
    subtitle: 'Hollands Groen',
    badge: 'Groene Stroom',
    marketShareNote: '100% Europese & Nederlandse wind- en zonne-energie',
    stroomTarief: 0.335,
    gasTarief: 1.72,
    terugleverkosten: 0.133,
    terugleverVergoeding: 0.055,
    vastrechtMaand: 9.49,
    description: 'Duurzaam vast contract met 100% Europese/Nederlandse wind- en zonne-energie.',
  },
  {
    id: 'Greenchoice',
    name: 'Greenchoice',
    subtitle: '100% Duurzaam & Bos',
    badge: 'Scherp Stroomtarief',
    marketShareNote: 'Groene pionier met scherp leveringstarief stroom & gas',
    stroomTarief: 0.295,
    gasTarief: 1.48,
    terugleverkosten: 0.145,
    terugleverVergoeding: 0.065,
    vastrechtMaand: 9.32,
    description: 'Groene aanbieder met scherp stroom- en gastarief (terugleverkosten per kWh).',
  },
];

export const TOP4_DYNAMIC_PROVIDERS: DynamicProviderInfo[] = [
  {
    id: 'Zonneplan',
    name: 'Zonneplan',
    subtitle: 'Powerplay AI Accusturing',
    badge: 'Marktleider Dynamisch',
    usp: 'Marktleider met hoogste accurendement via Powerplay',
    stroomInkoop: 0.265,
    stroomTeruglever: 0.085,
    gasTarief: 1.38,
    terugleverkosten: 0.0,
    opslagLeverancier: 0.0218,
    batteryTradingYieldPerKwh: 38.25,
    description: 'Marktleider in dynamische energie en AI-geoptimaliseerde thuisbatterij nethandel (Powerplay).',
  },
  {
    id: 'Tibber',
    name: 'Tibber',
    subtitle: 'Smart Home & API',
    badge: 'Tech Pionier',
    usp: 'Pionier in digitale API sturing & smart EV-laden',
    stroomInkoop: 0.275,
    stroomTeruglever: 0.085,
    gasTarief: 1.40,
    terugleverkosten: 0.0,
    opslagLeverancier: 0.0202,
    batteryTradingYieldPerKwh: 29.25,
    description: 'Pionier in digitale dynamische stroom met uitstekende integraties en smart EV-laden.',
  },
  {
    id: 'Frank',
    name: 'Frank Energie',
    subtitle: 'Slim Handelen & Arbitrage',
    badge: 'Geautomatiseerd',
    usp: 'Geavanceerd algoritme voor slim handelen op de onbalansmarkt',
    stroomInkoop: 0.260,
    stroomTeruglever: 0.085,
    gasTarief: 1.37,
    terugleverkosten: 0.0,
    opslagLeverancier: 0.0240,
    batteryTradingYieldPerKwh: 31.50,
    description: 'Innovatieve dynamische speler met scherpe inkoopkosten en slimme handelsalgoritmes.',
  },
  {
    id: 'Anwb',
    name: 'ANWB Energie',
    subtitle: 'Vertrouwd & Transparant',
    badge: 'Inkoop Beursprijs',
    usp: 'Transparante uurtarieven direct tegen beursprijs',
    stroomInkoop: 0.270,
    stroomTeruglever: 0.085,
    gasTarief: 1.41,
    terugleverkosten: 0.0,
    opslagLeverancier: 0.0224,
    batteryTradingYieldPerKwh: 27.00,
    description: 'Transparante uurtarieven rechtstreeks tegen de beursprijs via de vertrouwde ANWB.',
  },
];

export function getFixedProvider(id?: string): FixedProviderInfo {
  const normalized = (id || '').trim().toLowerCase();
  return (
    TOP4_FIXED_PROVIDERS.find(
      p => p.id.toLowerCase() === normalized || p.name.toLowerCase() === normalized
    ) || TOP4_FIXED_PROVIDERS[0]
  );
}

export function getDynamicProvider(id?: string): DynamicProviderInfo {
  const normalized = (id || '').trim().toLowerCase();
  return (
    TOP4_DYNAMIC_PROVIDERS.find(
      p => p.id.toLowerCase() === normalized || p.name.toLowerCase() === normalized
    ) || TOP4_DYNAMIC_PROVIDERS[0]
  );
}
