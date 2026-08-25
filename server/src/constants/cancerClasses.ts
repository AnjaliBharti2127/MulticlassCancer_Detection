/** Auto-generated from ml-service/app/model_config.json. Do not edit manually. */
export const CANCER_CLASSES = [
  "breast_cancer",
  "breast_normal",
  "colon_cancer",
  "colon_normal",
  "lung_normal",
  "lung_type1_cancer",
  "lung_type2_cancer",
  "oral_cancer",
  "oral_normal",
] as const;

export type CancerClass = (typeof CANCER_CLASSES)[number];
