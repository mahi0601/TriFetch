import numpy as np
from typing import List
from app.models.ecg_data import ECGData


class FeatureExtractor:
    @staticmethod
    def extract_features(ecg_data: ECGData) -> np.ndarray:
        ch1 = np.array(ecg_data.ch1)
        ch2 = np.array(ecg_data.ch2)
        
        features = []
        
        for channel in [ch1, ch2]:
            features.extend([
                np.mean(channel),
                np.std(channel),
                np.median(channel),
                np.percentile(channel, 25),
                np.percentile(channel, 75),
                np.max(channel),
                np.min(channel),
                np.ptp(channel),
            ])
            
            diff = np.diff(channel)
            features.extend([
                np.mean(np.abs(diff)),
                np.std(diff),
            ])
            
            fft = np.fft.fft(channel)
            power = np.abs(fft) ** 2
            features.extend([
                np.sum(power[:len(power)//4]),
                np.sum(power[len(power)//4:len(power)//2]),
            ])
        
        return np.array(features)
    
    @staticmethod
    def extract_window_features(ecg_data: ECGData, window_size: int = 200) -> np.ndarray:
        ch1 = np.array(ecg_data.ch1)
        ch2 = np.array(ecg_data.ch2)
        
        num_windows = len(ch1) // window_size
        if num_windows == 0:
            return FeatureExtractor.extract_features(ecg_data).reshape(1, -1)
        
        features_list = []
        for i in range(num_windows):
            start = i * window_size
            end = start + window_size
            window_ch1 = ch1[start:end]
            window_ch2 = ch2[start:end]
            
            window_ecg = ECGData(
                ch1=window_ch1.tolist(),
                ch2=window_ch2.tolist(),
                sampling_rate=ecg_data.sampling_rate
            )
            features = FeatureExtractor.extract_features(window_ecg)
            features_list.append(features)
        
        return np.array(features_list)

