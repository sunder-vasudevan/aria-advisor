import re
from typing import List

_DANGEROUS_PATTERNS: List[re.Pattern] = [
    re.compile(r'[A-Z_]{4,}[\s]*[=:][\s]*\S+'),
    re.compile(r'(?i)(RESPONSE FORMAT|TALKING POINTS|KEY RISKS|SITUATION SUMMARY|QUESTIONS TO ASK)\s*[—\-]'),
    re.compile(r'eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+'),
    re.compile(r'postgres(?:ql)?://[^\s]+'),
]


def sanitize_ai_response(text: str) -> str:
    for pattern in _DANGEROUS_PATTERNS:
        text = pattern.sub('[REDACTED]', text)
    return text
