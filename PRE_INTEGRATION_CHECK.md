# Pre-integration status

This revision is safe to proceed with for local checkpoint validation.

Verified in this environment:
- Exact Stage-2 architecture copied from the uploaded notebook.
- ML configuration uses the notebook's exact 9-class order.
- Node and ML class order are synchronized.
- Checkpoint metadata (`classes` and `class_to_idx`) is validated before weights load.
- Model is constructed from the checkpoint's saved `config`.
- Strict state-dict compatibility is enforced.
- Validation/test preprocessing is 224x224 with ImageNet normalization.
- Python compilation succeeds.
- ML tests: 11 passed.

Run locally after placing the checkpoint:

```bash
cd ml-service
python scripts/validate_model_integration.py --checkpoint models/patho_stage2_best.pth
```

Do not start the full web stack until this command reports that the checkpoint loads and dummy inference returns 9 probabilities.
