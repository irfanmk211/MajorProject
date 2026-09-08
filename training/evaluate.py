"""
Plant Disease Model Evaluation
Generates comprehensive evaluation metrics and reports
"""

import os
import sys
import json
import argparse
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras.models import load_model
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    accuracy_score,
    precision_score,
    recall_score,
    f1_score
)
import matplotlib.pyplot as plt
import seaborn as sns

from data_loader import load_dataset_as_generators


class ModelEvaluator:
    """
    Evaluates trained plant disease model.
    """
    
    def __init__(self, model_path: str, class_names_path: str, 
                 dataset_root: str, img_size: int = 224):
        """
        Initialize evaluator.
        
        Args:
            model_path: Path to trained model
            class_names_path: Path to class names JSON
            dataset_root: Path to dataset
            img_size: Input image size
        """
        self.model_path = model_path
        self.class_names_path = class_names_path
        self.dataset_root = dataset_root
        self.img_size = img_size
        
        # Load model and class names
        self.model = load_model(model_path)
        with open(class_names_path, 'r') as f:
            self.class_names = json.load(f)
        
        print(f"Model loaded: {model_path}")
        print(f"Classes: {self.class_names}")
    
    def evaluate(self, test_generator):
        """
        Evaluate model on test set.
        
        Args:
            test_generator: Test data generator
            
        Returns:
            Dictionary with evaluation metrics
        """
        print("\n" + "="*60)
        print("EVALUATING MODEL ON TEST SET")
        print("="*60)
        
        # Predict on all test data
        predictions = []
        ground_truth = []
        
        for x_batch, y_batch in test_generator:
            preds = self.model.predict(x_batch, verbose=0)
            predictions.extend(np.argmax(preds, axis=1))
            ground_truth.extend(np.argmax(y_batch, axis=1))
        
        predictions = np.array(predictions)
        ground_truth = np.array(ground_truth)
        
        # Calculate metrics
        accuracy = accuracy_score(ground_truth, predictions)
        precision = precision_score(ground_truth, predictions, average='weighted', zero_division=0)
        recall = recall_score(ground_truth, predictions, average='weighted', zero_division=0)
        f1 = f1_score(ground_truth, predictions, average='weighted', zero_division=0)
        
        print(f"\nOverall Metrics:")
        print(f"  Accuracy:  {accuracy:.4f}")
        print(f"  Precision: {precision:.4f}")
        print(f"  Recall:    {recall:.4f}")
        print(f"  F1-Score:  {f1:.4f}")
        
        # Per-class metrics
        print(f"\nPer-Class Metrics:")
        print(classification_report(ground_truth, predictions, 
                                   target_names=self.class_names))
        
        # Confusion matrix
        cm = confusion_matrix(ground_truth, predictions)
        
        # Identify poorly performing classes
        print(f"\nPoorly Performing Classes (Recall < 0.5):")
        recalls_per_class = np.diag(cm) / cm.sum(axis=1)
        for i, (class_name, recall) in enumerate(zip(self.class_names, recalls_per_class)):
            if recall < 0.5:
                print(f"  {class_name}: {recall:.4f} recall")
        
        return {
            'accuracy': float(accuracy),
            'precision': float(precision),
            'recall': float(recall),
            'f1_score': float(f1),
            'confusion_matrix': cm.tolist(),
            'predictions': predictions.tolist(),
            'ground_truth': ground_truth.tolist()
        }
    
    def plot_confusion_matrix(self, results: dict, output_path: str):
        """Plot and save confusion matrix."""
        cm = np.array(results['confusion_matrix'])
        
        plt.figure(figsize=(12, 10))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                   xticklabels=self.class_names,
                   yticklabels=self.class_names)
        plt.title('Confusion Matrix')
        plt.ylabel('Ground Truth')
        plt.xlabel('Prediction')
        plt.tight_layout()
        plt.savefig(output_path, dpi=150, bbox_inches='tight')
        print(f"Confusion matrix saved: {output_path}")
    
    def save_report(self, results: dict, output_dir: str):
        """Save evaluation report."""
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
        
        # Save JSON report
        report_path = output_path / 'evaluation_report.json'
        with open(report_path, 'w') as f:
            json.dump({
                'accuracy': results['accuracy'],
                'precision': results['precision'],
                'recall': results['recall'],
                'f1_score': results['f1_score'],
                'num_classes': len(self.class_names),
                'class_names': self.class_names
            }, f, indent=2)
        print(f"Report saved: {report_path}")
        
        # Save confusion matrix plot
        cm_path = output_path / 'confusion_matrix.png'
        self.plot_confusion_matrix(results, str(cm_path))


def main():
    parser = argparse.ArgumentParser(description='Evaluate plant disease model')
    parser.add_argument('--model', type=str, required=True,
                       help='Path to trained model')
    parser.add_argument('--class-names', type=str, required=True,
                       help='Path to class names JSON')
    parser.add_argument('--dataset', type=str, required=True,
                       help='Path to dataset root')
    parser.add_argument('--img-size', type=int, default=224,
                       help='Input image size')
    parser.add_argument('--output', type=str, default='evaluation',
                       help='Output directory for reports')
    
    args = parser.parse_args()
    
    # Load test data
    _, _, test_generator, _, _ = load_dataset_as_generators(
        args.dataset,
        img_size=(args.img_size, args.img_size),
        batch_size=32
    )
    
    # Evaluate
    evaluator = ModelEvaluator(
        model_path=args.model,
        class_names_path=args.class_names,
        dataset_root=args.dataset,
        img_size=args.img_size
    )
    
    results = evaluator.evaluate(test_generator)
    evaluator.save_report(results, args.output)
    
    print(f"\n" + "="*60)
    print("EVALUATION COMPLETE")
    print("="*60)


if __name__ == '__main__':
    main()
