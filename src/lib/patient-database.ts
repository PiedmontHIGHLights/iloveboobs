/**
 * Synthetic patient database used to simulate the ROeID identity service.
 * Every record is fictional; CNPs follow the Romanian structure but the
 * sequence + check digits are random and do not correspond to real people.
 */

export type MedicalEvent = {
  date: string;
  type: "consult" | "intervenție" | "internare" | "test" | "vaccinare";
  description: string;
};

export type Patient = {
  id: string;
  cnp: string;
  name: string;
  age: number;
  sex: "M" | "F";
  bloodType: string;
  phone: string;
  address: string;
  emergencyContact: { name: string; phone: string; relation: string };
  allergies: string[];
  chronicConditions: string[];
  medication: string[];
  medicalHistory: MedicalEvent[];
  notes?: string;
};

export const PATIENTS: Patient[] = [
  {
    id: "andrei-popescu",
    cnp: "1900512123456",
    name: "Andrei Popescu",
    age: 35,
    sex: "M",
    bloodType: "A+",
    phone: "+40 722 123 456",
    address: "Strada Memorandumului 28, Cluj-Napoca",
    emergencyContact: {
      name: "Ioana Popescu",
      phone: "+40 722 987 654",
      relation: "soție",
    },
    allergies: ["Penicilină", "Polen de mesteacăn"],
    chronicConditions: ["Hipertensiune arterială (stadiul 2)"],
    medication: ["Concor 5mg (zilnic)", "Aspirină 75mg (la nevoie)"],
    medicalHistory: [
      {
        date: "2024-11-03",
        type: "consult",
        description: "Control cardiologic anual — TA 145/95, ECG normal.",
      },
      {
        date: "2023-06-21",
        type: "internare",
        description: "Internare 2 zile pentru ajustare terapie HTA.",
      },
      {
        date: "2022-02-14",
        type: "test",
        description: "Test alergologic — confirmare alergie penicilină.",
      },
    ],
    notes: "Evită beta-lactaminele. Tolerează macrolidele.",
  },
  {
    id: "maria-ionescu",
    cnp: "2870315234567",
    name: "Maria Ionescu",
    age: 38,
    sex: "F",
    bloodType: "0-",
    phone: "+40 745 222 333",
    address: "Bulevardul 21 Decembrie 1989 nr. 56, Cluj-Napoca",
    emergencyContact: {
      name: "Radu Ionescu",
      phone: "+40 745 444 555",
      relation: "frate",
    },
    allergies: ["Iod (substanță de contrast)", "Acarieni"],
    chronicConditions: ["Astm bronșic moderat"],
    medication: ["Ventolin (la criză)", "Symbicort 200/6 (zilnic)"],
    medicalHistory: [
      {
        date: "2025-01-18",
        type: "consult",
        description: "Spirometrie — FEV1 78% prezis, sub control bun.",
      },
      {
        date: "2024-08-09",
        type: "internare",
        description: "Internare 24h pentru criză astmatică declanșată de polen.",
      },
    ],
    notes: "Nu administrați AINS clasice — risc bronhospasm.",
  },
  {
    id: "vasile-dumitrescu",
    cnp: "1521008345678",
    name: "Vasile Dumitrescu",
    age: 73,
    sex: "M",
    bloodType: "B+",
    phone: "+40 264 555 111",
    address: "Strada Plopilor 12, Cluj-Napoca",
    emergencyContact: {
      name: "Elena Dumitrescu",
      phone: "+40 731 666 777",
      relation: "fiică",
    },
    allergies: [],
    chronicConditions: [
      "Diabet zaharat tip 2 (insulino-necesar)",
      "Boală coronariană ischemică (stent LAD 2021)",
      "Insuficiență renală cronică stadiul 3",
    ],
    medication: [
      "Insulină Lantus 22UI seara",
      "Metformin 1000mg x2/zi",
      "Plavix 75mg",
      "Atorvastatină 40mg",
      "Furosemid 40mg",
    ],
    medicalHistory: [
      {
        date: "2025-03-02",
        type: "consult",
        description: "Cardiologie — fracție de ejecție 48%, ușoară IC.",
      },
      {
        date: "2024-12-15",
        type: "internare",
        description: "Internare 4 zile pentru decompensare diabetică.",
      },
      {
        date: "2021-09-30",
        type: "intervenție",
        description: "Angioplastie cu stent activ pe artera descendentă anterioară.",
      },
    ],
    notes: "Risc cardiac major. Atenție la metformin în caz de funcție renală alterată.",
  },
  {
    id: "ana-ioana-vasilescu",
    cnp: "2950721456789",
    name: "Ana-Ioana Vasilescu",
    age: 30,
    sex: "F",
    bloodType: "AB+",
    phone: "+40 752 888 999",
    address: "Strada Republicii 34, Cluj-Napoca",
    emergencyContact: {
      name: "Sorin Vasilescu",
      phone: "+40 752 111 222",
      relation: "soț",
    },
    allergies: ["Latex"],
    chronicConditions: ["Sarcină — săptămâna 28"],
    medication: ["Acid folic 400µg", "Sideral fier"],
    medicalHistory: [
      {
        date: "2026-04-12",
        type: "consult",
        description: "Ecografie morfo-fetală gradul II — făt normal dezvoltat.",
      },
      {
        date: "2026-02-01",
        type: "test",
        description: "OGTT — normal (fără diabet gestațional).",
      },
    ],
    notes: "Gravidă T3 — orice medicație trebuie verificată FDA categorie.",
  },
  {
    id: "stefan-marin",
    cnp: "5180605567890",
    name: "Ștefan Marin",
    age: 8,
    sex: "M",
    bloodType: "0+",
    phone: "+40 723 333 444",
    address: "Strada Eroilor 9, Cluj-Napoca",
    emergencyContact: {
      name: "Cristina Marin",
      phone: "+40 723 999 000",
      relation: "mamă",
    },
    allergies: ["Arahide (anafilaxie)", "Ouă (ușoară)"],
    chronicConditions: ["Astm bronșic alergic"],
    medication: ["EpiPen Junior 0.15mg (la nevoie)", "Ventolin (la criză)"],
    medicalHistory: [
      {
        date: "2025-09-14",
        type: "internare",
        description: "Reacție anafilactică post-consum biscuit cu urme arahide. ATI 6h.",
      },
      {
        date: "2024-11-20",
        type: "vaccinare",
        description: "Rapel DTPa-VPI-Hib la vârsta 7 ani.",
      },
    ],
    notes:
      "MINOR. Tutore: Cristina Marin (mamă). EpiPen administrabil la primul semn de anafilaxie.",
  },
  {
    id: "george-stan",
    cnp: "1660228678901",
    name: "George Stan",
    age: 59,
    sex: "M",
    bloodType: "A-",
    phone: "+40 744 666 333",
    address: "Strada Donath 178, Cluj-Napoca",
    emergencyContact: {
      name: "Mihaela Stan",
      phone: "+40 744 222 999",
      relation: "soție",
    },
    allergies: ["Sulfamide"],
    chronicConditions: ["BPOC stadiul II (fumător)", "Hipercolesterolemie"],
    medication: ["Spiriva 18µg/zi", "Berodual la nevoie", "Rosuvastatină 20mg seara"],
    medicalHistory: [
      {
        date: "2025-06-04",
        type: "consult",
        description: "Spirometrie — FEV1 62% prezis, exacerbări 2/an.",
      },
      {
        date: "2024-02-10",
        type: "internare",
        description: "Internare 5 zile pentru exacerbare BPOC + pneumonie.",
      },
    ],
    notes: "Fumător activ ~25 țigări/zi. La dispnee severă, risc de exacerbare BPOC.",
  },
];

export function patientByCnp(cnp: string): Patient | undefined {
  return PATIENTS.find((p) => p.cnp === cnp.trim());
}

export function patientById(id: string): Patient | undefined {
  return PATIENTS.find((p) => p.id === id);
}
