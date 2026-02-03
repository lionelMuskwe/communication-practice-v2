"""
Utility functions for OpenAI integration.
"""
from typing import List, Optional


class SentenceDetector:
    """
    Detects sentence boundaries in streaming text.

    Handles edge cases:
    - Abbreviations (Dr., Mrs., Mr., Ms., Prof., etc.)
    - Decimals (3.14, 0.5)
    - URLs (http://example.com)
    - Ellipsis (...)
    - Multiple punctuation (!!, ?!)
    """

    ABBREVIATIONS = frozenset([
        'dr', 'mr', 'mrs', 'ms', 'prof', 'sr', 'jr', 'st', 'ave', 'blvd',
        'etc', 'vs', 'inc', 'ltd', 'co', 'corp', 'dept', 'est', 'approx',
        'fig', 'no', 'vol', 'pp', 'ed', 'rev', 'gen', 'col', 'lt', 'sgt',
        'capt', 'maj', 'jan', 'feb', 'mar', 'apr', 'jun', 'jul', 'aug',
        'sep', 'sept', 'oct', 'nov', 'dec', 'mon', 'tue', 'wed', 'thu',
        'fri', 'sat', 'sun', 'e.g', 'i.e', 'a.m', 'p.m', 'b.c', 'a.d',
    ])

    SENTENCE_ENDINGS = '.!?'

    def __init__(self):
        self._buffer = ""
        self._completed_sentences: List[str] = []

    def add_token(self, token: str) -> List[str]:
        """
        Add a token to the buffer and return any completed sentences.

        Args:
            token: New text token to process

        Returns:
            List of newly completed sentences (may be empty)
        """
        self._buffer += token
        return self._extract_sentences()

    def flush(self) -> Optional[str]:
        """
        Flush remaining buffer as final sentence.

        Returns:
            Remaining text if any, None otherwise
        """
        if self._buffer.strip():
            final = self._buffer.strip()
            self._buffer = ""
            return final
        return None

    def _extract_sentences(self) -> List[str]:
        """Extract complete sentences from buffer."""
        sentences = []

        while True:
            boundary = self._find_sentence_boundary()
            if boundary is None:
                break

            sentence = self._buffer[:boundary + 1].strip()
            self._buffer = self._buffer[boundary + 1:].lstrip()

            if sentence:
                sentences.append(sentence)

        return sentences

    def _find_sentence_boundary(self) -> Optional[int]:
        """
        Find the index of a sentence-ending punctuation.

        Returns:
            Index of sentence boundary, or None if no complete sentence found
        """
        i = 0
        while i < len(self._buffer):
            char = self._buffer[i]

            if char in self.SENTENCE_ENDINGS:
                if self._is_valid_sentence_end(i):
                    return i

            i += 1

        return None

    def _is_valid_sentence_end(self, index: int) -> bool:
        """
        Check if the punctuation at index is a valid sentence ending.

        Args:
            index: Position of punctuation in buffer

        Returns:
            True if this is a valid sentence boundary
        """
        if index >= len(self._buffer) - 1:
            return False

        char = self._buffer[index]
        next_char = self._buffer[index + 1] if index + 1 < len(self._buffer) else ''

        if char == '.':
            if not self._is_period_sentence_end(index):
                return False

        if char in '!?':
            if index + 1 < len(self._buffer) and self._buffer[index + 1] in '!?':
                return False

        if next_char == ' ':
            after_space_idx = index + 2
            if after_space_idx < len(self._buffer):
                after_space = self._buffer[after_space_idx]
                if after_space.isupper() or after_space in '"\'(':
                    return True
                if after_space.isalpha():
                    return True
            return True

        if next_char in '"\')':
            if index + 2 < len(self._buffer):
                after_quote = self._buffer[index + 2]
                if after_quote == ' ':
                    return True

        return False

    def _is_period_sentence_end(self, index: int) -> bool:
        """
        Determine if a period is a sentence end vs abbreviation/decimal.

        Args:
            index: Position of period in buffer

        Returns:
            True if this period ends a sentence
        """
        if index == 0:
            return False

        before = self._buffer[:index]

        if self._is_url_context(before):
            return False

        if self._is_decimal_context(before, index):
            return False

        if self._is_ellipsis_context(index):
            return False

        if self._is_abbreviation_context(before):
            return False

        return True

    def _is_url_context(self, before: str) -> bool:
        """Check if we're inside a URL."""
        lower = before.lower()
        url_patterns = ['http://', 'https://', 'www.', 'ftp://']
        for pattern in url_patterns:
            if pattern in lower:
                after_pattern = lower.split(pattern)[-1]
                if ' ' not in after_pattern:
                    return True
        return False

    def _is_decimal_context(self, before: str, index: int) -> bool:
        """Check if period is part of a decimal number."""
        if not before:
            return False

        if before[-1].isdigit():
            after_idx = index + 1
            if after_idx < len(self._buffer) and self._buffer[after_idx].isdigit():
                return True

        return False

    def _is_ellipsis_context(self, index: int) -> bool:
        """Check if period is part of an ellipsis (...)."""
        if index >= 2 and self._buffer[index - 1] == '.' and self._buffer[index - 2] == '.':
            return True

        if index + 1 < len(self._buffer) and self._buffer[index + 1] == '.':
            return True

        return False

    def _is_abbreviation_context(self, before: str) -> bool:
        """Check if period follows an abbreviation."""
        words = before.split()
        if not words:
            return False

        last_word = words[-1].lower().rstrip('.')

        if last_word in self.ABBREVIATIONS:
            return True

        if len(last_word) <= 2 and last_word.isalpha():
            return True

        return False

    @property
    def buffer_content(self) -> str:
        """Get current buffer content."""
        return self._buffer

    def reset(self):
        """Reset detector state."""
        self._buffer = ""
        self._completed_sentences = []


def split_into_sentences(text: str) -> List[str]:
    """
    Split text into sentences.

    Convenience function for non-streaming use cases.

    Args:
        text: Full text to split

    Returns:
        List of sentences
    """
    detector = SentenceDetector()
    sentences = detector.add_token(text)

    final = detector.flush()
    if final:
        sentences.append(final)

    return sentences
