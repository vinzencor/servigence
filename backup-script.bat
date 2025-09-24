@echo off
REM Automated backup script for Servigence project
REM Run this script daily to backup your work

echo ========================================
echo Servigence Project Backup Script
echo ========================================
echo.

REM Get current date and time for backup naming
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "datestamp=%YYYY%-%MM%-%DD%_%HH%-%Min%-%Sec%"

echo Current timestamp: %datestamp%
echo.

REM Create backup directory if it doesn't exist
if not exist "backups" mkdir backups
if not exist "backups\%YYYY%-%MM%" mkdir "backups\%YYYY%-%MM%"

REM Set backup path
set "backup_path=backups\%YYYY%-%MM%\backup_%datestamp%"
mkdir "%backup_path%"

echo Creating backup in: %backup_path%
echo.

REM 1. Commit any uncommitted changes
echo [1/6] Checking for uncommitted changes...
git status --porcelain > temp_status.txt
for /f %%i in ("temp_status.txt") do set size=%%~zi
if %size% gtr 0 (
    echo Found uncommitted changes. Committing them...
    git add .
    git commit -m "Auto-backup commit - %datestamp%"
    echo Changes committed successfully.
) else (
    echo No uncommitted changes found.
)
del temp_status.txt
echo.

REM 2. Create git bundle backup
echo [2/6] Creating git repository backup...
git bundle create "%backup_path%\servigence_repo_%datestamp%.bundle" --all
echo Git repository backed up.
echo.

REM 3. Copy source code
echo [3/6] Copying source code...
xcopy /E /I /H /Y "src" "%backup_path%\src\"
copy "package.json" "%backup_path%\"
copy "package-lock.json" "%backup_path%\"
copy ".env" "%backup_path%\" 2>nul
copy "vite.config.ts" "%backup_path%\"
copy "tsconfig.json" "%backup_path%\"
copy "tailwind.config.js" "%backup_path%\"
echo Source code copied.
echo.

REM 4. Export database schema and data
echo [4/6] Creating database backup info...
echo Database URL: %VITE_SUPABASE_URL% > "%backup_path%\database_info.txt"
echo Backup Date: %datestamp% >> "%backup_path%\database_info.txt"
echo Project ID: rfbllniljztbbyfanzqk >> "%backup_path%\database_info.txt"
echo.
echo Note: Database data is stored in Supabase cloud and is automatically backed up. >> "%backup_path%\database_info.txt"
echo To restore database, use the Supabase dashboard or API. >> "%backup_path%\database_info.txt"
echo Database info saved.
echo.

REM 5. Create restore instructions
echo [5/6] Creating restore instructions...
(
echo ========================================
echo RESTORE INSTRUCTIONS
echo ========================================
echo.
echo To restore this backup:
echo.
echo 1. Extract/copy the contents to a new directory
echo 2. Run: npm install
echo 3. Copy .env file to project root
echo 4. Restore git repository: git clone servigence_repo_%datestamp%.bundle restored_project
echo 5. Run: npm run dev
echo.
echo Database:
echo - Data is stored in Supabase cloud
echo - Use Supabase dashboard for database operations
echo - Project ID: rfbllniljztbbyfanzqk
echo.
echo Backup created: %datestamp%
echo ========================================
) > "%backup_path%\RESTORE_INSTRUCTIONS.txt"
echo Restore instructions created.
echo.

REM 6. Create backup summary
echo [6/6] Creating backup summary...
(
echo Backup Summary - %datestamp%
echo ========================================
echo.
echo Files backed up:
dir /s "%backup_path%" | find "File(s)"
echo.
echo Git commits included:
git log --oneline -5
echo.
echo Database tables in project:
echo - companies, employees, reminders
echo - service_billings, account_transactions
echo - service_types, vendors, users
echo.
echo Backup location: %backup_path%
) > "%backup_path%\backup_summary.txt"
echo.

echo ========================================
echo BACKUP COMPLETED SUCCESSFULLY!
echo ========================================
echo.
echo Backup location: %backup_path%
echo.
echo Your work is now safely backed up!
echo Run this script daily to maintain regular backups.
echo.
pause
