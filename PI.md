# Raspberry Pi 4 — tumhe sirf yeh karna hai

Yahan se (Mac/Cursor) Pi ke andar nahi ghus sakte. Pi par **ek baar** yeh karo. Baaki install script khud karegi (Node, server, fullscreen kiosk, boot pe start).

## Pehle hardware

1. HDMI se monitor/TV
2. Keyboard (pehli baar)
3. Wi‑Fi (Pi internet)
4. Raspberry Pi OS **64-bit Desktop** already installed + login ho chuka ho

## Phir Terminal mein YE POORI LINE paste

```bash
curl -fsSL https://raw.githubusercontent.com/Arshsatsangi/SIHround2/main/scripts/pi-bootstrap.sh | bash
```

Password maange (`sudo`) to Pi ka user password likho.

## Jab “Ready” dikhe

```bash
sudo reboot
```

Boot ke baad screen par kiosk khulna chahiye. Frontend + API dono Pi par hi hain.

Phone se kholna ho to Pi ke Wi‑Fi IP par jao (script print karti hai), jaise `http://192.168.1.20:4173`.

## Baad mein

| Kaam | Command |
| --- | --- |
| Logs | `sudo journalctl -u aarogyavaani -f` |
| Band | `sudo systemctl stop aarogyavaani` |
| Start | `sudo systemctl start aarogyavaani` |
| AI keys | `nano ~/SIHround2/.env` phir `sudo systemctl restart aarogyavaani` |
