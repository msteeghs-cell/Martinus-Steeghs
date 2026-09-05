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
    stroomTarief: 0.285,
    gasTarief: 1.34,
    terugleverkosten: 0.115,
    terugleverVergoeding: 0.055,
    vastrechtMaand: 7.99,
    description: 'Grootste energieleverancier van Nederland met vaste zekerheidstarieven.',
  },
  {
    id: 'Vattenfall',
    name: 'Vattenfall',
    subtitle: 'Vaste Zekerheid',
    badge: 'Top 3 NL',
    marketShareNote: 'Top 3 aanbieder met scherpe vaste tarieven',
    stroomTarief: 0.275,
    gasTarief: 1.32,
    terugleverkosten: 0.110,
    terugleverVergoeding: 0.050,
    vastrechtMaand: 7.50,
    description: 'Eén van de grootste aanbieders met scherpe vaste contracten.',
  },
  {
    id: 'Eneco',
    name: 'Eneco',
    subtitle: 'Hollands Groen',
    badge: 'Groene Stroom',
    marketShareNote: '100% Europese & Nederlandse wind- en zonne-energie',
    stroomTarief: 0.290,
    gasTarief: 1.35,
    terugleverkosten: 0.115,
    terugleverVergoeding: 0.050,
    vastrechtMaand: 8.25,
    description: 'Duurzaam vast contract met 100% Europese/Nederlandse wind- en zonne-energie.',
  },
  {
    id: 'Greenchoice',
    name: 'Greenchoice',
    subtitle: '100% Duurzaam & Bos',
    badge: 'Beste Overschot',
    marketShareNote: 'Groene pionier met gunstige terugleververgoeding',
    stroomTarief: 0.270,
    gasTarief: 1.30,
    terugleverkosten: 0.105,
    terugleverVergoeding: 0.060,
    vastrechtMaand: 7.95,
    description: 'Groene aanbieder met relatief lage terugleverkosten en gunstige overschotvergoeding.',
  },
];

export const TOP4_DYNAMIC_PROVIDERS: DynamicProviderInfo[] = [
  {
    id: 'Zonneplan',
    name: 'Zonneplan',
    subtitle: 'Powerplay AI Accusturing',
    badge: 'Marktleider Dynamisch',
    usp: 'Marktleider met hoogste accurendement via Powerplay',
    stroomInkoop: 0.240,
    stroomTeruglever: 0.090,
    gasTarief: 1.18,
    terugleverkosten: 0.0,
    batteryTradingYieldPerKwh: 38.25,
    description: 'Marktleider in dynamische energie en AI-geoptimaliseerde thuisbatterij nethandel (Powerplay).',
  },
  {
    id: 'Tibber',
    name: 'Tibber',
    subtitle: 'Smart Home & API',
    badge: 'Tech Pionier',
    usp: 'Pionier in digitale API sturing & smart EV-laden',
    stroomInkoop: 0.250,
    stroomTeruglever: 0.090,
    gasTarief: 1.20,
    terugleverkosten: 0.0,
    batteryTradingYieldPerKwh: 29.25,
    description: 'Pionier in digitale dynamische stroom met uitstekende integraties en smart EV-laden.',
  },
  {
    id: 'Frank',
    name: 'Frank Energie',
    subtitle: 'Slim Handelen & Arbitrage',
    badge: 'Geautomatiseerd',
    usp: 'Geavanceerd algoritme voor slim handelen op de onbalansmarkt',
    stroomInkoop: 0.245,
    stroomTeruglever: 0.090,
    gasTarief: 1.19,
    terugleverkosten: 0.0,
    batteryTradingYieldPerKwh: 31.50,
    description: 'Innovatieve dynamische speler met geavanceerde slimme handelsalgoritmes voor thuisaccu’s.',
  },
  {
    id: 'Anwb',
    name: 'ANWB Energie',
    subtitle: 'Vertrouwd & Transparant',
    badge: 'Inkoop Beursprijs',
    usp: 'Transparante uurtarieven direct tegen beursprijs',
    stroomInkoop: 0.255,
    stroomTeruglever: 0.090,
    gasTarief: 1.21,
    terugleverkosten: 0.0,
    batteryTradingYieldPerKwh: 27.00,
    description: 'Transparante uurtarieven rechtstreeks tegen de beursprijs via de vertrouwde ANWB.',
  },
];

export function getFixedProvider(id?: string): FixedProviderInfo {
  return TOP4_FIXED_PROVIDERS.find(p => p.id === id) || TOP4_FIXED_PROVIDERS[0];
}

export function getDynamicProvider(id?: string): DynamicProviderInfo {
  return TOP4_DYNAMIC_PROVIDERS.find(p => p.id === id) || TOP4_DYNAMIC_PROVIDERS[0];
}
