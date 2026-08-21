"""
clinical_math/denoising.py — Biological Noise Filtering & Trajectory Math
===========================================================================
Highly optimized numpy implementations for 1D Exponential Moving Average (EMA)
and Ordinary Least Squares (OLS) trajectory slopes.
"""

import numpy as np


def ema_denoise(series: np.ndarray, alpha: float = 0.6) -> np.ndarray:
    """
    Applies 1D Exponential Moving Average (EMA) to remove lab noise.
    Formula: x̂(t_k) = α·y(t_k) + (1-α)·x̂(t_{k-1})
    
    Args:
        series: 1D numpy array of chronological lab values.
        alpha: Smoothing factor (0.0 < alpha <= 1.0). Higher = trusts raw data more.
        
    Returns:
        1D numpy array of the same shape containing smoothed values.
    """
    if len(series) == 0:
        return np.array([])
        
    smoothed = np.zeros_like(series, dtype=float)
    smoothed[0] = series[0]
    
    for i in range(1, len(series)):
        smoothed[i] = alpha * series[i] + (1 - alpha) * smoothed[i - 1]
        
    return smoothed


def compute_ols_slope(days_ago: np.ndarray, values: np.ndarray, 
                      max_days: float = 180.0) -> float:
    """
    Calculates Ordinary Least Squares (OLS) slope in units/day.
    
    Args:
        days_ago: 1D numpy array of the observation timestamps (e.g., [180, 90, 14]).
                  Assumes sorted chronologically (highest days_ago first).
        values: 1D numpy array of the lab values at those timestamps.
        max_days: The theoretical start of the baseline window (t=0).
        
    Returns:
        The linear trajectory slope β (units per day). Returns 0.0 if insufficient data.
    """
    if len(days_ago) < 2 or np.all(days_ago == days_ago[0]):
        return 0.0
        
    # Convert 'days_ago' (descending) to a forward chronological timeline t=[0..180]
    t = max_days - days_ago.astype(float)
    
    # Compute the OLS slope (polyfit degree 1)
    slope, _ = np.polyfit(t, values, 1)
    
    return float(slope)
