import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import json
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import classification_report, accuracy_score, f1_score
from ml_pipeline.feature_schema import FEATURE_NAMES

def generate_synthetic_microstructure_dataset(n_samples: int = 6000) -> pd.DataFrame:
    """
    Generates a synthetic time-series dataset with realistic market microstructure dependencies.
    """
    np.random.seed(42)
    
    # Generate latent trend and microstructure factors
    t = np.linspace(0, 100, n_samples)
    base_price = 64000.0 + np.cumsum(np.random.normal(0, 2.0, n_samples))
    
    obi_mean_5s = np.random.uniform(-1.0, 1.0, n_samples)
    obi_std_5s = np.random.uniform(0.01, 0.3, n_samples)
    obi_mean_15s = obi_mean_5s * 0.8 + np.random.normal(0, 0.1, n_samples)
    obi_std_15s = np.random.uniform(0.01, 0.3, n_samples)
    obi_mean_30s = obi_mean_15s * 0.8 + np.random.normal(0, 0.1, n_samples)
    obi_std_30s = np.random.uniform(0.01, 0.3, n_samples)
    
    spread = np.random.exponential(0.5, n_samples) + 0.1
    spread_velocity = np.random.normal(0, 0.05, n_samples)
    micro_mid_div = obi_mean_5s * 0.5 + np.random.normal(0, 0.1, n_samples)
    
    cvd_1m = obi_mean_5s * 25.0 + np.random.normal(0, 5.0, n_samples)
    cvd_5m = cvd_1m * 3.0 + np.random.normal(0, 10.0, n_samples)
    cvd_velocity = cvd_1m / 10.0 + np.random.normal(0, 0.5, n_samples)
    
    trade_intensity = np.random.gamma(2.0, 5.0, n_samples)
    trade_intensity_z = (trade_intensity - np.mean(trade_intensity)) / (np.std(trade_intensity) + 1e-6)
    
    price_velocity = micro_mid_div * 0.8 + np.random.normal(0, 0.2, n_samples)
    price_return = price_velocity / 64000.0
    realized_vol = np.random.uniform(0.0005, 0.005, n_samples)
    
    depth_imbalance = obi_mean_5s * 0.9 + np.random.normal(0, 0.05, n_samples)
    liquidity_removal_rate = trade_intensity * spread * 0.1
    
    sweep_score = (np.random.uniform(0, 1, n_samples) > 0.96).astype(float)
    fakeout_score = (np.random.uniform(0, 1, n_samples) > 0.97).astype(float)
    iceberg_score = (np.random.uniform(0, 1, n_samples) > 0.95).astype(float)
    spoof_score = (np.random.uniform(0, 1, n_samples) > 0.95).astype(float)

    data = {
        "obi_mean_5s": obi_mean_5s,
        "obi_std_5s": obi_std_5s,
        "obi_mean_15s": obi_mean_15s,
        "obi_std_15s": obi_std_15s,
        "obi_mean_30s": obi_mean_30s,
        "obi_std_30s": obi_std_30s,
        "spread": spread,
        "spread_velocity": spread_velocity,
        "micro_mid_divergence": micro_mid_div,
        "cvd_1m": cvd_1m,
        "cvd_5m": cvd_5m,
        "cvd_velocity": cvd_velocity,
        "trade_intensity": trade_intensity,
        "trade_intensity_zscore": trade_intensity_z,
        "price_return": price_return,
        "price_velocity": price_velocity,
        "realized_volatility": realized_vol,
        "depth_imbalance": depth_imbalance,
        "liquidity_removal_rate": liquidity_removal_rate,
        "sweep_score": sweep_score,
        "fakeout_score": fakeout_score,
        "iceberg_score": iceberg_score,
        "spoof_score": spoof_score
    }
    df = pd.DataFrame(data)

    # Label calculation (DOWN = 0, NEUTRAL = 1, UP = 2)
    score = (
        0.35 * df["obi_mean_5s"] +
        0.25 * (df["cvd_1m"] / 25.0) +
        0.20 * df["micro_mid_divergence"] +
        0.10 * (df["price_velocity"] / 0.5) -
        0.20 * df["fakeout_score"] * np.sign(df["obi_mean_5s"])
    )
    
    labels = np.ones(n_samples, dtype=int)  # default NEUTRAL = 1
    labels[score > 0.25] = 2  # UP = 2
    labels[score < -0.25] = 0  # DOWN = 0
    
    df["target"] = labels
    return df

