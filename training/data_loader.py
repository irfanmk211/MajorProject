"""
Data Loader for Plant Disease Detection Dataset
Handles multiple dataset structures and creates train/validation/test splits
"""

import os
import shutil
import random
from pathlib import Path
from collections import defaultdict
import numpy as np
from typing import Tuple, Dict, List


class PlantDiseaseDataLoader:
    """
    Loads plant disease datasets with flexible folder structures.
    Automatically discovers classes and creates train/val/test splits.
    """
    
    def __init__(self, dataset_root: str, seed: int = 42):
        """
        Initialize the data loader.
        
        Args:
            dataset_root: Path to root dataset folder
            seed: Random seed for reproducible splits
        """
        self.dataset_root = Path(dataset_root)
        self.seed = seed
        random.seed(seed)
        np.random.seed(seed)
        
        self.train_ratio = 0.70
        self.val_ratio = 0.15
        self.test_ratio = 0.15
        
    def discover_classes(self) -> Dict[str, List[str]]:
        """
        Discover all image classes from dataset structure.
        Handles multiple folder structures:
        - crop/disease/*.jpg
        - crop___disease/*.jpg
        - train/disease/*.jpg
        
        Returns:
            Dictionary mapping class_name to list of image paths
        """
        classes = defaultdict(list)
        
        # Scan all directories recursively
        for root, dirs, files in os.walk(str(self.dataset_root)):
            for file in files:
                if file.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                    file_path = os.path.join(root, file)
                    
                    # Extract class name from directory structure
                    rel_path = os.path.relpath(root, str(self.dataset_root))
                    
                    # Skip certain directories
                    if any(skip in rel_path.lower() for skip in ['__pycache__', '.git', 'test', 'temp_split', 'splits']):
                        continue
                    
                    # Build class name from path
                    path_parts = rel_path.split(os.sep)
                    
                    # Filter out common non-class folders
                    filtered_parts = [p for p in path_parts 
                                    if p.lower() not in ['train', 'valid', 'test', 'validation']]
                    
                    if filtered_parts:
                        class_name = '__'.join(filtered_parts)
                    else:
                        class_name = path_parts[-1] if path_parts else 'unknown'
                    
                    classes[class_name].append(file_path)
        
        # Filter out classes with very few samples
        classes = {k: v for k, v in classes.items() if len(v) >= 5}
        
        print(f"Discovered {len(classes)} classes:")
        for cls_name, images in sorted(classes.items()):
            print(f"  - {cls_name}: {len(images)} images")
        
        return dict(classes)
    
    def create_splits(self, classes: Dict[str, List[str]], 
                     output_dir: str) -> Tuple[Dict, Dict, Dict]:
        """
        Create train/validation/test splits for all classes.
        
        Args:
            classes: Dictionary of class_name -> image_paths
            output_dir: Directory to create split folders
            
        Returns:
            Tuple of (train_dict, val_dict, test_dict)
        """
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        train_dict = {}
        val_dict = {}
        test_dict = {}
        
        for class_name, image_paths in classes.items():
            # Shuffle images for this class
            shuffled = image_paths.copy()
            random.shuffle(shuffled)
            
            # Calculate split indices
            total = len(shuffled)
            train_end = int(total * self.train_ratio)
            val_end = train_end + int(total * self.val_ratio)
            
            # Split images
            train_imgs = shuffled[:train_end]
            val_imgs = shuffled[train_end:val_end]
            test_imgs = shuffled[val_end:]
            
            train_dict[class_name] = train_imgs
            val_dict[class_name] = val_imgs
            test_dict[class_name] = test_imgs
            
            print(f"\n{class_name}:")
            print(f"  Train: {len(train_imgs)}")
            print(f"  Val:   {len(val_imgs)}")
            print(f"  Test:  {len(test_imgs)}")
        
        return train_dict, val_dict, test_dict
    
    def get_image_paths_dict(self) -> Tuple[Dict, Dict, Dict, List]:
        """
        Get all image paths organized by split and class.
        
        Returns:
            Tuple of (train_dict, val_dict, test_dict, class_names_list)
        """
        classes = self.discover_classes()
        
        if not classes:
            raise ValueError(f"No images found in {self.dataset_root}")
        
        train_dict, val_dict, test_dict = self.create_splits(
            classes, 
            str(self.dataset_root / "splits")
        )
        
        # Create sorted class names list
        class_names = sorted(classes.keys())
        
        print(f"\n{'='*60}")
        print(f"Total classes: {len(class_names)}")
        print(f"Class names: {class_names}")
        print(f"{'='*60}\n")
        
        return train_dict, val_dict, test_dict, class_names


def load_dataset_as_generators(dataset_root: str, 
                               img_size: Tuple[int, int] = (224, 224),
                               batch_size: int = 32,
                               seed: int = 42) -> Tuple:
    """
    Load dataset and create TensorFlow data generators.
    
    Args:
        dataset_root: Root path of dataset
        img_size: Image size (height, width)
        batch_size: Batch size for generators
        seed: Random seed
        
    Returns:
        Tuple of (train_generator, val_generator, test_generator, class_names, class_indices)
    """
    import tensorflow as tf
    from tensorflow.keras.preprocessing.image import ImageDataGenerator
    
    loader = PlantDiseaseDataLoader(dataset_root, seed=seed)
    train_dict, val_dict, test_dict, class_names = loader.get_image_paths_dict()
    
    # Create temporary directories for generators
    temp_root = Path(dataset_root) / "temp_split"
    temp_root.mkdir(exist_ok=True)
    
    # Organize files into train/val/test folders
    for split_name, data_dict in [("train", train_dict), 
                                   ("validation", val_dict), 
                                   ("test", test_dict)]:
        split_dir = temp_root / split_name
        split_dir.mkdir(exist_ok=True)
        
        for class_name, image_paths in data_dict.items():
            class_dir = split_dir / class_name
            class_dir.mkdir(exist_ok=True)
            
            for img_path in image_paths:
                try:
                    # Copy or link image (don't move original files)
                    dest_path = class_dir / Path(img_path).name
                    if not dest_path.exists():
                        shutil.copy2(img_path, dest_path)
                except Exception as e:
                    print(f"Warning: Could not copy {img_path}: {e}")
    
    # Create ImageDataGenerators
    train_datagen = ImageDataGenerator(
        rotation_range=20,
        width_shift_range=0.2,
        height_shift_range=0.2,
        horizontal_flip=True,
        zoom_range=0.2,
        fill_mode='nearest'
    )
    
    val_datagen = ImageDataGenerator()
    test_datagen = ImageDataGenerator()
    
    # Load from directories
    train_generator = train_datagen.flow_from_directory(
        str(temp_root / "train"),
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=True,
        seed=seed
    )
    
    val_generator = val_datagen.flow_from_directory(
        str(temp_root / "validation"),
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=True,
        seed=seed
    )
    
    test_generator = test_datagen.flow_from_directory(
        str(temp_root / "test"),
        target_size=img_size,
        batch_size=batch_size,
        class_mode='categorical',
        shuffle=False
    )
    
    # Get class indices mapping
    class_indices = train_generator.class_indices
    
    print(f"Class indices mapping: {class_indices}")
    
    return train_generator, val_generator, test_generator, class_names, class_indices
