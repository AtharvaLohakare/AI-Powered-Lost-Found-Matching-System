from text_matcher import calculate_text_similarity

text1 = "Black backpack with laptop compartment"
text2 = "Dark black college bag having a section for laptop"

score = calculate_text_similarity(text1, text2)

print("Text Similarity:", score)
print("Percentage:", round(score * 100, 2), "%")