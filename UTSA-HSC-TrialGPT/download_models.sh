#!/bin/bash
set -e

echo "Restoring local TrialGPT models..."
mkdir -p model
cd model

echo "Downloading TinyLlama 1.1B..."
curl -L -o tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.q4_k_m.gguf"

echo "Downloading Meta-Llama-3-8B-Instruct (Quantized)..."
curl -L -o Meta-Llama-3-8B-Instruct.Q4_K_M.gguf "https://huggingface.co/QuantFactory/Meta-Llama-3-8B-Instruct-GGUF/resolve/main/Meta-Llama-3-8B-Instruct.Q4_K_M.gguf"

echo "Models restored successfully!"
