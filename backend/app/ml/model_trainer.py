from typing import List, Dict, Tuple
import numpy as np
from pathlib import Path

from app.data.data_repository import DataRepository
from app.ml.classifier import ECGClassifier
from app.ml.feature_extractor import FeatureExtractor
from app.config import settings


class ModelTrainer:
    def __init__(self, data_repository: DataRepository):
        self.data_repository = data_repository
        self.classifier = ECGClassifier()
    
    def prepare_training_data(self) -> Tuple[np.ndarray, np.ndarray]:
        events = self.data_repository.get_all_events()
        
        X = []
        y = []
        
        for event in events:
            ecg_data = event['combined_ecg']
            features = FeatureExtractor.extract_features(ecg_data)
            event_type = event['metadata'].Event_Name
            
            X.append(features)
            y.append(event_type)
        
        return np.array(X), np.array(y)
    
    def train(self) -> ECGClassifier:
        X, y = self.prepare_training_data()
        
        if len(X) == 0:
            raise ValueError("No training data available")
        
        self.classifier.train(X, y)
        return self.classifier
    
    def save_model(self, filepath: str = None) -> None:
        if filepath is None:
            if settings.model_path:
                model_path = Path(settings.model_path)
                if model_path.is_dir():
                    filepath = str(model_path / "ecg_classifier.pkl")
                else:
                    filepath = str(model_path)
            else:
                model_dir = Path("./models")
                model_dir.mkdir(exist_ok=True)
                filepath = str(model_dir / "ecg_classifier.pkl")
        
        self.classifier.save(filepath)

