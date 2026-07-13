import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

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

// Helper function to generate content with exponential backoff and model fallbacks
async function generateContentWithRetry(contents: any, initialModel = 'gemini-3.5-flash') {
  const modelsToTry = [
    { name: initialModel, delay: 0 },
    { name: initialModel, delay: 1500 },
    { name: 'gemini-flash-latest', delay: 2500 },
    { name: 'gemini-3.1-flash-lite', delay: 3500 }
  ];

  let lastError: any = null;
  for (let i = 0; i < modelsToTry.length; i++) {
    const item = modelsToTry[i];
    if (item.delay > 0) {
      console.log(`[Gemini API] Waiting ${item.delay}ms before attempt ${i + 1} with model ${item.name}...`);
      await new Promise(resolve => setTimeout(resolve, item.delay));
    }
    try {
      console.log(`[Gemini API] Attempt ${i + 1}/${modelsToTry.length} using model: ${item.name}`);
      const response = await ai.models.generateContent({
        model: item.name,
        contents: contents,
      });
      if (response && response.text) {
        console.log(`[Gemini API] Success using model: ${item.name}`);
        return response;
      }
    } catch (err: any) {
      console.error(`[Gemini API] Attempt ${i + 1} failed (${item.name}):`, err.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error("Mislukt om advies te genereren na meerdere pogingen.");
}

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

    const safeNum = (val: any, fallback: any = 0) => (typeof val === 'number' && !isNaN(val)) ? val : fallback;
    const safeStr = (val: any, fallback = '') => typeof val === 'string' ? val : fallback;

    // Build the prompt for Gemini
    const systemPrompt = `
Je bent de 'Energieplanner Peel en Maas', een geavanceerd en gebruiksvriendelijk digitaal platform waar bewoners in de gemeente Peel en Maas zelfstandig kunnen onderzoeken hoe ze energie kunnen besparen en of investeringen in zonnepanelen, een thuisaccu of een warmtepomp rendabel zijn.
Je geeft een helder, objectief, onafhankelijk en deskundig adviesrapport in begrijpelijk Nederlands (zonder technisch jargon) om de bewoner te helpen maximale energie- en gasbesparing te realiseren met een minimale eigen bijdrage.
Je werkt strikt volgens de NTA 8800 / ISSO-praktijkrichtlijnen.

BELANGRIJK / CRITICAL:
Gebruik ALTIJD exact de hieronder vermelde waarden voor de bewoner. Noem NOOIT foutieve waarden (zoals bouwjaar 1970, een 'vrijstaande woning', of een gezinsinkomen van € 58.000) tenzij deze exact zo hieronder zijn aangegeven! Neem de waarden strikt over zoals ze hieronder staan.

Hier zijn de EXACTE berekende en ingevoerde gegevens voor deze bewoner/berekening:
- Berekeningstype: ${safeStr(resident.coach, 'Online Zelfscan')}
- Datum van berekening: ${safeStr(resident.datum, 'Onbekend')}
- Bewoner: ${safeStr(resident.aanhef, '')} ${safeStr(resident.voorletters, '')} ${safeStr(resident.achternaam, 'Onbekend')}
- Adres: ${safeStr(resident.straat, '')} ${safeStr(resident.huisnummer, '')} ${safeStr(resident.toevoeging, '')}, ${safeStr(resident.postcode, '')} ${safeStr(resident.plaats, '')}
- Registratiecode: ${safeStr(resident.registratiecode, 'Onbekend')}
- Telefoon: ${safeStr(resident.telefoon, 'Onbekend')}
- E-mailadres: ${safeStr(resident.email, 'Onbekend')}
- Bruto gezinsjaarinkomen: €${safeNum(resident.brutoGezinsinkomen, 0).toLocaleString('nl-NL')} (Inkomensverklaring gecontroleerd: ${(safeNum(resident.brutoGezinsinkomen, 0) < 60000 || house.inkomenCheck) ? 'Ja' : 'Nee'})

Woning details & kenmerken (STRIKT OVERNEMEN):
- Soort woning: ${safeStr(house.soortWoning, 'Onbekend')}
- Bouwjaar: ${safeNum(house.bouwjaar, 'Onbekend')}
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
- Oriëntatie: ${safeNum(calculation.tech?.dakOrientatie, 0)} graden t.o.v. het Zuiden (Factor: ${safeNum(solar.orientationFactor, 1.0).toFixed(2)})
- Hellingshoek (Tilt): ${safeNum(calculation.tech?.dakHellingshoek, 35)} graden (Optimalisatiefactor: ${(Math.max(0.5, 1 - 0.0001 * Math.pow((calculation.tech?.dakHellingshoek !== undefined ? calculation.tech.dakHellingshoek : 35) - 35, 2))).toFixed(2)})
- Jaarlijkse extra opbrengst: ${safeNum(solar.annualYieldKwh, 0).toFixed(0)} kWh
- Direct eigen verbruik basis: ${safeNum(solar.selfConsumptionBase, 0)}% (${safeNum(solar.absoluteSelfConsumptionBaseKwh, 0).toFixed(0)} kWh)
- Met Accu (${safeNum(calculation.tech?.capaciteitAccu, 0)} kWh): ${safeNum(solar.selfConsumptionWithBattery, 0).toFixed(0)}% (${safeNum(solar.absoluteSelfConsumptionWithBatteryKwh, 0).toFixed(0)} kWh)

Thuisaccu & Saldering Post-2027:
- Contracttype: ${safeStr(calculation.tech?.typeContract, 'Vast')}
- Stijging direct verbruik met accu: +${safeNum(battery.efficiencyIncrease, 0).toFixed(1)}%
- Post-2027 Jaarlijkse financiële besparing met accu: €${safeNum(battery.costSavingsPost2027, 0).toFixed(2)}
- Vast contract besparing: €${safeNum(battery.contractSavingsVast, 0).toFixed(2)}
- Dynamisch contract besparing: €${safeNum(battery.contractSavingsDynamisch, 0).toFixed(2)}

Laadpaal & Elektrisch Rijden Prognose (indien van toepassing):
- Jaarkilometrage EV: ${safeNum(calculation.tech?.evKilometers, 15000)} km
- Verbruik EV: ${safeNum(calculation.tech?.evVerbruik, 18)} kWh/100km
- Aandeel thuis geladen: ${safeNum(calculation.tech?.evThuisLaden, 70)}%
- Elektraprijs thuis: €${safeNum(house.elektraPrijs, 0.30).toFixed(2)} / kWh
- Extra ERE-vergoeding: circa €0,12 per kWh thuis geladen stroom (wettelijke vergoeding betaald door oliemaatschappijen zoals Shell en BP).

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
11. **Laadpaal & Wettelijke ERE-vergoeding** (Bespreek de financiële voordelen van thuis laden versus openbaar laden en vermeld expliciet dat oliemaatschappijen zoals Shell en BP wettelijk verplicht zijn een ERE-vergoeding van circa € 0,12 per kWh te betalen voor elke thuis geladen kWh, en leg uit waar en hoe ze deze kunnen claimen bij partijen zoals Zonneplan, Laadpaal App of EREclaim.nl).
12. **Warmtepomp advies** (Wel of niet zinvol op basis van huidige isolatiegraad en resterend gasverbruik).
13. **Vervolgstap voor de bewoner** (Concrete actiepunten).

Schrijf in helder, eenvoudig Nederlands direct gericht tot de bewoner ("Je/Jij"). Vermijd technisch jargon en verwijs nooit naar Excel-sheets of AI-tools. Gebruik elegante Markdown-titels voor de secties. Zorg ervoor dat alle berekende getallen exact kloppen met de invoer!
`;

    const response = await generateContentWithRetry([
      {
        text: systemPrompt,
      },
    ]);

    res.json({ advice: response.text });
  } catch (error: any) {
    console.error('Fout bij genereren van advies:', error);
    res.status(500).json({ error: error.message || 'Interne serverfout bij het genereren van advies.' });
  }
});

