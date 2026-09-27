from image_matcher import calculate_image_similarity

image1 = "backend/uploads/Screenshot (93).png"
image2 = "backend/uploads/Screenshot (92).png"

score = calculate_image_similarity(
    image1,
    image2
)

print("Image Similarity:", score)
print("Percentage:", round(score * 100, 2), "%")