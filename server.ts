import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client on the server side
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// API route first
app.post('/api/generate-advice', async (req, res) => {
  try {
    const { calculation } = req.body;

    if (!calculation) {
      return res.status(400).json({ error: 'Geen berekeningsgegevens geleverd.' });
    }

    const {
      resident = {},
      house = {},
      eligibleNip = false,
      nipExplanation = '',
      measures = [],
      optimalMeasures = [],
      addedMeasureForOptimization = null,
      totals = {},
      totalsOptimal = {},
      solar = {},
      battery = {},
      heatpump = {},
      opmerkingenOffertes = '',
      opmerkingen = ''
    } = calculation || {};

    const safeNum = (val: any, fallback = 0) => (typeof val === 'number' && !isNaN(val)) ? val : fallback;
    const safeStr = (val: any, fallback = '') => typeof val === 'string' ? val : fallback;

    // Build the prompt for Gemini
    const systemPrompt = `
Je bent de 'Energieplanner Peel en Maas', een geavanceerd en gebruiksvriendelijk digitaal platform waar bewoners in de gemeente Peel en Maas zelfstandig kunnen onderzoeken hoe ze energie kunnen besparen en of investeringen in zonnepanelen, een thuisaccu of een warmtepomp rendabel zijn.
Je geeft een helder, objectief, onafhankelijk en deskundig adviesrapport in begrijpelijk Nederlands (zonder technisch jargon) om de bewoner te helpen maximale energie- en gasbesparing te realiseren met een minimale eigen bijdrage.
Je werkt strikt volgens de NTA 8800 / ISSO-praktijkrichtlijnen.

Hier zijn de EXACTE berekende en ingevoerde gegevens voor deze bewoner/berekening:
- Berekeningstype: ${safeStr(resident.coach, 'Online Zelfscan')}
- Datum van berekening: ${safeStr(resident.datum, 'Onbekend')}
- Bewoner: ${safeStr(resident.aanhef, '')} ${safeStr(resident.voorletters, '')} ${safeStr(resident.achternaam, 'Onbekend')}
- Adres: ${safeStr(resident.straat, '')} ${safeStr(resident.huisnummer, '')} ${safeStr(resident.toevoeging, '')}, ${safeStr(resident.postcode, '')} ${safeStr(resident.plaats, '')}
- Registratiecode: ${safeStr(resident.registratiecode, 'Onbekend')}
- Telefoon: ${safeStr(resident.telefoon, 'Onbekend')}
- E-mailadres: ${safeStr(resident.email, 'Onbekend')}
- Bruto gezinsjaarinkomen: €${safeNum(resident.brutoGezinsinkomen, 0).toLocaleString('nl-NL')} (Inkomensverklaring gecontroleerd: ${(safeNum(resident.brutoGezinsinkomen, 0) < 60000 || house.inkomenCheck) ? 'Ja' : 'Nee'})

Woning details & kenmerken:
- Soort woning: ${safeStr(house.soortWoning, 'Onbekend')}
- Bouwjaar: ${safeNum(house.bouwjaar, 1970)}
- Woonoppervlakte: ${safeNum(house.woonoppervlakte, 0)} m²
- Aantal personen in huishouden: ${safeNum(resident.aantalPersonen, 1)}
- WOZ-waarde: €${safeNum(house.wozWaarde, 0).toLocaleString('nl-NL')}
- Energielabel: ${safeStr(house.energielabel, 'Geen')}

Huidige Installaties:
- Verwarming: ${safeStr(house.verwarming, 'Onbekend')}
- Afgiftesysteem: ${safeStr(house.afgiftesysteem, 'Onbekend')}
- Tapwater: ${safeStr(house.tapwater, 'Onbekend')}
- Koken: ${safeStr(house.koken, 'Onbekend')}
- Ventilatie: ${safeStr(house.ventilatie, 'Onbekend')}
- Reeds Zonnepanelen: ${safeStr(house.zonnepanelenPresent, 'Nee')}

Huidige Isolatie Status:
- Dak: ${house.isoDak === 'slecht' ? 'Slecht / Geen' : 'Goed'}
- Gevel: ${house.isoGevel === 'slecht' ? 'Slecht / Geen' : 'Goed'}
- Glas (begane grond): ${house.isoGlasBg === 'slecht' ? 'Slecht (Enkel/Dubbel)' : house.isoGlasBg === 'matig' ? 'Matig (HR)' : 'Goed (HR++/Triple)'}
- Glas (verdieping): ${house.isoGlasVd === 'slecht' ? 'Slecht (Enkel/Dubbel)' : house.isoGlasVd === 'matig' ? 'Matig (HR)' : 'Goed (HR++/Triple)'}
- Vloer / Bodem: ${house.isoVloer === 'slecht' ? 'Slecht / Geen' : 'Goed'}
- Naden en kieren: ${safeStr(house.isoKieren, 'Onbekend')}

Huidig Energieverbruik & Kosten:
- Jaarlijks gasverbruik: ${safeNum(house.verbruikM3, 0)} m³ (Gasprijs: €${safeNum(house.gasPrijs, 1.30).toFixed(2)} / m³)
- Jaarlijks elektraverbruik: ${safeNum(house.verbruikKwh, 0)} kWh (Elektraprijs: €${safeNum(house.elektraPrijs, 0.30).toFixed(2)} / kWh)
- Jaarlijke teruglevering elektra: ${safeNum(house.elektraTeruglevering, 0)} kWh
- Berekend stookgedrag: ${safeStr(house.stookgedragBerekend, 'Normaal (1.0x)')} (Factor: ${safeNum(house.stookgedragFactor, 1.0)}x)
- Handmatige correctie / override: ${house.stookgedragOverride === 'auto' ? 'Geen (automatisch berekend)' : safeStr(house.stookgedragOverride, '')}

Isolatiemaatregelen (Basis scenario op basis van ingemeten m²):
${measures.map((m: any) => `- ${m.name}: ${m.area} m² | Bruto: €${m.brutoCosts} | ISDE: €${m.isdeSubsidy} | NIP: €${m.nipSubsidy} | Netto: €${m.netCosts} | Besparing: ${safeNum(m.savingM3, 0).toFixed(1)} m³ / €${safeNum(m.savingEuro, 0).toFixed(2)} | TVT: ${safeNum(m.tvt, 0).toFixed(1)} jr`).join('\n')}

NIP Subsidie status: ${eligibleNip ? 'In aanmerking (€2.900)' : 'Niet in aanmerking. ' + safeStr(nipExplanation, '')}

Beste Scenario (Optimale combinatie van maatregelen):
${addedMeasureForOptimization ? `Er is een extra maatregel voorgesteld voor optimalisatie: ${addedMeasureForOptimization}` : 'Geen extra maatregel voorgesteld.'}
Optimalisatie Maatregelen:
${optimalMeasures.map((m: any) => `- ${m.name}: ${m.area} m² | Bruto: €${m.brutoCosts} | ISDE: €${m.isdeSubsidy} | NIP: €${m.nipSubsidy} | Netto: €${m.netCosts} | Besparing: ${safeNum(m.savingM3, 0).toFixed(1)} m³ / €${safeNum(m.savingEuro, 0).toFixed(2)} | TVT: ${safeNum(m.tvt, 0).toFixed(1)} jr`).join('\n')}

Zonnepanelen Prognose:
- Aantal panelen in simulatie: ${safeNum(calculation.tech?.aantalZonnepanelen, 0)}
- Jaarlijkse extra opbrengst: ${safeNum(solar.annualYieldKwh, 0).toFixed(0)} kWh (Oriëntatiefactor: ${safeNum(solar.orientationFactor, 1.0).toFixed(2)})
- Direct eigen verbruik basis: ${safeNum(solar.selfConsumptionBase, 0)}% (${safeNum(solar.absoluteSelfConsumptionBaseKwh, 0).toFixed(0)} kWh)
- Met Accu (${safeNum(calculation.tech?.capaciteitAccu, 0)} kWh): ${safeNum(solar.selfConsumptionWithBattery, 0).toFixed(0)}% (${safeNum(solar.absoluteSelfConsumptionWithBatteryKwh, 0).toFixed(0)} kWh)

Thuisaccu & Saldering Post-2027:
- Contracttype: ${safeStr(calculation.tech?.typeContract, 'Vast')}
- Stijging direct verbruik met accu: +${safeNum(battery.efficiencyIncrease, 0).toFixed(1)}%
- Post-2027 Jaarlijkse financiële besparing met accu: €${safeNum(battery.costSavingsPost2027, 0).toFixed(2)}
- Vast contract besparing: €${safeNum(battery.contractSavingsVast, 0).toFixed(2)}
- Dynamisch contract besparing: €${safeNum(battery.contractSavingsDynamisch, 0).toFixed(2)}

Warmtepomp Advies:
- Voldoende geïsoleerd (NTA 8800): ${heatpump.isInsulatedSufficiently ? 'Ja' : 'Nee'}
- Resterend gasverbruik na isolatie: ${safeNum(heatpump.remainingGasM3, 0).toFixed(0)} m³
- Warmtepomp aanbevolen: ${heatpump.isRecommended ? 'Ja' : 'Nee'}
- Investering (netto na subsidie): €${safeNum(heatpump.estimatedInvestment, 0)}
- Verwachte jaarlijkse extra besparing door warmtepomp: €${safeNum(heatpump.estimatedSavingsEuro, 0).toFixed(2)}
- Advies uitleg: ${safeStr(heatpump.explanation, '')}

Opmerkingen & Notities:
- Opmerkingen voor de isolatiebedrijven / offertes: ${opmerkingenOffertes || 'Geen'}
- Algemene bijzonderheden / leidraad verwerkers: ${opmerkingen || 'Geen'}

Rapport Structuur Richtlijnen (DWINGEND):
Genereer exact deze lay-out en structuur:
1. **Samenvatting voor de bewoner** (Max. 6 regels. Plaats de registratiecode ALTIJD in hoofdletters direct achter de naam van de bewoner, in het format: *[Naam bewoner] - Registratiecode [CODE]*).
2. **Berekeningsdetails & Datum** (Vermeld de datum van de zelfscan, de unieke registratiecode en geef aan dat dit een onafhankelijk online zelfservice rapport is).
3. **WOZ-check en doelgroep** (Inclusief de instructie voor het downloaden van de inkomensverklaring via Mijn Belastingdienst -> Financiën -> Geregistreerd inkomen).
4. **Analyse van de woning & Huidige Installaties** (Analyseer op basis van de ingevoerde verwarming, koken, afgifte en ventilatie de huidige thermische kwaliteit en kieren).
5. **Snel Resultaat** (Quick-wins zonder kosten op basis van het berekende stookgedrag).
6. **Isolatiemaatregelen** (Gerangschikt op financieel rendement van laag naar hoog €/m³ - gebruik de prioritering van de calculator).
7. **Beste scenario** (De optimale combinatie van maatregelen voor maximale subsidie. Leg uit of we een extra maatregel hebben voorgesteld om de hogere ISDE staffel en/of NIP te ontgrendelen en hoeveel dat scheelt!).
8. **Subsidie-uitleg** (NIP + ISDE uitgelegd in begrijpelijke taal).
9. **Financieel Spreadsheet** (Genereer een Markdown-tabel met exact deze kolommen: \`Maatregel\` | \`Aantal M2\` | \`Bruto kosten\` | \`Subsidie ISDE\` | \`Subsidie NIP\` | \`Netto Kosten\` | \`KostenBesparing (jr)\` | \`TVT (jr)\`). *Opmerking: Toon de geheime kengetallen uit de vaste rekenbasis NIET in deze tabel.*
10. **Zonnepanelen & Accu prognose** (Inclusief de post-2027 salderings- en contractberekeningen).
11. **Warmtepomp advies** (Wel of niet zinvol op basis van huidige isolatiegraad en resterend gasverbruik).
12. **Vervolgstap voor de bewoner** (Concrete actiepunten).

Schrijf in helder, eenvoudig Nederlands direct gericht tot de bewoner ("Je/Jij"). Vermijd technisch jargon en verwijs nooit naar Excel-sheets of AI-tools. Gebruik elegante Markdown-titels voor de secties. Zorg ervoor dat alle berekende getallen exact kloppen met de invoer!
`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          text: systemPrompt,
        },
      ],
    });

    res.json({ advice: response.text });
  } catch (error: any) {
    console.error('Fout bij genereren van advies:', error);
    res.status(500).json({ error: error.message || 'Interne serverfout bij het genereren van advies.' });
  }
});

// Serve static files in production or use Vite dev server in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
