export type UserProfile = {
  name: string;
  cnp: string;
  age: number;
  allergies: string[];
  chronicConditions: string[];
  medication: string[];
};

/**
 * Mock ROeID-backed medical record used during the hackathon demo.
 * In production this would be fetched from the government identity service.
 */
export const MOCK_USER: UserProfile = {
  name: "Andrei Popescu",
  cnp: "1900512123456",
  age: 35,
  allergies: ["Penicilină", "Polen de mesteacăn"],
  chronicConditions: ["Hipertensiune arterială"],
  medication: ["Concor 5mg (zilnic)", "Aspirină 75mg (la nevoie)"],
};
