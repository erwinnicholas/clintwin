import requests
import json

url = "http://localhost:8000/api/v1/explain"

test_payloads = [
    {
        "action": "Trial Eligibility Match",
        "rationale": "Patient's eGFR is 45, which is below the threshold of 60 for LUNG-2024-02.",
        "belief_state": {
            "patient_id": "PT-7732",
            "condition": "Non-Small Cell Lung Cancer",
            "stage": "IIIB",
            "egfr": 45,
            "required_egfr": ">60"
        }
    },
    {
        "action": "Anomaly Detected in Live Simulation",
        "rationale": "Simulated heart rate spiked to 135 bpm during virtual administration of compound X.",
        "belief_state": {
            "trial_id": "CAR-T-19",
            "patient_cohort": "Elderly (65+)",
            "baseline_hr": 72,
            "simulated_hr": 135,
            "compound": "X-1092"
        }
    }
]

for i, payload in enumerate(test_payloads):
    print(f"--- Test {i+1}: {payload['action']} ---")
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        print("Response:")
        print(response.json()["report"])
    except Exception as e:
        print(f"Error: {e}")
        if hasattr(e, 'response') and e.response:
            print(e.response.text)
    print("\n")
