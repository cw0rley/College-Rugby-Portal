@echo off
REM Push latest merged-programs.json to Firestore
REM Schedule this in Windows Task Scheduler to run every Monday
REM (e.g., 10:00 AM, after the Cowork scrape task finishes at 9:00 AM)

cd /d "%~dp0"
echo Pushing merged-programs.json to Firestore...
node sync.js --import merged-programs.json
echo.
echo Running data quality fixes...
node fix-programs.js
echo.
echo Done!
pause
