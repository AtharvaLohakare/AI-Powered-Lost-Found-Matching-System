from PIL import Image
import imagehash
import numpy as np


# =========================================================
# NORMALIZE IMAGE
# =========================================================

def load_image(path):
    """
    Opens and normalizes image for comparison.
    """

    image = Image.open(path)

    image = image.convert("RGB")

    return image


# =========================================================
# HASH SIMILARITY
# =========================================================

def hash_similarity(hash1, hash2):
    """
    Converts hash distance into similarity from 0 to 1.
    """

    distance = hash1 - hash2

    total_bits = len(hash1.hash) ** 2

    if total_bits == 0:
        return 0.0

    similarity = 1 - (
        distance / total_bits
    )

    return max(
        0.0,
        min(
            1.0,
            similarity
        )
    )


# =========================================================
# COLOR HISTOGRAM
# =========================================================

def calculate_color_similarity(
    image1,
    image2
):
    """
    Compares basic RGB color distributions.
    """

    img1 = image1.resize(
        (64, 64)
    )

    img2 = image2.resize(
        (64, 64)
    )

    arr1 = np.asarray(
        img1,
        dtype=np.float32
    )

    arr2 = np.asarray(
        img2,
        dtype=np.float32
    )

    hist1 = []

    hist2 = []

    # 16 bins per RGB channel
    for channel in range(3):

        h1, _ = np.histogram(
            arr1[:, :, channel],
            bins=16,
            range=(0, 256)
        )

        h2, _ = np.histogram(
            arr2[:, :, channel],
            bins=16,
            range=(0, 256)
        )

        h1 = h1.astype(
            np.float32
        )

        h2 = h2.astype(
            np.float32
        )

        if h1.sum() > 0:

            h1 = h1 / h1.sum()

        if h2.sum() > 0:

            h2 = h2 / h2.sum()

        hist1.extend(h1)

        hist2.extend(h2)

    hist1 = np.array(
        hist1,
        dtype=np.float32
    )

    hist2 = np.array(
        hist2,
        dtype=np.float32
    )

    distance = np.mean(
        np.abs(
            hist1 - hist2
        )
    )

    similarity = 1 - distance

    return max(
        0.0,
        min(
            1.0,
            float(similarity)
        )
    )


# =========================================================
# MAIN IMAGE SIMILARITY
# =========================================================

def calculate_image_similarity(
    image1_path,
    image2_path
):
    """
    Calculates combined visual similarity.

    pHash      = 40%
    dHash      = 25%
    aHash      = 15%
    Color      = 20%

    Returns value between 0 and 1.
    """

    image1 = load_image(
        image1_path
    )

    image2 = load_image(
        image2_path
    )

    # -----------------------------------------------------
    # PERCEPTUAL HASH
    # -----------------------------------------------------

    phash1 = imagehash.phash(
        image1
    )

    phash2 = imagehash.phash(
        image2
    )

    phash_score = hash_similarity(
        phash1,
        phash2
    )

    # -----------------------------------------------------
    # DIFFERENCE HASH
    # -----------------------------------------------------

    dhash1 = imagehash.dhash(
        image1
    )

    dhash2 = imagehash.dhash(
        image2
    )

    dhash_score = hash_similarity(
        dhash1,
        dhash2
    )

    # -----------------------------------------------------
    # AVERAGE HASH
    # -----------------------------------------------------

    ahash1 = imagehash.average_hash(
        image1
    )

    ahash2 = imagehash.average_hash(
        image2
    )

    ahash_score = hash_similarity(
        ahash1,
        ahash2
    )

    # -----------------------------------------------------
    # COLOR
    # -----------------------------------------------------

    color_score = calculate_color_similarity(
        image1,
        image2
    )

    # -----------------------------------------------------
    # FINAL IMAGE SCORE
    # -----------------------------------------------------

    similarity = (
        (phash_score * 0.40)
        +
        (dhash_score * 0.25)
        +
        (ahash_score * 0.15)
        +
        (color_score * 0.20)
    )

    return max(
        0.0,
        min(
            1.0,
            float(similarity)
        )
    )