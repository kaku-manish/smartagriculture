from PIL import Image
img = Image.new('RGB', (100, 100), color=(0, 128, 0))
img.save('test_paddy.jpg')
print('Test image created: test_paddy.jpg')
