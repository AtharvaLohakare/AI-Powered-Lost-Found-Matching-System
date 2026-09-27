from sentence_transformers import SentenceTransformer, util

# Load the pretrained model
model = SentenceTransformer("all-MiniLM-L6-v2")


def calculate_text_similarity(text1, text2):
    embedding1 = model.encode(
        text1,
        convert_to_tensor=True
    )

    embedding2 = model.encode(
        text2,
        convert_to_tensor=True
    )

    similarity = util.cos_sim(embedding1, embedding2)

    return similarity.item()