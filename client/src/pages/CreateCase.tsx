import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { getPatients } from "../services/patientService";
import { createCase } from "../services/caseService";
import type { Patient } from "../types/patient";
import ImageUploader from "../components/ImageUploader";
import LoadingSpinner from "../components/LoadingSpinner";
import ErrorState from "../components/ErrorState";
import ConfirmDialog from "../components/ConfirmDialog";
import { useToast } from "../context/ToastContext";

export default function CreateCase() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [patients, setPatients] = useState<Patient[] | null>(null);
  const [patientsError, setPatientsError] = useState<string | null>(null);
  const [patientsRefreshToken, setPatientsRefreshToken] = useState(0);
  const [patientId, setPatientId] = useState("");
  const [specimenType, setSpecimenType] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const [errors, setErrors] = useState<{ patientId?: string; specimenType?: string; file?: string }>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const previewUrlRef = useRef<string | null>(null);
  previewUrlRef.current = previewUrl;

  const hasUnsavedInput = Boolean(
    patientId || specimenType.trim() || notes.trim() || file
  );

  const handleBackClick = () => {
    if (hasUnsavedInput) {
      setShowLeaveConfirm(true);
    } else {
      navigate("/cases");
    }
  };

  useEffect(() => {
    let isMounted = true;
    setPatientsError(null);
    getPatients({ pageSize: 500, sortBy: "name", sortDirection: "asc" })
      .then((data) => {
        if (isMounted) setPatients(data.items);
      })
      .catch(() => {
        if (isMounted) setPatientsError("Could not load patients. Please try again.");
      });
    return () => {
      isMounted = false;
    };
  }, [patientsRefreshToken]);

  // Revoke the object URL on unmount so we don't leak memory.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const handleFileSelect = (selected: File) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
  };

  const handleFileReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const validationErrors: typeof errors = {};
    if (!patientId) validationErrors.patientId = "Select a patient for this case.";
    if (!specimenType.trim()) validationErrors.specimenType = "Enter the specimen type.";
    if (!file) validationErrors.file = "Upload a histopathology slide image.";
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0 || !file) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const caseDetail = await createCase({
        patientId,
        specimenType: specimenType.trim(),
        notes: notes.trim() || undefined,
        file,
      });
      // Ownership of the object URL now belongs to the stored case record.
      previewUrlRef.current = null;
      showToast(`Case ${caseDetail.id} created. Starting diagnosis.`, "success");
      navigate(`/diagnose?caseId=${encodeURIComponent(caseDetail.id)}`);
    } catch {
      setSubmitError("Something went wrong while creating this case. Please try again.");
      showToast("Case could not be created. Please try again.", "error");
      setIsSubmitting(false);
    }
  };

  if (patientsError) {
    return (
      <ErrorState
        message={patientsError}
        onRetry={() => setPatientsRefreshToken((n) => n + 1)}
      />
    );
  }

  if (!patients) {
    return <LoadingSpinner label="Loading patients..." />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <button
        type="button"
        onClick={handleBackClick}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to cases
      </button>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <div>
          <label htmlFor="case-patient" className="mb-1 block text-sm font-medium text-slate-700">
            Patient
          </label>
          {patients.length === 0 ? (
            <p className="text-sm text-slate-500">
              No patients found. Add a patient first from the Patients page.
            </p>
          ) : (
            <select
              id="case-patient"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              aria-invalid={Boolean(errors.patientId)}
              aria-describedby={errors.patientId ? "case-patient-error" : undefined}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
            >
              <option value="">Select a patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.id}
                </option>
              ))}
            </select>
          )}
          {errors.patientId && (
            <p id="case-patient-error" className="mt-1 text-xs text-red-600">
              {errors.patientId}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="case-specimen" className="mb-1 block text-sm font-medium text-slate-700">
            Specimen type
          </label>
          <input
            id="case-specimen"
            type="text"
            value={specimenType}
            onChange={(e) => setSpecimenType(e.target.value)}
            placeholder="e.g. Lung needle biopsy"
            aria-invalid={Boolean(errors.specimenType)}
            aria-describedby={errors.specimenType ? "case-specimen-error" : undefined}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          {errors.specimenType && (
            <p id="case-specimen-error" className="mt-1 text-xs text-red-600">
              {errors.specimenType}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="case-notes" className="mb-1 block text-sm font-medium text-slate-700">
            Clinical notes <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="case-notes"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
        </div>

        <div>
          <p className="mb-1 block text-sm font-medium text-slate-700">Slide image</p>
          <ImageUploader
            file={file}
            previewUrl={previewUrl}
            onFileSelect={handleFileSelect}
            onReset={handleFileReset}
            disabled={isSubmitting}
          />
          {errors.file && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" />
              {errors.file}
            </p>
          )}
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-red-600">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting || patients.length === 0}
          className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
        >
          {isSubmitting ? "Creating case..." : "Create case and continue to diagnosis"}
        </button>
      </form>

      {showLeaveConfirm && (
        <ConfirmDialog
          title="Leave without creating this case?"
          message="You've started filling in case details. Going back now will discard them."
          confirmLabel="Discard and leave"
          cancelLabel="Keep editing"
          variant="danger"
          onConfirm={() => navigate("/cases")}
          onCancel={() => setShowLeaveConfirm(false)}
        />
      )}
    </div>
  );
}
