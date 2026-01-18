# Criar diretório de modelos se não existir
if (-not (Test-Path -Path "models")) {
    New-Item -ItemType Directory -Path "models"
}

# URL do modelo orca-mini-3b
$modelUrl = "https://huggingface.co/TheBloke/orca-mini-3B-gguf2-GGJT/resolve/main/orca-mini-3b-gguf2-ggjt-q4_0.gguf"
$outputPath = "models/orca-mini-3b.gguf"

# Baixar o modelo
Write-Host "Baixando o modelo orca-mini-3b (pode demorar alguns minutos, tamanho ~2GB)..." -ForegroundColor Yellow

# Usando WebClient para baixar
$webClient = New-Object System.Net.WebClient
$webClient.DownloadFile($modelUrl, $outputPath)

# Criar arquivo de configuração do modelo
@"
name: orca-mini-3b
backend: llama
parameters:
  model: orca-mini-3b.gguf
  n_ctx: 2048
  n_threads: 4
  n_gpu_layers: 0
  f16_kv: true
  use_mlock: false
  use_mmap: true
  n_batch: 512
  n_predict: 100
  repeat_last_n: 64
  repeat_penalty: 1.1
  temperature: 0.7
  top_k: 40
  top_p: 0.9
  stop: ["###", "</s>", "<|im_end|>", "<|endoftext|>", "<|user|>", "<|assistant|>"]
"@ | Out-File -FilePath "models/orca-mini-3b.yaml" -Encoding utf8

Write-Host "Modelo baixado e configurado com sucesso!" -ForegroundColor Green
