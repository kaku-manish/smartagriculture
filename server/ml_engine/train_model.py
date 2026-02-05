import os
import tensorflow as tf
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout
from tensorflow.keras.models import Model
from tensorflow.keras.optimizers import Adam

# Configuration
DATASET_DIR = 'archive/paddy-disease-classification/train_images'
IMG_SIZE = (224, 224)
BATCH_SIZE = 32
EPOCHS = 10 # Adjust as needed
LEARNING_RATE = 0.0001
MODEL_SAVE_PATH = 'paddy_disease_model.h5'

def train():
    print(f"Checking dataset at: {DATASET_DIR}")
    if not os.path.exists(DATASET_DIR):
        print("Error: Dataset directory not found!")
        return

    # Data Augmentation & Loading
    train_datagen = ImageDataGenerator(
        rescale=1./255,
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        shear_range=0.2,
        zoom_range=0.2,
        horizontal_flip=True,
        validation_split=0.2 # Use 20% for validation
    )

    print("Loading Training Validation Data...")
    train_generator = train_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='training'
    )

    validation_generator = train_datagen.flow_from_directory(
        DATASET_DIR,
        target_size=IMG_SIZE,
        batch_size=BATCH_SIZE,
        class_mode='categorical',
        subset='validation'
    )

    num_classes = len(train_generator.class_indices)
    print(f"Detected {num_classes} classes: {train_generator.class_indices}")

    # Build Model (Transfer Learning with MobileNetV2)
    base_model = MobileNetV2(weights='imagenet', include_top=False, input_shape=IMG_SIZE + (3,))
    
    # Freeze base model layers
    base_model.trainable = False

    x = base_model.output
    x = GlobalAveragePooling2D()(x)
    x = Dropout(0.2)(x)
    x = Dense(128, activation='relu')(x)
    predictions = Dense(num_classes, activation='softmax')(x)

    model = Model(inputs=base_model.input, outputs=predictions)

    model.compile(optimizer=Adam(learning_rate=LEARNING_RATE),
                  loss='categorical_crossentropy',
                  metrics=['accuracy'])

    print("Starting Training...")
    history = model.fit(
        train_generator,
        steps_per_epoch=train_generator.samples // BATCH_SIZE,
        validation_data=validation_generator,
        validation_steps=validation_generator.samples // BATCH_SIZE,
        epochs=EPOCHS
    )

    print("Training Complete. Saving Model...")
    model.save(MODEL_SAVE_PATH)
    
    # Save Class Indices for prediction mapping
    import json
    with open('class_indices.json', 'w') as f:
        json.dump(train_generator.class_indices, f)
    
    print(f"Model saved to {MODEL_SAVE_PATH}")
    print("Class indices saved to class_indices.json")

if __name__ == "__main__":
    train()
