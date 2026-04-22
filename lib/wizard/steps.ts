export type WizardStep = {
  id: number;
  title: string;
  description: string;
};

export const wizardSteps: WizardStep[] = [
  { id: 1, title: "Tipo evento", description: "Che tipo di evento stai pianificando?" },
  { id: 2, title: "Ospiti", description: "Quanti ospiti stai invitando?" },
  { id: 3, title: "Budget", description: "Qual è il tuo budget totale?" },
  { id: 4, title: "Venue", description: "Che tipo di location preferisci?" },
  { id: 5, title: "Catering", description: "Cosa hai in mente per il cibo?" },
  { id: 6, title: "Decor", description: "Qual è l'atmosfera che cerchi?" },
  { id: 7, title: "Extra", description: "Cosa non può mancare?" },
  { id: 8, title: "Allocazione", description: "Come distribuire il budget?" },
  { id: 9, title: "Brief", description: "Raccontaci la tua visione" },
  { id: 10, title: "Conferma", description: "Rivedi e genera il piano" },
];

export const TOTAL_STEPS = wizardSteps.length;
