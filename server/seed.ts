import { db } from "./db";
import { downtimeReasons } from "@shared/schema";

async function seed() {
  console.log("Seeding database...");
  
  // Seed downtime reasons
  const reasons = [
    { label: "Component Jam", category: "mechanical" as const },
    { label: "Overheating", category: "mechanical" as const },
    { label: "Sensor Failure", category: "electrical" as const },
    { label: "Power Outage", category: "external" as const },
    { label: "Operator Break", category: "operational" as const },
    { label: "Material Shortage", category: "operational" as const },
    { label: "Emergency Stop", category: "mechanical" as const },
    { label: "Calibration Required", category: "mechanical" as const },
    { label: "Software Fault", category: "electrical" as const },
  ];
  
  for (const reason of reasons) {
    await db.insert(downtimeReasons).values(reason).onConflictDoNothing();
  }
  
  console.log("Seeding complete!");
}

seed().catch(console.error);
