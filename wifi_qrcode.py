import qrcode
from pathlib import Path

# Replace these with your actual Wi-Fi credentials
ssid = "YOUR_SSID_HERE"
password = "YOUR_WIFI_PASSWORD_HERE"
security = "WPA"  # Use "WEP", "WPA", or leave empty for open networks

# Wi-Fi QR code format
wifi_config = f"WIFI:T:{security};S:{ssid};P:{password};;"

# Generate QR code
qr = qrcode.make(wifi_config)

# Get path to Downloads folder
downloads_path = Path.home() / "Downloads"
file_path = downloads_path / "wifi_qr.png"

# Save the QR code
qr.save(file_path)

print(f"QR code generated and saved to: {file_path}")