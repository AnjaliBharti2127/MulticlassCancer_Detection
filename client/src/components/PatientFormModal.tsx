import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { createPatient } from "../services/patientService";
import type { CreatePatientPayload, Gender, Patient } from "../types/patient";
import ConfirmDialog from "./ConfirmDialog";

interface PatientFormModalProps {
  onClose: () => void;
  onCreated: (patient: Patient) => void;
}

interface FormState {
  name: string;
  age: string;
  gender: Gender | "";
  contactNumber: string;
  email: string;
  notes: string;
}

const INITIAL_STATE: FormState = {
  name: "",
  age: "",
  gender: "",
  contactNumber: "",
  email: "",
  notes: "",
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+()0-9\s-]{7,20}$/;

function validate(form: FormState): Partial<Record<keyof FormState, string>> {
  const errors: Partial<Record<keyof FormState, string>> = {};

  if (!form.name.trim() || form.name.trim().length < 2) {
    errors.name = "Enter the patient's full name.";
  }

  const age = Number(form.age);
  if (!form.age.trim() || Number.isNaN(age) || age <= 0 || age > 130) {
    errors.age = "Enter a valid age between 1 and 130.";
  }

  if (!form.gender) {
    errors.gender = "Select a gender.";
  }

  if (!form.contactNumber.trim() || !PHONE_PATTERN.test(form.contactNumber.trim())) {
    errors.contactNumber = "Enter a valid contact number.";
  }

  if (form.email.trim() && !EMAIL_PATTERN.test(form.email.trim())) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

export default function PatientFormModal({ onClose, onCreated }: PatientFormModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const hasUnsavedChanges = Object.values(form).some((value) => value.trim() !== "");

  const requestClose = () => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (hasUnsavedChanges) {
        setShowDiscardConfirm(true);
      } else {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasUnsavedChanges, onClose]);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validationErrors = validate(form);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const payload: CreatePatientPayload = {
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender as Gender,
      contactNumber: form.contactNumber.trim(),
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    try {
      const patient = await createPatient(payload);
      onCreated(patient);
    } catch {
      setSubmitError("Something went wrong while creating this patient. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Close add patient dialog"
        className="absolute inset-0 bg-slate-900/40"
        onClick={requestClose}
      />
      <dialog
        open
        aria-modal="true"
        aria-labelledby="add-patient-title"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="add-patient-title" className="text-base font-semibold text-slate-800">
            Add patient
          </h2>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="patient-name" className="mb-1 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <input
              id="patient-name"
              ref={firstFieldRef}
              type="text"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? "patient-name-error" : undefined}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
            {errors.name && (
              <p id="patient-name-error" className="mt-1 text-xs text-red-600">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="patient-age" className="mb-1 block text-sm font-medium text-slate-700">
                Age
              </label>
              <input
                id="patient-age"
                type="number"
                min={1}
                max={130}
                value={form.age}
                onChange={(e) => setField("age", e.target.value)}
                aria-invalid={Boolean(errors.age)}
                aria-describedby={errors.age ? "patient-age-error" : undefined}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              />
              {errors.age && (
                <p id="patient-age-error" className="mt-1 text-xs text-red-600">
                  {errors.age}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="patient-gender" className="mb-1 block text-sm font-medium text-slate-700">
                Gender
              </label>
              <select
                id="patient-gender"
                value={form.gender}
                onChange={(e) => setField("gender", e.target.value as Gender)}
                aria-invalid={Boolean(errors.gender)}
                aria-describedby={errors.gender ? "patient-gender-error" : undefined}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
              >
                <option value="">Select</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              {errors.gender && (
                <p id="patient-gender-error" className="mt-1 text-xs text-red-600">
                  {errors.gender}
                </p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="patient-contact" className="mb-1 block text-sm font-medium text-slate-700">
              Contact number
            </label>
            <input
              id="patient-contact"
              type="tel"
              value={form.contactNumber}
              onChange={(e) => setField("contactNumber", e.target.value)}
              aria-invalid={Boolean(errors.contactNumber)}
              aria-describedby={errors.contactNumber ? "patient-contact-error" : undefined}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
            {errors.contactNumber && (
              <p id="patient-contact-error" className="mt-1 text-xs text-red-600">
                {errors.contactNumber}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="patient-email" className="mb-1 block text-sm font-medium text-slate-700">
              Email <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="patient-email"
              type="email"
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "patient-email-error" : undefined}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
            {errors.email && (
              <p id="patient-email-error" className="mt-1 text-xs text-red-600">
                {errors.email}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="patient-notes" className="mb-1 block text-sm font-medium text-slate-700">
              Clinical notes <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="patient-notes"
              rows={3}
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          {submitError && (
            <p role="alert" className="text-sm text-red-600">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={requestClose}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            >
              {isSubmitting ? "Saving..." : "Add patient"}
            </button>
          </div>
        </form>
      </dialog>

      {showDiscardConfirm && (
        <ConfirmDialog
          title="Discard new patient?"
          message="You have unsaved details for this patient. Closing now will discard them."
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          variant="danger"
          onConfirm={onClose}
          onCancel={() => setShowDiscardConfirm(false)}
        />
      )}
    </div>
  );
}
