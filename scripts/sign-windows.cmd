@echo off
"C:\Program Files (x86)\Windows Kits\10\bin\10.0.19041.0\x64\signtool.exe" sign /a /fd SHA256 /tr http://timestamp.sectigo.com /td SHA256 %1
