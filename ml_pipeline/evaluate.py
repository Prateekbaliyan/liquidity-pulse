import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import numpy as np
import lightgbm as lgb
from sklearn.metrics import classification_report, accuracy_score, f1_score
from ml_pipeline.feature_schema import FEATURE_NAMES

def evaluate_artifacts():
    meta_path = "ml_pipeline/artifacts/model_metadata.json"
    if os.path.exists(meta_path):
        with open(meta_path, "r") as f:
            meta = json.load(f)
            print("--- MODEL METADATA ---")
            print(f"Model Type: {meta.get('model_type')}")
            print(f"Accuracy:   {meta.get('accuracy'):.4f}")
            print(f"F1-Macro:   {meta.get('f1_macro'):.4f}")
            print(f"ONNX Saved: {meta.get('onnx_exported')}")
            print("\nTop 5 Feature Importances:")
            imps = meta.get("feature_importances", {})
            sorted_imps = sorted(imps.items(), key=lambda x: x[1], reverse=True)[:5]
            for k, v in sorted_imps:
                print(f"  {k}: {v}")
    else:
        print("No model metadata found. Run ml_pipeline/train_export.py first.")

if __name__ == "__main__":
    evaluate_artifacts()
