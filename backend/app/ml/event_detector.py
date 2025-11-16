from abc import ABC, abstractmethod
from typing import Tuple, Optional
import numpy as np

from app.models.ecg_data import ECGData
from app.ml.feature_extractor import FeatureExtractor
from app.config import settings


class IEventDetector(ABC):
    @abstractmethod
    def detect_event_start(self, ecg_data: ECGData) -> Tuple[int, float]:
        pass


class EventDetector(IEventDetector):
    def __init__(self, window_size: int = 200, threshold_factor: float = 2.0):
        self.window_size = window_size
        self.threshold_factor = threshold_factor
    
    def detect_event_start(self, ecg_data: ECGData) -> Tuple[int, float]:
        ch1 = np.array(ecg_data.ch1)
        ch2 = np.array(ecg_data.ch2)
        
        combined_signal = (ch1 + ch2) / 2
        
        window_size = self.window_size
        num_windows = len(combined_signal) // window_size
        
        if num_windows < 2:
            return len(combined_signal) // 2, len(combined_signal) / 2 / settings.sampling_rate
        
        window_stds = []
        window_means = []
        
        for i in range(num_windows):
            start = i * window_size
            end = start + window_size
            window = combined_signal[start:end]
            window_stds.append(np.std(window))
            window_means.append(np.mean(np.abs(window)))
        
        window_stds = np.array(window_stds)
        window_means = np.array(window_means)
        
        baseline_std = np.median(window_stds)
        baseline_mean = np.median(window_means)
        
        threshold_std = baseline_std * self.threshold_factor
        threshold_mean = baseline_mean * self.threshold_factor
        
        anomaly_scores = (window_stds > threshold_std).astype(int) + \
                        (window_means > threshold_mean).astype(int)
        
        if np.sum(anomaly_scores) == 0:
            mid_window = num_windows // 2
            sample_index = mid_window * window_size + window_size // 2
        else:
            first_anomaly_idx = np.where(anomaly_scores > 0)[0]
            if len(first_anomaly_idx) > 0:
                anomaly_window_idx = first_anomaly_idx[0]
                sample_index = anomaly_window_idx * window_size
            else:
                sample_index = len(combined_signal) // 2
        
        sample_index = min(sample_index, len(combined_signal) - 1)
        time_offset = sample_index / settings.sampling_rate
        
        return int(sample_index), time_offset

