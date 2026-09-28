from __future__ import annotations

import pytest
from app.ml.transcript_analysis import (
    analyze_transcript,
    TranscriptAnalysisResult,
)


def test_empty_transcript_returns_zero_indicators():
    res = analyze_transcript("")
    assert isinstance(res, TranscriptAnalysisResult)
    assert res.total_indicators == 0
    assert not res.has_suspicious_content


def test_clean_transcript_has_no_signals():
    clean_text = "Good morning, I am calling to confirm your dentist appointment scheduled for tomorrow at two o'clock."
    res = analyze_transcript(clean_text)
    assert res.total_indicators == 0
    assert not res.has_suspicious_content
    assert "No suspicious" in res.summary


def test_detects_otp_and_verification_signals():
    text = "Please share the OTP you just received on your mobile, code 492810."
    res = analyze_transcript(text)
    assert res.has_suspicious_content
    assert res.high_severity_count >= 1
    categories = [ind.category for ind in res.indicators]
    assert "otp_request" in categories


def test_detects_hinglish_otp_phrase():
    text = "Sir jaldi apna OTP bataiye transaction verify karne ke liye."
    res = analyze_transcript(text)
    assert res.has_suspicious_content
    categories = [ind.category for ind in res.indicators]
    assert "otp_request" in categories


def test_detects_hindi_devanagari_signals():
    text = "कृपया अपना ओटीपी बताएं और तुरंत पैसे खाते में डालें वरना पुलिस आ जाएगी।"
    res = analyze_transcript(text)
    assert res.has_suspicious_content
    categories = [ind.category for ind in res.indicators]
    assert "otp_request" in categories
    assert any(c in categories for c in ("urgency_threat", "payment_instruction"))


def test_detects_digital_arrest_and_coercion():
    text = "You are placed under digital arrest by CBI and customs. Non-bailable arrest warrant has been issued."
    res = analyze_transcript(text)
    assert res.has_suspicious_content
    categories = [ind.category for ind in res.indicators]
    assert "urgency_threat" in categories
    assert "impersonation" in categories


def test_detects_financial_upi_payment_demand():
    text = "You must pay a clearance penalty of ₹25,000 via UPI or GPay within 15 minutes."
    res = analyze_transcript(text)
    assert res.has_suspicious_content
    categories = [ind.category for ind in res.indicators]
    assert "payment_instruction" in categories
    assert "urgency_threat" in categories


def test_detects_remote_access_and_secrecy_instructions():
    text = "Download AnyDesk app right now and don't tell anyone about this call, it is confidential."
    res = analyze_transcript(text)
    assert res.has_suspicious_content
    categories = [ind.category for ind in res.indicators]
    assert "suspicious_instruction" in categories


def test_to_dict_serialization():
    text = "Your bank account will be blocked unless you share your card number and pin immediately."
    res = analyze_transcript(text)
    d = res.to_dict()
    assert "indicators" in d
    assert "summary" in d
    assert "total_indicators" in d
    assert d["total_indicators"] > 0
    assert d["has_suspicious_content"] is True
    assert "disclaimer" in d
