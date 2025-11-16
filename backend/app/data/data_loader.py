import json
import os
from pathlib import Path
from typing import List, Dict, Optional
import pandas as pd
import numpy as np

from app.models.event_metadata import EventMetadata
from app.models.ecg_data import ECGData
from app.config import settings


class DataLoader:
    def __init__(self, data_path: str = None):
        self.data_path = Path(data_path or settings.data_path)
    
    def load_event_metadata(self, event_folder: Path) -> Optional[EventMetadata]:
        json_files = list(event_folder.glob("event_*.json"))
        if not json_files:
            return None
        
        with open(json_files[0], 'r') as f:
            data = json.load(f)
            return EventMetadata(**data)
    
    def load_ecg_file(self, file_path: Path) -> ECGData:
        df = pd.read_csv(file_path, header=0)
        return ECGData(
            ch1=df['ch1'].tolist(),
            ch2=df['ch2'].tolist(),
            sampling_rate=settings.sampling_rate
        )
    
    def load_event_data(self, event_folder: Path) -> Optional[Dict]:
        metadata = self.load_event_metadata(event_folder)
        if not metadata:
            return None
        
        ecg_files = sorted([f for f in event_folder.glob("*.txt") if f.name != "event_*.txt"])
        if len(ecg_files) < 1:
            return None
        
        ecg_chunks = []
        for ecg_file in ecg_files:
            ecg_data = self.load_ecg_file(ecg_file)
            ecg_chunks.append(ecg_data)
        
        combined_ch1 = []
        combined_ch2 = []
        for chunk in ecg_chunks:
            combined_ch1.extend(chunk.ch1)
            combined_ch2.extend(chunk.ch2)
        
        combined_ecg = ECGData(
            ch1=combined_ch1,
            ch2=combined_ch2,
            sampling_rate=settings.sampling_rate
        )
        
        event_time_str = metadata.EventOccuredTime
        
        try:
            time_part = event_time_str.split(' ')[1]
            seconds_with_fraction = float(time_part.split(':')[2])
            event_offset_seconds = seconds_with_fraction
        except:
            event_offset_seconds = 30.0
        
        total_samples_before_event = len(ecg_chunks[0].ch1)
        event_sample_index = int(total_samples_before_event + (event_offset_seconds * settings.sampling_rate))
        
        return {
            'metadata': metadata,
            'ecg_chunks': ecg_chunks,
            'combined_ecg': combined_ecg,
            'event_sample_index': event_sample_index,
            'event_offset_seconds': event_offset_seconds
        }
    
    def scan_dataset(self) -> List[Dict]:
        events = []
        if not self.data_path.exists():
            return events
        
        folders = [f for f in self.data_path.iterdir() if f.is_dir()]
        if not folders:
            return events
        
        for folder in sorted(folders):
            try:
                event_subfolders = [f for f in folder.iterdir() if f.is_dir() and f.name.startswith('event_')]
                
                if event_subfolders:
                    for event_subfolder in sorted(event_subfolders):
                        try:
                            event_data = self.load_event_data(event_subfolder)
                            if event_data:
                                events.append({
                                    'folder_name': folder.name,
                                    'event_id': f"{folder.name}_{event_subfolder.name}",
                                    **event_data
                                })
                        except Exception:
                            continue
                
                if not event_subfolders:
                    try:
                        event_data = self.load_event_data(folder)
                        if event_data:
                            events.append({
                                'folder_name': folder.name,
                                'event_id': folder.name,
                                **event_data
                            })
                    except Exception:
                        pass
            except Exception:
                continue
        
        return events