// API endpoint to send advice report to the resident's email
app.post('/api/send-email', async (req, res) => {
  try {
    const { email, clientName, reportText } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mailadres is verplicht.' });
    }

    console.log(`[Email API] Verzoek om rapport te verzenden naar: ${email} voor klant: ${clientName}`);

    // Fetch SMTP settings from environment variables
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT || 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const from = process.env.SMTP_FROM || 'no-reply@energieplanner.peelenmaas.nl';

    let sent = false;
    let messageId = '';
    let isSimulated = true;

    if (host && user && pass) {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });

      const info = await transporter.sendMail({
        from: `"Energieplanner Peel en Maas" <${from}>`,
        to: email,
        subject: `Jouw Energieplanner Peel en Maas Adviesrapport - ${clientName || 'Bewoner'}`,
        text: reportText || 'Hierbij ontvangt u uw adviesrapport.',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
            <div style="background-color: #10b981; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">Energieplanner Peel en Maas</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Jouw persoonlijke verduurzamingsadvies</p>
            </div>
            <div style="padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
              <p>Beste <strong>${clientName || 'bewoner'}</strong>,</p>
              <p>Bedankt voor het invullen van de Energieplanner Peel en Maas. Op basis van jouw ingevoerde gegevens hebben we een onafhankelijk en deskundig adviesrapport opgesteld om je te helpen besparen op gas en elektriciteit en maximaal te profiteren van beschikbare subsidies zoals het NIP en ISDE.</p>
              
              <div style="background-color: #f8fafc; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; font-size: 14px; color: #475569;">
                <strong>Verwachte resultaten:</strong>
                <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                  <li>Onafhankelijk stappenplan specifiek voor jouw woning</li>
                  <li>Overzicht van isolatiesubsidies (ISDE + NIP tot wel €2.900)</li>
                  <li>Inzicht in zonnepanelen, saldering en warmtepomp-mogelijkheden</li>
                </ul>
              </div>

              <h3 style="color: #0f172a; margin-top: 25px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">Jouw Persoonlijke Adviesrapport:</h3>
              <div style="background-color: #fafafa; border: 1px solid #f1f5f9; padding: 15px; border-radius: 6px; white-space: pre-wrap; font-family: monospace; font-size: 12px; color: #334155; max-height: 400px; overflow-y: auto;">
                ${reportText}
              </div>

              <p style="margin-top: 25px;">Heb je vragen over dit rapport of wil je hulp bij de vervolgstappen? Neem gerust contact op met de Energiecoaches van Peel en Maas.</p>
              
              <p style="margin-bottom: 0;">Met vriendelijke groet,<br><strong>Energieplanner Peel en Maas</strong></p>
            </div>
            <div style="text-align: center; font-size: 11px; color: #94a3b8; margin-top: 20px; padding: 10px;">
              Dit is een automatisch gegenereerd rapport opgesteld door de Energieplanner Peel en Maas zelfscan.
            </div>
          </div>
        `
      });

      sent = true;
      messageId = info.messageId;
      isSimulated = false;
      console.log(`[Email API] Echte e-mail succesvol verzonden naar ${email}. Message ID: ${messageId}`);
    } else {
      sent = true;
      isSimulated = true;
      console.log(`[Email API] SIMULATIE MODUS: E-mail succesvol opgesteld en gelogd voor ${email}.`);
    }

    res.json({ success: true, isSimulated, email, messageId });
  } catch (error: any) {
    console.error('Fout bij verzenden van e-mail:', error);
    res.status(500).json({ error: error.message || 'Fout bij het verzenden van de e-mail.' });
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
