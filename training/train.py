"""
Plant Disease Detection Model Training
Using MobileNetV2 with Transfer Learning
"""

import os
import sys
import json
import argparse
import time
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.preprocessing import image as keras_image
from tensorflow.keras.callbacks import (
    EarlyStopping,
    ReduceLROnPlateau,
    ModelCheckpoint,
    TensorBoard
)


class TrainingTimer(keras.callbacks.Callback):
    """Print elapsed time and an estimate after each training epoch."""

    def on_train_begin(self, logs=None):
        self.started_at = time.perf_counter()

    def on_epoch_end(self, epoch, logs=None):
        elapsed = time.perf_counter() - self.started_at
        average_epoch = elapsed / (epoch + 1)
        remaining = average_epoch * (self.params.get('epochs', epoch + 1) - epoch - 1)
        print(
            f"Timer: elapsed {elapsed / 60:.1f} min | "
            f"estimated remaining {remaining / 60:.1f} min"
        )

# Import custom data loader
from data_loader import load_dataset_as_generators


class PlantDiseaseModelTrainer:
    """
    Trains a plant disease detection model using MobileNetV2.
    """
    
    def __init__(self, dataset_root: str, model_dir: str, 
                 img_size: int = 224, epochs_head: int = 10, epochs_finetune: int = 15):
        """
        Initialize trainer.
        
        Args:
            dataset_root: Root path of dataset
            model_dir: Directory to save model
            img_size: Input image size
            epochs_head: Epochs for training classification head only
            epochs_finetune: Epochs for fine-tuning upper layers
        """
        self.dataset_root = dataset_root
        self.model_dir = Path(model_dir)
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        self.img_size = img_size
        self.epochs_head = epochs_head
        self.epochs_finetune = epochs_finetune
        
        self.model = None
        self.train_generator = None
        self.val_generator = None
        self.test_generator = None
        self.class_names = None
        
    def load_data(self, batch_size: int = 32):
        """Load and prepare dataset."""
        print("\n" + "="*60)
        print("LOADING DATASET")
        print("="*60)
        
        self.train_generator, self.val_generator, self.test_generator, \
        self.class_names, class_indices = load_dataset_as_generators(
            self.dataset_root,
            img_size=(self.img_size, self.img_size),
            batch_size=batch_size
        )
        
        print(f"\nClasses: {self.class_names}")
        print(f"Number of classes: {len(self.class_names)}")
        
    def build_model(self):
        """Build MobileNetV2 model with transfer learning."""
        print("\n" + "="*60)
        print("BUILDING MODEL")
        print("="*60)
        
        # Load pretrained MobileNetV2
        base_model = MobileNetV2(
            input_shape=(self.img_size, self.img_size, 3),
            include_top=False,
            weights='imagenet'
        )
        
        # Freeze base model initially
        base_model.trainable = False
        
        # Create model
        inputs = keras.Input(shape=(self.img_size, self.img_size, 3))
        
        # Preprocessing: normalize to [-1, 1] for MobileNetV2
        x = keras.applications.mobilenet_v2.preprocess_input(inputs)
        x = base_model(x, training=False)
        
        # Global Average Pooling
        x = layers.GlobalAveragePooling2D()(x)
        
        # Dense layers
        x = layers.Dense(256, activation='relu')(x)
        x = layers.Dropout(0.5)(x)
        x = layers.Dense(128, activation='relu')(x)
        x = layers.Dropout(0.3)(x)
        
        # Output layer
        outputs = layers.Dense(len(self.class_names), activation='softmax')(x)
        
        self.model = keras.Model(inputs, outputs)
        
        print(f"\nModel architecture:")
        self.model.summary()
        
        return self.model
    
    def train_classification_head(self):
        """Train only the classification head (base model frozen)."""
        print("\n" + "="*60)
        print("PHASE 1: TRAINING CLASSIFICATION HEAD (Base model frozen)")
        print("="*60)

        checkpoint_path = self.model_dir / 'best_head.weights.h5'
        if checkpoint_path.exists():
            self.model.load_weights(str(checkpoint_path))
            print(f"Loaded existing head weights: {checkpoint_path}")
            return None
        
        # Compile with lower learning rate
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.001),
            loss='categorical_crossentropy',
            metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
        )
        
        # Callbacks
        callbacks = [
            TrainingTimer(),
            EarlyStopping(
                monitor='val_loss',
                patience=5,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=2,
                min_lr=1e-6,
                verbose=1
            ),
            ModelCheckpoint(
                str(self.model_dir / 'best_head.weights.h5'),
                monitor='val_accuracy',
                save_best_only=True,
                save_weights_only=True,
                verbose=1
            ),
            TensorBoard(
                log_dir=str(self.model_dir / 'logs_head')
            )
        ]
        
        # Train
        history_head = self.model.fit(
            self.train_generator,
            validation_data=self.val_generator,
            epochs=self.epochs_head,
            callbacks=callbacks,
            verbose=1
        )
        
        return history_head
    
    def fine_tune_model(self):
        """Fine-tune upper layers of base model."""
        print("\n" + "="*60)
        print("PHASE 2: FINE-TUNING UPPER LAYERS")
        print("="*60)
        
        # Unfreeze top layers of base model
        base_model = next(
            layer for layer in self.model.layers
            if isinstance(layer, keras.Model) and layer.name.startswith('mobilenetv2')
        )
        base_model.trainable = True
        
        # Freeze lower layers
        for layer in base_model.layers[:-50]:
            layer.trainable = False
        
        print(f"Total layers: {len(base_model.layers)}")
        print(f"Trainable layers: {sum(1 for l in base_model.layers if l.trainable)}")
        
        # Recompile with lower learning rate
        self.model.compile(
            optimizer=keras.optimizers.Adam(learning_rate=0.0001),
            loss='categorical_crossentropy',
            metrics=['accuracy', keras.metrics.TopKCategoricalAccuracy(k=3, name='top_3_accuracy')]
        )
        
        # Callbacks
        callbacks = [
            TrainingTimer(),
            EarlyStopping(
                monitor='val_loss',
                patience=5,
                restore_best_weights=True,
                verbose=1
            ),
            ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=2,
                min_lr=1e-7,
                verbose=1
            ),
            ModelCheckpoint(
                str(self.model_dir / 'best_finetuned.weights.h5'),
                monitor='val_accuracy',
                save_best_only=True,
                save_weights_only=True,
                verbose=1
            ),
            TensorBoard(
                log_dir=str(self.model_dir / 'logs_finetune')
            )
        ]
        
        # Train
        history_finetune = self.model.fit(
            self.train_generator,
            validation_data=self.val_generator,
            epochs=self.epochs_finetune,
            callbacks=callbacks,
            verbose=1
        )
        
        return history_finetune
    
    def save_model(self):
        """Save model and class names."""
        print("\n" + "="*60)
        print("SAVING MODEL")
        print("="*60)
        
        model_path = self.model_dir / 'plant_disease_model.keras'
        self.model.save(str(model_path))
        print(f"Model saved: {model_path}")
        
        # Save class names
        class_names_path = self.model_dir / 'class_names.json'
        with open(class_names_path, 'w') as f:
            json.dump(self.class_names, f, indent=2)
        print(f"Class names saved: {class_names_path}")
        
        # Save class names as text file (backward compatibility)
        class_names_txt = self.model_dir / 'class_names.txt'
        with open(class_names_txt, 'w') as f:
            for name in self.class_names:
                f.write(name + '\n')
        print(f"Class names (txt) saved: {class_names_txt}")
    
    def train(self):
        """Run complete training pipeline."""
        print("\n" + "="*80)
        print("PLANT DISEASE DETECTION MODEL TRAINING")
        print("Architecture: MobileNetV2 with Transfer Learning")
        print(f"Image Size: {self.img_size}x{self.img_size}")
        print(f"Head Training Epochs: {self.epochs_head}")
        print(f"Fine-tuning Epochs: {self.epochs_finetune}")
        print("="*80)
        
        # Load data
        self.load_data(batch_size=32)
        
        # Build model
        self.build_model()
        
        # Phase 1: Train head
        history_head = self.train_classification_head()
        
        # Phase 2: Fine-tune
        history_finetune = self.fine_tune_model()
        
        # Save
        self.save_model()
        
        print("\n" + "="*80)
        print("TRAINING COMPLETE!")
        print("="*80)
        
        return history_head, history_finetune


def main():
    parser = argparse.ArgumentParser(description='Train plant disease detection model')
    parser.add_argument('--dataset', type=str, required=True,
                       help='Path to dataset root directory')
    parser.add_argument('--model-dir', type=str, default='../backend',
                       help='Directory to save model')
    parser.add_argument('--img-size', type=int, default=224,
                       help='Input image size')
    parser.add_argument('--epochs-head', type=int, default=10,
                       help='Epochs for training head')
    parser.add_argument('--epochs-finetune', type=int, default=15,
                       help='Epochs for fine-tuning')
    
    args = parser.parse_args()
    
    # Verify dataset exists
    if not os.path.isdir(args.dataset):
        print(f"ERROR: Dataset directory not found: {args.dataset}")
        sys.exit(1)
    
    # Train model
    trainer = PlantDiseaseModelTrainer(
        dataset_root=args.dataset,
        model_dir=args.model_dir,
        img_size=args.img_size,
        epochs_head=args.epochs_head,
        epochs_finetune=args.epochs_finetune
    )
    
    trainer.train()


if __name__ == '__main__':
    main()
