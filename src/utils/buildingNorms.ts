export interface BouwjaarNorm {
  id: string;
  periode: string; // bijv. "1975 – 1982"
  titel: string; // bijv. "Eerste isolatienorm (bijv. 1978)"
  korteOmschrijving: string; // "4 cm spouw, matig dak, dubbel glas BG, koude vloer"
  uitgebreideToelichting: string;
  minJaar: number;
  maxJaar: number;
  isoDak: 'slecht' | 'matig' | 'goed';
  isoGevel: 'slecht' | 'matig' | 'goed';
  isoGevelLabel: string;
  isoGlasBg: 'slecht' | 'dubbel' | 'matig' | 'goed' | 'triple';
  isoGlasBgLabel: string;
  isoGlasVd: 'slecht' | 'dubbel' | 'matig' | 'goed' | 'triple';
  isoGlasVdLabel: string;
  isoVloer: 'slecht' | 'matig' | 'goed';
  isoVloerLabel: string;
  isoKieren: 'Ja, in orde' | 'Nee, onderhoud nodig';
}

export const BOUWJAAR_NORMEN: BouwjaarNorm[] = [
  {
    id: 'voor-1975',
    periode: 'Vóór 1975',
    titel: 'Traditionele bouw (ongeïsoleerd)',
    korteOmschrijving: 'Geen spouw- of vloerisolatie, koud dak, enkel glas, kieren',
    uitgebreideToelichting: 'Tijdens de bouw vóór de oliecrisis bestond er nog geen isolatienorm. Woningen hebben oorspronkelijk een koud dak, open spouw of steensmuren, enkel glas en tochtige kieren.',
    minJaar: 0,
    maxJaar: 1974,
    isoDak: 'slecht',
    isoGevel: 'slecht',
    isoGevelLabel: 'Geen (ongeïsoleerd)',
    isoGlasBg: 'slecht',
    isoGlasBgLabel: 'Enkel glas',
    isoGlasVd: 'slecht',
    isoGlasVdLabel: 'Enkel glas',
    isoVloer: 'slecht',
    isoVloerLabel: 'Geen vloerisolatie (koud)',
    isoKieren: 'Nee, onderhoud nodig',
  },
  {
    id: '1975-1982',
    periode: '1975 – 1982',
    titel: 'Eerste isolatienorm (bijv. 1978)',
    korteOmschrijving: 'Oude spouwmuurisolatie (4 cm), matig dak, oud dubbel glas BG, koude vloer',
    uitgebreideToelichting: 'Eerste landelijke norm (Rc ≈ 1.3 m²K/W na de oliecrisis): lichte spouwmuurisolatie (ca. 4 cm glaswol/UF-schuim), matig geïsoleerd dak (3-5 cm), traditioneel dubbel glas beneden, enkel glas boven en ongeïsoleerde vloer.',
    minJaar: 1975,
    maxJaar: 1982,
    isoDak: 'matig',
    isoGevel: 'matig',
    isoGevelLabel: 'Spouwmuurisolatie (Oud / ca. 4 cm)',
    isoGlasBg: 'dubbel',
    isoGlasBgLabel: 'Oud dubbel glas (thermopane)',
    isoGlasVd: 'slecht',
    isoGlasVdLabel: 'Enkel glas',
    isoVloer: 'slecht',
    isoVloerLabel: 'Geen vloerisolatie (koud)',
    isoKieren: 'Nee, onderhoud nodig',
  },
  {
    id: '1983-1991',
    periode: '1983 – 1991',
    titel: 'Aangescherpte basisisolatie',
    korteOmschrijving: 'Spouw en dak ca. 5-7 cm, dubbel glas rondom, lichte vloerisolatie',
    uitgebreideToelichting: 'Aangescherpte voorschriften (Rc ≈ 1.3 - 2.0): spouwmuurisolatie ca. 5-6 cm, dakisolatie 5-7 cm, traditioneel dubbel glas in de hele woning en eerste lichte vloerisolatie (broodjesvloer).',
    minJaar: 1983,
    maxJaar: 1991,
    isoDak: 'matig',
    isoGevel: 'matig',
    isoGevelLabel: 'Spouwmuurisolatie (Oud / ca. 5 cm)',
    isoGlasBg: 'dubbel',
    isoGlasBgLabel: 'Dubbel glas',
    isoGlasVd: 'dubbel',
    isoGlasVdLabel: 'Dubbel glas',
    isoVloer: 'matig',
    isoVloerLabel: 'Matig (broodjesvloer / licht)',
    isoKieren: 'Nee, onderhoud nodig',
  },
  {
    id: '1992-2005',
    periode: '1992 – 2005',
    titel: 'Bouwbesluit 1992 (Rc ≥ 2.5)',
    korteOmschrijving: 'Dak, gevel en vloer Rc ≥ 2.5, standaard HR-glas, goede kierdichting',
    uitgebreideToelichting: 'Invoering Bouwbesluit 1992 met integrale isolatie-eis (Rc ≥ 2.5 m²K/W voor dak, gevel en vloer). Voorzien van eerste generatie HR/HR+ glas en goede kierdichting.',
    minJaar: 1992,
    maxJaar: 2005,
    isoDak: 'goed',
    isoGevel: 'goed',
    isoGevelLabel: 'Goed (Rc ≥ 2.5)',
    isoGlasBg: 'matig',
    isoGlasBgLabel: 'HR / HR+ glas',
    isoGlasVd: 'matig',
    isoGlasVdLabel: 'HR / dubbel glas',
    isoVloer: 'goed',
    isoVloerLabel: 'Goed geïsoleerd (Rc ≥ 2.5)',
    isoKieren: 'Ja, in orde',
  },
  {
    id: '2006-2014',
    periode: '2006 – 2014',
    titel: 'Bouwbesluit 2003/2006 (Rc ≥ 3.5)',
    korteOmschrijving: 'Rondom Rc ≥ 3.5, HR++ beglazing, goede kierdichting',
    uitgebreideToelichting: 'Strenge isolatienormen met Rc ≥ 3.5 m²K/W voor dak, gevel en vloer, standaard voorzien van HR++ beglazing en goede kierdichting.',
    minJaar: 2006,
    maxJaar: 2014,
    isoDak: 'goed',
    isoGevel: 'goed',
    isoGevelLabel: 'Goed (Rc ≥ 3.5)',
    isoGlasBg: 'goed',
    isoGlasBgLabel: 'HR++ glas',
    isoGlasVd: 'goed',
    isoGlasVdLabel: 'HR++ glas',
    isoVloer: 'goed',
    isoVloerLabel: 'Goed geïsoleerd (Rc ≥ 3.5)',
    isoKieren: 'Ja, in orde',
  },
  {
    id: '2015-plus',
    periode: '2015 en nieuwer',
    titel: 'Zeer energiezuinig / Nieuwbouw (BENG)',
    korteOmschrijving: 'Dak Rc ≥ 6.0, gevel Rc ≥ 4.5, vloer Rc ≥ 3.5, HR++/Triple, luchtdicht',
    uitgebreideToelichting: 'Hoogwaardige nieuwbouwnorm met zeer hoge isolatiewaarden (Rc 3.5 tot 6.0 m²K/W), HR++ of Triple glas, balansventilatie en uitstekende kierdichting.',
    minJaar: 2015,
    maxJaar: 9999,
    isoDak: 'goed',
    isoGevel: 'goed',
    isoGevelLabel: 'Goed (Rc ≥ 4.5)',
    isoGlasBg: 'goed',
    isoGlasBgLabel: 'HR++ of Triple glas',
    isoGlasVd: 'goed',
    isoGlasVdLabel: 'HR++ of Triple glas',
    isoVloer: 'goed',
    isoVloerLabel: 'Goed geïsoleerd (Rc ≥ 3.5)',
    isoKieren: 'Ja, in orde',
  },
];

/**
 * Vindt de toepasselijke bouwjaarnorm op basis van een specifiek bouwjaar.
 * Indien het bouwjaar niet bekend is, wordt standaard 1978 geretourneerd (de typische referentiewoning).
 */
export function getBouwjaarNorm(bouwjaar?: number | null): BouwjaarNorm {
  const jaar = Number(bouwjaar) || 1978;
  const match = BOUWJAAR_NORMEN.find(norm => jaar >= norm.minJaar && jaar <= norm.maxJaar);
  return match || BOUWJAAR_NORMEN[1]; // Standaard 1975-1982 (1978)
}
