from ultralytics import YOLO
import os

# Define dataset path
# We point directly to the folder containing class subfolders
DATA_DIR = os.path.abspath('archive/paddy-disease-classification')

# YOLOv8 Classification requires 'train' and 'val' folders usually.
# Since we have 'train_images' with class folders, we will try to use it as the source.
# However, to be safe and standard, we might need to rely on YOLO's flexibility.
# If this fails, we will need to restructure the folders.

def train():
    # Load a pretrained YOLOv8n-cls model
    model = YOLO('yolov8n-cls.pt') 

    print("Starting YOLOv8 Training...")
    
    # Train the model
    # We specify 'data' as the parent folder. 
    # NOTE: If YOLO complains about missing 'train'/'val' folders, 
    # we might need to assume 'train_images' is the training set.
    # Let's try pointing to the folder that contains the class folders directly.
    
    try:
        results = model.train(
            data='archive/paddy-disease-classification/train_images', 
            epochs=5, 
            imgsz=224,
            project='ml_engine/runs',
            name='paddy_cls'
        )
        print("Training completed successfully.")
    except Exception as e:
        print(f"Training failed: {e}")
        print("You may need to restructure the dataset to have 'train' and 'val' folders.")

if __name__ == '__main__':
    train()
