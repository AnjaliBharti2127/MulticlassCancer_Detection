from app.model_integration import CLASS_NAMES, MODEL_CONFIG


def test_model_contract_has_exactly_nine_unique_classes():
    assert len(CLASS_NAMES) == 9
    assert len(set(CLASS_NAMES)) == 9


def test_model_config_is_enabled_after_exact_architecture_is_added():
    assert MODEL_CONFIG["configured"] is True


def test_probability_contract_is_decimal_based():
    threshold = float(MODEL_CONFIG["uncertainty_threshold"])
    assert 0 <= threshold <= 1
