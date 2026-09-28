import imagehash
from PIL import Image


def calculate_image_similarity(image1_path, image2_path):
    image1 = Image.open(image1_path).convert("RGB")
    image2 = Image.open(image2_path).convert("RGB")

    hash1 = imagehash.phash(image1)
    hash2 = imagehash.phash(image2)

    distance = hash1 - hash2

    max_distance = len(hash1.hash) ** 2

    similarity = 1 - (distance / max_distance)

    similarity = max(
        0.0,
        min(1.0, similarity)
    )

    return similarity