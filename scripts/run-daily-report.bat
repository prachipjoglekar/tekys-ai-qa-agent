@echo off
REM Runs the smoke suite and emails the report to prachi@tekyz.com.
REM Intended to be triggered daily by Windows Task Scheduler — see
REM scripts/README.md for the one-time setup command.

cd /d "C:\Users\MyPC\Documents\tekyz-ai-qa-agent"
call npm run test:daily >> "reports\daily-run.log" 2>&1