def train_and_export_model():
    print("Generating synthetic microstructure dataset...")
    df = generate_synthetic_microstructure_dataset(n_samples=6000)
    
    X = df[FEATURE_NAMES].values.astype(np.float32)
    y = df["target"].values.astype(int)
    
    # Chronological / Walk-Forward Split (No random shuffle)
    train_size = int(len(X) * 0.70)
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    
    print(f"Dataset shapes: Train={X_train.shape}, Test={X_test.shape}")
    
    # Train LightGBM Multiclass Classifier
    model = lgb.LGBMClassifier(
        objective="multiclass",
        num_class=3,
        n_estimators=100,
        learning_rate=0.05,
        max_depth=5,
        num_leaves=31,
        random_state=42,
        verbosity=-1
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred, average="macro")
    print(f"Validation Accuracy: {acc:.4f}, F1-Macro: {f1:.4f}")
    
    output_dir = "ml_pipeline/artifacts"
    os.makedirs(output_dir, exist_ok=True)
    
    # 1. Export Feature Schema
    schema_path = os.path.join(output_dir, "feature_schema.json")
    with open(schema_path, "w") as f:
        json.dump({
            "feature_names": FEATURE_NAMES,
            "feature_count": len(FEATURE_NAMES),
            "target_classes": ["DOWN", "NEUTRAL", "UP"]
        }, f, indent=2)

    # 2. Export ONNX Model using skl2onnx or lightgbm / onnxmltools
    onnx_path = os.path.join(output_dir, "model.onnx")
    onnx_exported = False
    
    try:
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
        
        initial_types = [('float_input', FloatTensorType([None, len(FEATURE_NAMES)]))]
        onnx_model = convert_sklearn(model, initial_types=initial_types, target_opset=15)
        with open(onnx_path, "wb") as f:
            f.write(onnx_model.SerializeToString())
        print(f"Successfully saved ONNX model to {onnx_path}")
        onnx_exported = True
    except Exception as e:
        print(f"skl2onnx conversion warning: {e}. Trying LightGBM model txt export...")
    
    if not onnx_exported:
        try:
            import onnxmltools
            from onnxmltools.convert.common.data_types import FloatTensorType
            initial_types = [('float_input', FloatTensorType([None, len(FEATURE_NAMES)]))]
            onnx_model = onnxmltools.convert_lightgbm(model, initial_types=initial_types)
            with open(onnx_path, "wb") as f:
                f.write(onnx_model.SerializeToString())
            print(f"Saved ONNX model via onnxmltools to {onnx_path}")
            onnx_exported = True
        except Exception as e2:
            print(f"onnxmltools conversion warning: {e2}")

    # Also export lightgbm model txt for fallback
    lgb_txt_path = os.path.join(output_dir, "model.txt")
    model.booster_.save_model(lgb_txt_path)

    # 3. Export Metadata
    importances = dict(zip(FEATURE_NAMES, model.feature_importances_.tolist()))
    meta_path = os.path.join(output_dir, "model_metadata.json")
    with open(meta_path, "w") as f:
        json.dump({
            "model_type": "LightGBM Multiclass Classifier",
            "accuracy": float(acc),
            "f1_macro": float(f1),
            "target_classes": ["DOWN", "NEUTRAL", "UP"],
            "feature_importances": importances,
            "onnx_exported": onnx_exported
        }, f, indent=2)
        
    print(f"Exported model artifacts successfully to {output_dir}")

if __name__ == "__main__":
    train_and_export_model()
