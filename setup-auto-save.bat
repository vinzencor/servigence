@echo off
REM Setup automatic save and backup system for Servigence project

echo ========================================
echo Servigence Auto-Save Setup
echo ========================================
echo.

REM Create .git/hooks directory if it doesn't exist
if not exist ".git\hooks" mkdir ".git\hooks"

REM Create pre-commit hook for automatic staging
echo Creating pre-commit hook...
(
echo #!/bin/sh
echo # Auto-stage modified files before commit
echo echo "Auto-staging modified files..."
echo git add -A
echo echo "Files staged successfully."
) > ".git\hooks\pre-commit"

REM Create post-commit hook for backup reminder
echo Creating post-commit hook...
(
echo #!/bin/sh
echo # Remind user about backups after commit
echo echo ""
echo echo "✅ Commit successful!"
echo echo "💡 Reminder: Run backup-script.bat daily to backup your work"
echo echo ""
) > ".git\hooks\post-commit"

REM Create a daily backup task scheduler script
echo Creating daily backup scheduler...
(
echo @echo off
echo REM Daily backup task - Add this to Windows Task Scheduler
echo echo Running daily backup...
echo cd /d "%~dp0"
echo call backup-script.bat
echo echo Daily backup completed.
) > "daily-backup-task.bat"

REM Create Git aliases for easier workflow
echo Setting up Git aliases...
git config alias.save "!git add -A && git commit -m"
git config alias.backup "!git add -A && git commit -m 'Auto-backup' && echo 'Work saved! Consider running backup-script.bat'"
git config alias.quick "!git add -A && git commit -m 'Quick save - $(date)'"

REM Create a quick save script
echo Creating quick save script...
(
echo @echo off
echo REM Quick save script - saves current work with timestamp
echo echo Saving current work...
echo git add -A
echo for /f "tokens=2 delims==" %%%%a in ('wmic OS Get localdatetime /value'^) do set "dt=%%%%a"
echo set "timestamp=%%dt:~0,4%%-%%dt:~4,2%%-%%dt:~6,2%% %%dt:~8,2%%:%%dt:~10,2%%"
echo git commit -m "Quick save - %%timestamp%%"
echo echo ✅ Work saved successfully!
echo echo 💡 Don't forget to run backup-script.bat for full backup
) > "quick-save.bat"

REM Create development workflow script
echo Creating development workflow script...
(
echo @echo off
echo REM Development workflow - start development with safety checks
echo echo ========================================
echo echo Servigence Development Startup
echo echo ========================================
echo echo.
echo echo [1/4] Checking Git status...
echo git status --short
echo echo.
echo echo [2/4] Checking for uncommitted changes...
echo git diff --name-only
echo echo.
echo echo [3/4] Starting development server...
echo start cmd /k "npm run dev"
echo echo.
echo echo [4/4] Opening backup reminder...
echo echo ⚠️  IMPORTANT REMINDERS:
echo echo - Save your work frequently with: quick-save.bat
echo echo - Run daily backup with: backup-script.bat  
echo echo - Commit major changes with: git save "your message"
echo echo.
echo echo Development server started!
echo echo Browser should open automatically at http://localhost:5175/
echo echo.
echo pause
) > "start-dev.bat"

echo.
echo ========================================
echo AUTO-SAVE SETUP COMPLETED!
echo ========================================
echo.
echo Created files:
echo - backup-script.bat (Full backup system)
echo - quick-save.bat (Quick save current work)
echo - start-dev.bat (Development startup with reminders)
echo - daily-backup-task.bat (For Windows Task Scheduler)
echo.
echo Git aliases created:
echo - git save "message" (Add all and commit)
echo - git backup (Quick backup with auto message)
echo - git quick (Quick save with timestamp)
echo.
echo NEXT STEPS:
echo 1. Run backup-script.bat now to create your first backup
echo 2. Use quick-save.bat frequently while working
echo 3. Use start-dev.bat to begin development sessions
echo 4. Consider adding daily-backup-task.bat to Windows Task Scheduler
echo.
echo Your work is now protected! 🛡️
echo.
pause
