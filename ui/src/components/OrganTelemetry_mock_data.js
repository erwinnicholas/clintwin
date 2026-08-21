import { Wind, Activity, Heart } from 'lucide-react';

export const organMetrics = {
  'Respiratory System': {
    imageSrc: '/organ_respiratory.jpg',
    metrics: [
      { title: 'O2 Saturation', value: 88, unit: '%', color: '255, 61, 0', icon: Wind, status: 'Critical' },
      { title: 'Resp. Rate', value: 24, unit: 'bpm', color: '255, 214, 0', icon: Activity, status: 'Elevated' },
      { title: 'Airflow Vol', value: 3.2, unit: 'L', color: '0, 230, 118', icon: Wind, status: 'Normal' }
    ]
  },
  'Cerebral Cortex': {
    imageSrc: '/organ_cerebral.png',
    metrics: [
      { title: 'Intracranial Pressure', value: 22, unit: 'mmHg', color: '255, 61, 0', icon: Activity, status: 'Critical' },
      { title: 'Cerebral Blood Flow', value: 45, unit: 'mL', color: '255, 214, 0', icon: Activity, status: 'Low' },
      { title: 'EEG Alpha Wave', value: 9, unit: 'Hz', color: '0, 230, 118', icon: Activity, status: 'Normal' }
    ]
  },
  'Cardiovascular System': {
    imageSrc: '/digital_twin_cardio.jpg',
    metrics: [
      { title: 'Heart Rate', value: 112, unit: 'bpm', color: '255, 61, 0', icon: Heart, status: 'Critical' },
      { title: 'Blood Pressure', value: 145, unit: 'SYS', color: '255, 214, 0', icon: Activity, status: 'Elevated' },
      { title: 'Cardiac Output', value: 4.5, unit: 'L/m', color: '0, 230, 118', icon: Activity, status: 'Normal' }
    ]
  }
};
