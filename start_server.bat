@echo off
title Lost & Found AI Backend

echo Starting Lost & Found AI Backend...
echo.

call .venv\Scripts\activate

uvicorn backend.main:app --reload

pause