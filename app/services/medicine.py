from .llm import llm_service
import json
import re
from ..database import models
from sqlalchemy.orm import Session

class MedicineService:
    def parse_medicine_data(self, text):
        prompt = f"""
        Extract medicine details from the following text: "{text}"
        Return a JSON object with:
        - name: medicine name
        - dosage: dosage (e.g., 500mg)
        - frequency: frequency (e.g., twice a day)
        - timing: timing (e.g., after meals)
        
        Only return the JSON.
        """
        response = llm_service.generate_response(prompt)
        try:
            match = re.search(r'\{.*\}', response, re.DOTALL)
            if match:
                return json.loads(match.group(0))
            return {}
        except:
            return {}

    def add_medicine(self, db: Session, data):
        name = data.get('name', 'N/A')
        dosage = data.get('dosage', 'N/A')
        freq = data.get('frequency', 'N/A')
        timing = data.get('timing', 'N/A')
        
        db_medicine = models.Medicine(
            name=name,
            dosage=dosage,
            frequency=freq,
            timing=timing
        )
        db.add(db_medicine)
        db.commit()
        db.refresh(db_medicine)
        return db_medicine

    def get_medicines(self, db: Session):
        return db.query(models.Medicine).filter(models.Medicine.is_active == 1).all()

    def update_medicine(self, db: Session, med_id: int, data: dict):
        db_medicine = db.query(models.Medicine).filter(models.Medicine.id == med_id).first()
        if db_medicine:
            db_medicine.name = data.get('name', db_medicine.name)
            db_medicine.dosage = data.get('dosage', db_medicine.dosage)
            db_medicine.frequency = data.get('frequency', db_medicine.frequency)
            db_medicine.timing = data.get('timing', db_medicine.timing)
            db.commit()
            db.refresh(db_medicine)
        return db_medicine

    def delete_medicine(self, db: Session, med_id: int):
        db_medicine = db.query(models.Medicine).filter(models.Medicine.id == med_id).first()
        if db_medicine:
            db_medicine.is_active = 0
            db.commit()
        return db_medicine

medicine_service = MedicineService()
