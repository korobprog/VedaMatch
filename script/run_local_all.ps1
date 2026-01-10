
$env:USE_LOCAL_SQLITE="false"
$env:DB_HOST="localhost"
$env:DB_PORT="5435"
$env:DB_USER="raguser"
$env:DB_PASSWORD="ragpassword"
$env:DB_NAME="ragdb"

Write-Host "Starting Bhagavad-gita parsing..."
python script/run_parser.py --book bg --lang all

Write-Host "Starting Srimad-Bhagavatam parsing..."
python script/run_parser.py --book sb --lang all

Write-Host "Starting Caitanya-caritamrita parsing..."
python script/run_parser.py --book cc --lang all

Write-Host "All done!"
