"""
AGNIDRISHTI - Test Suite for Priority 3 Real Event Classification Layer
Tests:
- feature extraction
- missing features handling
- prediction within target classes
- probability distributions
- low-confidence results
- API output enrichment
- model loading & serialization
- model unavailable fallback
- invalid input resilience
"""

import os
import pytest
import numpy as np
from ml_classifier import (
    EventClassifier,
    build_feature_vector,
    generate_supporting_evidence,
    generate_reference_baseline_dataset,
    get_event_classifier,
    TARGET_CLASSES,
    FEATURE_NAMES
)
from classifier import classify_thermal_point


def test_feature_extraction_complete():
    """Verifies that a fully populated event produces a valid 19-dim feature vector and dict."""
    event = {
        "latitude": 21.105,
        "longitude": 72.647,
        "frp": 45.0,
        "brightness": 350.0,
        "confidence": "high",
        "satellite": "VIIRS_SNPP",
        "acq_time": "1330",
        "daynight": "D",
        "baseline_frp_mw": 40.0,
        "temporal_profile": {
            "persistence_score": 85.0,
            "observations_last_30d": 24,
            "day_night_ratio": "24/7 continuous"
        },
        "persistent_source": {
            "distinct_observation_days": 18,
            "recurrence_per_week": 5.5,
            "frp_trend": "STABLE"
        }
    }
    vec, feat_dict = build_feature_vector(event)
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (len(FEATURE_NAMES),)
    assert len(FEATURE_NAMES) == 19
    assert feat_dict["frp"] == 45.0
    assert feat_dict["brightness"] == 350.0
    assert feat_dict["confidence"] == 0.95
    assert feat_dict["acquisition_hour"] == 13.0
    assert feat_dict["distance_to_industrial_km"] <= 2.0
    assert feat_dict["persistence"] == 85.0
    assert feat_dict["observation_count"] == 24
    assert feat_dict["distinct_observation_days"] == 18
    assert feat_dict["recurrence"] == 5.5
    assert feat_dict["diurnal_behavior"] == 3  # continuous


def test_feature_extraction_missing_features():
    """Verifies that an event with missing, null, or invalid fields handles defaults safely."""
    empty_event = {}
    vec, feat_dict = build_feature_vector(empty_event)
    assert isinstance(vec, np.ndarray)
    assert vec.shape == (len(FEATURE_NAMES),)
    # Default values applied
    assert feat_dict["frp"] == 0.0
    assert feat_dict["brightness"] == 300.0
    assert feat_dict["confidence"] == 0.65
    assert feat_dict["observation_count"] == 1
    assert feat_dict["distinct_observation_days"] == 1
    assert feat_dict["persistence"] == 0.0

    # Event with empty strings and None values
    null_event = {
        "frp": None,
        "brightness": "",
        "confidence": None,
        "latitude": None,
        "longitude": None,
        "acq_time": ""
    }
    vec2, feat_dict2 = build_feature_vector(null_event)
    assert vec2.shape == (len(FEATURE_NAMES),)
    assert not np.isnan(vec2).any()


def test_prediction_target_classes():
    """Verifies that predicted classes strictly belong to the 5 TARGET_CLASSES."""
    clf = get_event_classifier()
    assert clf.is_loaded

    test_events = [
        {"latitude": 21.105, "longitude": 72.647, "frp": 120.0, "baseline_frp_mw": 35.0}, # Hazira (Industrial)
        {"latitude": 22.350, "longitude": 69.870, "frp": 45.0, "baseline_frp_mw": 45.0},  # Jamnagar (Gas Flare)
        {"latitude": 23.750, "longitude": 86.400, "frp": 40.0, "baseline_frp_mw": 50.0},  # Jharia (Mining)
        {"latitude": 30.500, "longitude": 75.800, "frp": 25.0, "acq_time": "1200"},        # Punjab (Agriculture)
        {"latitude": 21.800, "longitude": 86.300, "frp": 60.0, "acq_time": "1300"}         # Similipal (Wildfire)
    ]

    for ev in test_events:
        res = clf.assess_event(ev)
        assert res["predicted_class"] in TARGET_CLASSES
        assert isinstance(res["model_confidence"], int)
        assert 0 <= res["model_confidence"] <= 100


def test_predict_proba_distribution():
    """Verifies that predict_proba returns a valid probability distribution summing to ~1.0."""
    clf = get_event_classifier()
    vec, _ = build_feature_vector({"latitude": 21.105, "longitude": 72.647, "frp": 40.0})
    probs = clf.predict_proba(vec)
    assert isinstance(probs, dict)
    for c in TARGET_CLASSES:
        assert c in probs
        assert 0.0 <= probs[c] <= 1.0
    total = sum(probs.values())
    assert total == pytest.approx(1.0, rel=1e-2)


