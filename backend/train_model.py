import sys
from pathlib import Path

from app.data.data_repository import DataRepository
from app.ml.model_trainer import ModelTrainer
from app.config import settings


def main():
    if len(sys.argv) > 1:
        data_path = sys.argv[1]
    else:
        data_path = settings.data_path
    
    data_repo = DataRepository(data_path=data_path)
    events = data_repo.get_all_events()
    
    if len(events) == 0:
        return
    
    trainer = ModelTrainer(data_repo)
    classifier = trainer.train()
    trainer.save_model()


if __name__ == "__main__":
    main()

