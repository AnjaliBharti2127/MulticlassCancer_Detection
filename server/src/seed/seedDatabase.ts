import mongoose from "mongoose";
import { env } from "../config/env";
import { Patient } from "../models/Patient";
import { Case } from "../models/Case";
import { Prediction } from "../models/Prediction";
import { Report } from "../models/Report";
import { CANCER_CLASSES } from "../constants/cancerClasses";

/**
 * Populates the database with a small set of realistic but fictional
 * patients, cases, predictions, and reports. Safe to re-run: it clears
 * these four collections first. Class names/order always come from
 * CANCER_CLASSES so seed data can never drift from the real model's taxonomy.
 */

function classIndex(className: string): number {
  const index = CANCER_CLASSES.indexOf(className as (typeof CANCER_CLASSES)[number]);
  if (index === -1) throw new Error(`Unknown cancer class in seed data: ${className}`);
  return index;
}

async function seed(): Promise<void> {
  await mongoose.connect(env.mongodbUri);
  console.log("Connected to MongoDB for seeding.");

  await Promise.all([
    Patient.deleteMany({}),
    Case.deleteMany({}),
    Prediction.deleteMany({}),
    Report.deleteMany({}),
  ]);
  console.log("Cleared existing patients, cases, predictions, and reports.");

  const patients = await Patient.insertMany([
    {
      name: "R. Anand",
      age: 61,
      gender: "male",
      contactNumber: "9876500001",
      email: "r.anand@example.com",
      totalCases: 1,
      lastVisit: new Date("2026-07-18T09:12:00Z"),
    },
    {
      name: "S. Verma",
      age: 47,
      gender: "female",
      contactNumber: "9876500002",
      totalCases: 1,
      lastVisit: new Date("2026-07-18T08:47:00Z"),
    },
    {
      name: "K. Sharma",
      age: 54,
      gender: "male",
      contactNumber: "9876500003",
      totalCases: 1,
      lastVisit: new Date("2026-07-17T16:20:00Z"),
    },
    {
      name: "M. Iyer",
      age: 66,
      gender: "male",
      contactNumber: "9876500004",
      totalCases: 1,
      lastVisit: new Date("2026-07-17T14:05:00Z"),
    },
    {
      name: "A. Fernandes",
      age: 39,
      gender: "female",
      contactNumber: "9876500005",
      totalCases: 0,
      lastVisit: new Date("2026-07-17T11:30:00Z"),
    },
  ]);
  console.log(`Inserted ${patients.length} patients.`);

  const [anand, verma, sharma, iyer] = patients;

  const cases = await Case.insertMany([
    {
      caseNumber: "CASE-2026-0001",
      patient: anand._id,
      specimenType: "Lung needle biopsy",
      slideName: "lung_biopsy_04.png",
      status: "completed",
      submittedAt: new Date("2026-07-18T09:12:00Z"),
      notes: "Consistent with prior imaging findings. Recommend oncology referral.",
    },
    {
      caseNumber: "CASE-2026-0002",
      patient: verma._id,
      specimenType: "Breast core biopsy",
      slideName: "breast_core_11.jpg",
      status: "completed",
      submittedAt: new Date("2026-07-18T08:47:00Z"),
    },
    {
      caseNumber: "CASE-2026-0003",
      patient: sharma._id,
      specimenType: "Colon polypectomy",
      slideName: "colon_polyp_02.png",
      status: "needs_review",
      submittedAt: new Date("2026-07-17T16:20:00Z"),
      notes: "Confidence margin is narrow. Flagged for pathologist review.",
    },
    {
      caseNumber: "CASE-2026-0004",
      patient: iyer._id,
      specimenType: "Oral mucosal biopsy",
      slideName: "oral_biopsy_07.jpg",
      status: "pending",
      submittedAt: new Date("2026-07-17T14:05:00Z"),
    },
  ]);
  console.log(`Inserted ${cases.length} cases.`);

  const [case1, case2, case3] = cases;

  // Each completed/needs_review case gets a matching Prediction document,
  // with all 9 classes represented (required by Prediction's schema validation).
  const predictionSeeds = [
    {
      case: case1,
      top: [
        { className: "lung_type1_cancer", probability: 0.964 },
        { className: "lung_type2_cancer", probability: 0.021 },
        { className: "lung_normal", probability: 0.015 },
      ],
      inferenceDurationMs: 842,
      filename: "lung_biopsy_04.png",
    },
    {
      case: case2,
      top: [
        { className: "breast_cancer", probability: 0.912 },
        { className: "breast_normal", probability: 0.061 },
        { className: "lung_normal", probability: 0.027 },
      ],
      inferenceDurationMs: 795,
      filename: "breast_core_11.jpg",
    },
    {
      case: case3,
      top: [
        { className: "colon_cancer", probability: 0.689 },
        { className: "colon_normal", probability: 0.243 },
        { className: "lung_normal", probability: 0.068 },
      ],
      inferenceDurationMs: 910,
      filename: "colon_polyp_02.png",
    },
  ];

  const predictions = [];
  for (const seedItem of predictionSeeds) {
    const topClassNames = new Set(seedItem.top.map((t) => t.className));
    const probabilities = CANCER_CLASSES.map((className) => ({
      className,
      classIndex: classIndex(className),
      probability: seedItem.top.find((t) => t.className === className)?.probability ?? 0,
    })).filter((p) => p.probability > 0 || topClassNames.has(p.className));

    const top = seedItem.top[0];
    const prediction = await Prediction.create({
      case: seedItem.case._id,
      status: "completed",
      predictedClass: top.className,
      predictedIndex: classIndex(top.className),
      confidence: top.probability,
      probabilities,
      modelVersion: "seed-v1",
      preprocessingVersion: "seed-v1",
      inferenceDurationMs: seedItem.inferenceDurationMs,
      inputImage: { filename: seedItem.filename, mimeType: "image/jpeg", sizeBytes: 512_000 },
    });
    predictions.push(prediction);

    seedItem.case.latestPrediction = prediction._id;
    seedItem.case.predictedClass = top.className;
    seedItem.case.confidence = top.probability;
    seedItem.case.topPredictions = seedItem.top.map((t) => ({ className: t.className, confidence: t.probability })) as typeof seedItem.case.topPredictions;
    await seedItem.case.save();
  }
  console.log(`Inserted ${predictions.length} predictions and linked them to cases.`);

  const reports = await Report.insertMany([
    {
      reportNumber: "RPT-2026-0001",
      case: case1._id,
      patient: anand._id,
      prediction: predictions[0]._id,
      pathologist: "Dr. N. Kulkarni",
      diagnosis: "Lung Adenocarcinoma",
      findings: "Malignant glandular architecture consistent with adenocarcinoma.",
      recommendation: "Oncology referral recommended.",
      status: "finalized",
      generatedAt: new Date("2026-07-18T10:05:00Z"),
    },
    {
      reportNumber: "RPT-2026-0002",
      case: case2._id,
      patient: verma._id,
      prediction: predictions[1]._id,
      pathologist: "Dr. N. Kulkarni",
      diagnosis: "Breast Malignant Carcinoma",
      findings: "Infiltrating duct epithelium with high nuclear grade.",
      recommendation: "Correlate with imaging and consider surgical planning.",
      status: "finalized",
      generatedAt: new Date("2026-07-18T09:30:00Z"),
    },
  ]);
  console.log(`Inserted ${reports.length} reports.`);

  await mongoose.disconnect();
  console.log("Seeding complete. Disconnected from MongoDB.");
}

seed().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});
