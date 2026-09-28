import re
from collections import Counter


def tokenize(text):
    text = text.lower()
    words = re.findall(r"\b\w+\b", text)
    return words


def calculate_text_similarity(text1, text2):
    words1 = tokenize(text1)
    words2 = tokenize(text2)

    if not words1 or not words2:
        return 0.0

    counter1 = Counter(words1)
    counter2 = Counter(words2)

    common_words = set(counter1) & set(counter2)

    if not common_words:
        return 0.0

    intersection = sum(
        min(counter1[word], counter2[word])
        for word in common_words
    )

    total = max(
        sum(counter1.values()),
        sum(counter2.values())
    )

    similarity = intersection / total

    return similarity