import { HouseData, ResidentData, TechData } from '../types';

export type ValidationBlockId = 'block1' | 'block2' | 'block3';

export interface MissingFieldItem {
  key: string;
  block: ValidationBlockId;
  blockTitle: string;
  label: string;
  elementId: string;
}

export interface FormValidationSummary {
  missing: MissingFieldItem[];
  byBlock: Record<ValidationBlockId, MissingFieldItem[]>;
  missingKeys: Set<string>;
  isComplete: boolean;
}

export function getFormValidationSummary(
  resident: ResidentData,
  house: HouseData,
  tech: TechData
): FormValidationSummary {
  const missing: MissingFieldItem[] = [];

  // Blok 1: Bewoners & Adres Gegevens
  const b1 = '1. Bewoners & Adres Gegevens';
  if (!resident.postcode?.trim()) {
    missing.push({ key: 'postcode', block: 'block1', blockTitle: b1, label: 'Postcode', elementId: 'postcode' });
  }
  if (!resident.huisnummer?.trim()) {
    missing.push({ key: 'huisnummer', block: 'block1', blockTitle: b1, label: 'Huisnummer', elementId: 'huisnummer' });
  }
  if (!resident.achternaam?.trim()) {
    missing.push({ key: 'achternaam', block: 'block1', blockTitle: b1, label: 'Achternaam', elementId: 'achternaam' });
  }
  if (!resident.plaats?.trim()) {
    missing.push({ key: 'plaats', block: 'block1', blockTitle: b1, label: 'Kerkdorp', elementId: 'plaats' });
  }
  if (!resident.telefoon?.trim()) {
    missing.push({ key: 'telefoon', block: 'block1', blockTitle: b1, label: 'Telefoon / mobiel', elementId: 'telefoon' });
  }

  // Blok 2: Woning & Huidige Installaties
  const b2 = '2. Woning & Huidige Installaties';
  if (!house.soortWoning?.trim()) {
    missing.push({ key: 'soortWoning', block: 'block2', blockTitle: b2, label: 'Soort woning', elementId: 'soort_woning' });
  }
  if (!house.bouwjaar || house.bouwjaar <= 0) {
    missing.push({ key: 'bouwjaar', block: 'block2', blockTitle: b2, label: 'Bouwjaar', elementId: 'bouwjaar' });
  }
  if (!house.woonoppervlakte || house.woonoppervlakte <= 0) {
    missing.push({ key: 'woonoppervlakte', block: 'block2', blockTitle: b2, label: 'Woonoppervlakte (m²)', elementId: 'woonopp' });
  }
  if (!resident.aantalPersonen || resident.aantalPersonen <= 0) {
    missing.push({ key: 'aantalPersonen', block: 'block2', blockTitle: b2, label: 'Aantal bewoners', elementId: 'aantal_personen' });
  }
  if (!house.wozWaarde || house.wozWaarde <= 0) {
    missing.push({ key: 'wozWaarde', block: 'block2', blockTitle: b2, label: 'WOZ-waarde (€)', elementId: 'woz_waarde' });
  }
  if (!house.verwarming?.trim()) {
    missing.push({ key: 'verwarming', block: 'block2', blockTitle: b2, label: 'Verwarming', elementId: 'verwarming' });
  }
  if (!house.afgiftesysteem?.trim()) {
    missing.push({ key: 'afgiftesysteem', block: 'block2', blockTitle: b2, label: 'Afgiftesysteem', elementId: 'afgiftesysteem' });
  }
  if (!house.tapwater?.trim()) {
    missing.push({ key: 'tapwater', block: 'block2', blockTitle: b2, label: 'Tapwater', elementId: 'tapwater' });
  }
  if (!house.koken?.trim()) {
    missing.push({ key: 'koken', block: 'block2', blockTitle: b2, label: 'Koken op', elementId: 'koken' });
  }
  if (!house.ventilatie?.trim()) {
    missing.push({ key: 'ventilatie', block: 'block2', blockTitle: b2, label: 'Ventilatie', elementId: 'ventilatie' });
  }

  // Blok 3: Energieverbruik & Stookgedrag
  const b3 = '3. Energieverbruik & Stookgedrag (Jaarrekening)';
  if (!house.verbruikKwh || house.verbruikKwh <= 0) {
    missing.push({ key: 'verbruikKwh', block: 'block3', blockTitle: b3, label: 'Elektra verbruik (kWh)', elementId: 'elektra_verbruik' });
  }
  if (!house.elektraPrijs || house.elektraPrijs <= 0) {
    missing.push({ key: 'elektraPrijs', block: 'block3', blockTitle: b3, label: 'Elektra prijs (€/kWh)', elementId: 'elektra_prijs' });
  }

  const isAllElectric =
    house.verwarming === 'Full electric' ||
    house.verwarming === 'Volledige warmtepomp' ||
    (tech.heatpumpStatus === 'bestaand' && tech.selectedWarmtepompType === 'All-Electric');

  if (!isAllElectric && (!house.verbruikM3 || house.verbruikM3 <= 0)) {
    missing.push({ key: 'verbruikM3', block: 'block3', blockTitle: b3, label: 'Gasverbruik (m³)', elementId: 'gas_totaal' });
  }
  if (!isAllElectric && house.verbruikM3 > 0 && (!house.gasPrijs || house.gasPrijs <= 0)) {
    missing.push({ key: 'gasPrijs', block: 'block3', blockTitle: b3, label: 'Gas prijs (€/m³)', elementId: 'gas_prijs' });
  }

  const byBlock: Record<ValidationBlockId, MissingFieldItem[]> = {
    block1: missing.filter(item => item.block === 'block1'),
    block2: missing.filter(item => item.block === 'block2'),
    block3: missing.filter(item => item.block === 'block3'),
  };

  return {
    missing,
    byBlock,
    missingKeys: new Set(missing.map(item => item.key)),
    isComplete: missing.length === 0,
  };
}

export function focusFormField(elementId: string) {
  setTimeout(() => {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => {
      if (typeof (el as HTMLElement).focus === 'function') {
        (el as HTMLElement).focus({ preventScroll: true });
      }
      el.classList.add('ring-2', 'ring-amber-500', 'ring-offset-1');
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-1');
      }, 1800);
    }, 250);
  }, 50);
}