def test_low_confidence_uncertainty():
    """Verifies that low-confidence events are flagged as LOW CONFIDENCE without forceful assertions."""
    clf = get_event_classifier()
    # Ambiguous neutral event in middle of nowhere with low FRP
    ambiguous_event = {
        "latitude": 20.0,
        "longitude": 78.0,
        "frp": 3.0,
        "brightness": 305.0,
        "confidence": 0.2
    }
    res = clf.assess_event(ambiguous_event)
    # If confidence is below threshold, must flag is_low_confidence
    if res["confidence_score"] < 0.55:
        assert res["is_low_confidence"] is True
        assert res["confidence_display"] == "LOW CONFIDENCE"
        assert "Consistent with" in res["assessment_summary"]


def test_classification_safety():
    """Verifies that the system never claims 'Confirmed' without authoritative confirmation."""
    clf = get_event_classifier()
    res = clf.assess_event({"latitude": 21.105, "longitude": 72.647, "frp": 40.0})
    
    # Must never say 'Confirmed'
    assert "Confirmed" not in res["likely_class"]
    assert "Confirmed" not in res["assessment_summary"]
    for bullet in res["supporting_evidence"]:
        assert "Confirmed" not in bullet
    
    # Must use safety prefixes
    assert ("Likely class" in res["assessment_summary"] or "Consistent with" in res["assessment_summary"])


def test_supporting_evidence_derivation():
    """Verifies that supporting evidence bullets are derived from actual feature values."""
    features = {
        "distance_to_industrial_km": 0.8,
        "nearest_facility_name": "Test Refinery",
        "observation_count": 14,
        "persistence": 80.0,
        "recurrence": 4.0,
        "diurnal_behavior": 3,
        "frp": 45.0,
        "baseline_frp": 40.0,
        "anomaly_ratio": 1.12,
        "proximity_to_mining_km": 50.0,
        "proximity_to_agriculture_km": 30.0,
        "proximity_to_forest_km": 40.0,
        "acquisition_hour": 14
    }
    evidence = generate_supporting_evidence(features, "GAS_FLARE")
    assert len(evidence) >= 2
    # Verify features are actually reflected in the text
    text = " ".join(evidence)
    assert "Test Refinery" in text or "0.8" in text or "14" in text or "24/7" in text


def test_model_save_and_load(tmp_path):
    """Verifies saving and loading of model weights."""
    model_file = str(tmp_path / "test_model.joblib")
    clf = EventClassifier(model_path=model_file)
    X, y = generate_reference_baseline_dataset()
    clf.train(X, y)
    clf.save_model()
    assert os.path.exists(model_file)

    clf2 = EventClassifier(model_path=model_file)
    assert clf2.load_model()
    vec, _ = build_feature_vector({"frp": 50.0})
    pred = clf2.predict(vec)
    assert pred in TARGET_CLASSES


def test_model_unavailable_fallback():
    """Verifies that loading from a non-existent path fails gracefully without crash."""
    clf = EventClassifier(model_path="non_existent_dir/nowhere.joblib")
    loaded = clf.load_model()
    assert loaded is False
    assert clf.is_loaded is False


def test_invalid_input_resilience():
    """Verifies that bizarre or non-numeric inputs do not crash the assessment pipeline."""
    clf = get_event_classifier()
    garbage_input = {
        "latitude": "invalid_lat",
        "longitude": [1, 2, 3],
        "frp": "not-a-number",
        "brightness": None,
        "temporal_profile": "broken_string_instead_of_dict"
    }
    res = clf.assess_event(garbage_input)
    assert res["predicted_class"] in TARGET_CLASSES
    assert isinstance(res["model_confidence"], int)


def test_api_enrichment_output():
    """Verifies that classify_thermal_point enriches events with model_assessment."""
    raw_pt = {
        "fire_id": "TEST-PT-001",
        "latitude": 21.105,
        "longitude": 72.647,
        "frp": 42.0,
        "brightness": 340.0,
        "confidence": "nominal",
        "satellite": "SNPP",
        "acq_time": "1200"
    }
    classified = classify_thermal_point(raw_pt)
    assert "predicted_class" in classified
    assert classified["predicted_class"] in TARGET_CLASSES
    assert "model_confidence" in classified
    assert "supporting_features" in classified
    assert "model_assessment" in classified
    assert "likely_class" in classified["model_assessment"]
    assert "supporting_evidence" in classified["model_assessment"]


def test_evaluation_report_status():
    """Verifies Task 5 requirement: explicit 'Evaluation dataset insufficient' status."""
    clf = get_event_classifier()
    X, y = generate_reference_baseline_dataset()
    report = clf.evaluate(X, y)
    assert report["evaluation_status"] == "Evaluation dataset insufficient"
    assert "confusion_matrix" in report
    assert "accuracy" in report
    assert "f1_score" in report
    assert len(report["confusion_matrix"]) == len(TARGET_CLASSES)
