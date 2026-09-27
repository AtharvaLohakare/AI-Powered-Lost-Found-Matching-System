from transformers import CLIPProcessor, CLIPModel
from PIL import Image
import torch

# Load CLIP model
model = CLIPModel.from_pretrained(
    "openai/clip-vit-base-patch32"
)

processor = CLIPProcessor.from_pretrained(
    "openai/clip-vit-base-patch32"
)


def calculate_image_similarity(image1_path, image2_path):

    image1 = Image.open(image1_path).convert("RGB")
    image2 = Image.open(image2_path).convert("RGB")

    inputs1 = processor(
        images=image1,
        return_tensors="pt"
    )

    inputs2 = processor(
        images=image2,
        return_tensors="pt"
    )

    with torch.no_grad():

        embedding1 = model.get_image_features(
            **inputs1
        )

        embedding2 = model.get_image_features(
            **inputs2
        )

    # Handle newer Transformers output format
    if hasattr(embedding1, "pooler_output"):
        embedding1 = embedding1.pooler_output

    if hasattr(embedding2, "pooler_output"):
        embedding2 = embedding2.pooler_output

    # Normalize embeddings
    embedding1 = torch.nn.functional.normalize(
        embedding1,
        p=2,
        dim=-1
    )

    embedding2 = torch.nn.functional.normalize(
        embedding2,
        p=2,
        dim=-1
    )

    # Cosine similarity
    similarity = torch.sum(
        embedding1 * embedding2,
        dim=-1
    )

    return similarity.item()