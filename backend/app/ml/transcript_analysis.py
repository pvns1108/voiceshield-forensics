"""
Transcript-based analysis for VoiceShield.

Analyzes the spoken content of audio transcripts for potential
indicators of social engineering or fraud (e.g., OTP requests,
password/banking info, urgency/threats, impersonation, payment demands).

Includes comprehensive pattern matching for:
- General English accents and terminology
- Indian English idioms and terminology
- Hindi (Devanagari script)
- Hinglish (Hindi-English code-switching and Romanized Hindi phrases)
- Common Indian scam types (Digital Arrest, Electricity Bill, Customs Parcel, KYC Freeze)

IMPORTANT DISCLAIMER:
This is a rule-based baseline, not a trained classifier or verdict.
It identifies patterns in the transcript text that MAY indicate suspicious
behavior — it does NOT prove fraud. Every indicator is clearly labeled
as a heuristic observation for analyst review.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


@dataclass
class TranscriptIndicator:
    """A single suspicious pattern found in the transcript."""
    category: str           # e.g., "otp_request", "password_request"
    matched_text: str       # the text that triggered this indicator
    severity: str           # "low" | "medium" | "high"
    note: str = ""          # human-readable explanation

    def to_dict(self) -> dict[str, Any]:
        return {
            "category": self.category,
            "matched_text": self.matched_text,
            "severity": self.severity,
            "note": self.note,
        }


@dataclass
class TranscriptAnalysisResult:
    """Result of transcript analysis."""
    indicators: list[TranscriptIndicator] = field(default_factory=list)
    summary: str = ""
    total_indicators: int = 0
    high_severity_count: int = 0
    medium_severity_count: int = 0
    low_severity_count: int = 0
    has_suspicious_content: bool = False
    disclaimer: str = (
        "These heuristic observations are pattern-matching indicators for human review. "
        "They do not constitute proof of fraud or voice synthesis."
    )

    def to_dict(self) -> dict[str, Any]:
        return {
            "indicators": [i.to_dict() for i in self.indicators],
            "summary": self.summary,
            "total_indicators": self.total_indicators,
            "high_severity_count": self.high_severity_count,
            "medium_severity_count": self.medium_severity_count,
            "low_severity_count": self.low_severity_count,
            "has_suspicious_content": self.has_suspicious_content,
            "disclaimer": self.disclaimer,
        }


# --- Pattern definitions (multilingual & Indian scam coverage) ---

# OTP / verification code patterns
OTP_PATTERNS = [
    r"\b\d{4,6}\b",                                              # standalone 4-6 digit numeric codes
    r"\b(OTP|otp|one.?time.?password|verification.?code)\b",
    r"\b(code|verification|verify)\b.{0,30}\b\d{4,6}\b",
    r"\b(otp|code|pin)\s+(batao|bataiye|bhejo|share\s+karo|dijiye|bolo)\b",  # Hinglish
    r"(?:^|[\s\u0964\.,!?])(ओटीपी|ओ\.टी\.पी|पासकोड|वेरिफिकेशन\s*कोड)",        # Hindi
]

# Password / credential patterns
PASSWORD_PATTERNS = [
    r"\b(password|passcode|pin|secret|credential|net.?banking)\b.{0,50}",
    r"\b(login|sign.?in|username)\b.{0,50}",
    r"\b(ATM|bank|debit|credit).{0,30}\b(card|account|cvv|expiry)\b",
    r"\b(cvv|cvv2|card\s+number|account\s+number)\b",
    r"\b(pin|password)\s+(bataiye|bhejo|dijiye|mat\s+batana)\b",              # Hinglish
    r"(?:^|[\s\u0964\.,!?])(पासवर्ड|पिन|कार्ड\s*नंबर|सीवीवी)",                 # Hindi
]

# Urgency / threat / legal coercion patterns (Digital Arrest, Utility Cutoff)
URGENCY_PATTERNS = [
    r"\b(urgent|urgently|immediately|right now|right away|act now|hurry|don't wait)\b",
    r"\bwithin\s+\d+\s+(minutes|hours)\b",
    r"\b(digital\s+arrest|non.?bailable|arrest\s+warrant|police\s+case|fir\s+registered)\b",
    r"\b(threat|arrest|legal action|police|court|jail|prison)\b",
    r"\b(limited time|expires|deadline|final notice|immediate\s+suspension)\b",
    r"\b(will be suspended|blocked|closed|deactivated|disconnected|frozen)\b",
    r"\b(electricity\s+will\s+be\s+disconnected|power\s+cut)\b",
    r"\b(turant|jaldi|fatafat|aaj\s+hi|24\s+ghante\s+ke\s+andar)\b",          # Hinglish
    r"\b(bijli\s+kat\s+jayegi|line\s+kat\s+jayegi|account\s+block|giraftar|jail)\b", # Hinglish
    r"(?:^|[\s\u0964\.,!?])(तुरंत|जल्दी|गिरफ्तार|वारंट|जेल|बिजली\s*कट|अकाउंट\s*बंद)", # Hindi
]

# Impersonation patterns (Law enforcement, Banks, Courier/Customs)
IMPERSONATION_PATTERNS = [
    r"\b(bank|police|government|IRS|tax|customs|cbi|ed|trai|rbi|cyber\s+crime|narcotics).{0,50}\b",
    r"\b(courier|delivery|fedex|dhl|postal|post\s+office|customs\s+department)\b",
    r"\b(illegal\s+parcel|contraband|passport\s+seized|drugs\s+found)\b",
    r"\b(customer service|customer\s+care|support|helpline|fraud\s+department)\b",
    r"\b(manager|supervisor|officer|inspector|dsp|sho|agent)\b.{0,30}",
    r"\b(police\s+station|thana|customs\s+se|bank\s+se\s+bol\s+raha)\b",      # Hinglish
    r"(?:^|[\s\u0964\.,!?])(कस्टम्स|सीबीआई|पुलिस|थाना|आरबीआई|बैंक\s*अधिकारी)",    # Hindi
]

# Payment / financial transfer patterns (UPI, NEFT, Security deposits)
PAYMENT_PATTERNS = [
    r"\b(pay|payment|transfer|wire|send money|deposit|clearance)\b.{0,50}",
    r"\b(UPI|IMPS|NEFT|RTGS|google\s*pay|gpay|phonepe|paytm)\b.{0,30}",
    r"\b(₹|INR|rupees|lakh|crore|dollars|euro)\b.{0,30}",
    r"\b(processing\s+fee|clearance\s+charge|refundable\s+deposit|penalty|fine|bail)\b",
    r"\b(paise\s+bhejo|transfer\s+karo|rupaye\s+dalo|khate\s+me)\b",          # Hinglish
    r"(?:^|[\s\u0964\.,!?])(पैसे\s*भेजो|ट्रांसफर\s*करो|रुपये|खाते\s*में|जमा\s*करो)", # Hindi
]

# Suspicious instructions (Screen sharing, Remote access, Secrecy)
SUSPICIOUS_INSTRUCTIONS = [
    r"\b(don't tell|keep secret|don't share|confidential|do\s+not\s+hang\s+up|stay\s+on\s+the\s+call)\b",
    r"\b(remote access|screen share|anydesk|teamviewer|rustdesk|quicksupport)\b",
    r"\b(click|link|download|install|apk|app)\b.{0,50}\b(here|now|this|given)\b",
    r"\b(phone\s+mat\s+katna|call\s+pe\s+bane\s+raho|kisi\s+ko\s+mat\s+batana)\b",  # Hinglish
    r"\b(app\s+download\s+karo|link\s+pe\s+click\s+karo)\b",                         # Hinglish
    r"(?:^|[\s\u0964\.,!?])(फोन\s*मत\s*काटना|किसी\s*को\s*मत\s*बताना|ऐप\s*डाउनलोड|लिंक\s*पर\s*क्लिक)",  # Hindi
]


CATEGORY_SEVERITY = {
    "otp_request": "high",
    "password_request": "high",
    "urgency_threat": "medium",
    "impersonation": "medium",
    "payment_instruction": "high",
    "suspicious_instruction": "medium",
}

CATEGORY_EXPLANATION = {
    "otp_request": "Request or mention of OTP / verification code — common in unauthorized transactions.",
    "password_request": "Request for credentials, passwords, or PINs — typical credential harvesting.",
    "urgency_threat": "High-pressure urgency, threat of arrest, or service cutoff — common pressure tactic.",
    "impersonation": "Claim of authority (police, customs, CBI, bank) — typical social engineering setup.",
    "payment_instruction": "Payment / transfer demands (UPI, deposit, fine) — direct financial solicitation.",
    "suspicious_instruction": "Instructions for secrecy, remote desktop (AnyDesk/TeamViewer), or APK download.",
}


def _search_patterns(text: str, patterns: list[str], category: str) -> list[TranscriptIndicator]:
    """Search text for regex patterns and return matching indicators."""
    indicators = []
    text_clean = text.strip()

    for pattern in patterns:
        try:
            matches = re.finditer(pattern, text_clean, re.IGNORECASE | re.UNICODE)
            for match in matches:
                matched_text = match.group(0).strip()
                if matched_text:
                    indicators.append(
                        TranscriptIndicator(
                            category=category,
                            matched_text=matched_text,
                            severity=CATEGORY_SEVERITY.get(category, "low"),
                            note=CATEGORY_EXPLANATION.get(category, ""),
                        )
                    )
        except re.error:
            continue

    return indicators


def analyze_transcript(text: str) -> TranscriptAnalysisResult:
    """Analyze transcript text for potential fraud and social engineering indicators.

    Args:
        text: The transcript text to analyze.

    Returns:
        TranscriptAnalysisResult with structured indicators, counts, and summary.
    """
    if not text or not text.strip():
        return TranscriptAnalysisResult(
            summary="No transcript text available for analysis."
        )

    all_indicators: list[TranscriptIndicator] = []

    # Search each category
    all_indicators.extend(_search_patterns(text, OTP_PATTERNS, "otp_request"))
    all_indicators.extend(_search_patterns(text, PASSWORD_PATTERNS, "password_request"))
    all_indicators.extend(_search_patterns(text, URGENCY_PATTERNS, "urgency_threat"))
    all_indicators.extend(_search_patterns(text, IMPERSONATION_PATTERNS, "impersonation"))
    all_indicators.extend(_search_patterns(text, PAYMENT_PATTERNS, "payment_instruction"))
    all_indicators.extend(_search_patterns(text, SUSPICIOUS_INSTRUCTIONS, "suspicious_instruction"))

    # Deduplicate indicators by category and lowercased matched text
    seen = set()
    unique_indicators: list[TranscriptIndicator] = []
    for ind in all_indicators:
        key = (ind.category, ind.matched_text.lower())
        if key not in seen:
            seen.add(key)
            unique_indicators.append(ind)

    # Sort indicators by severity: high first, then medium, then low
    severity_order = {"high": 0, "medium": 1, "low": 2}
    unique_indicators.sort(key=lambda x: severity_order.get(x.severity, 3))

    high_count = sum(1 for i in unique_indicators if i.severity == "high")
    med_count = sum(1 for i in unique_indicators if i.severity == "medium")
    low_count = sum(1 for i in unique_indicators if i.severity == "low")
    total = len(unique_indicators)

    if total == 0:
        summary = "No suspicious keyword or phrase patterns identified in the recognized transcript."
    else:
        parts = []
        if high_count > 0:
            parts.append(f"{high_count} high-severity signal(s)")
        if med_count > 0:
            parts.append(f"{med_count} medium-severity signal(s)")
        if low_count > 0:
            parts.append(f"{low_count} low-severity signal(s)")
        summary = (
            f"Detected {', '.join(parts)} in spoken content. "
            "These pattern-based observations are for investigator review and do not constitute proof of fraud."
        )

    return TranscriptAnalysisResult(
        indicators=unique_indicators,
        summary=summary,
        total_indicators=total,
        high_severity_count=high_count,
        medium_severity_count=med_count,
        low_severity_count=low_count,
        has_suspicious_content=total > 0,
    )
