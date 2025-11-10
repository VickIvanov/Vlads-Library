@echo off
echo ========================================
echo  COSMIC LIBRARY (JAVA)
echo ========================================
echo.
echo Checking Java...
java -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Java not installed!
    echo Install Java JDK 17 or higher
    pause
    exit /b 1
)
echo Java OK
echo.
echo Checking Maven...
mvn -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Maven not installed!
    echo Install Maven and add to PATH
    pause
    exit /b 1
)
echo Maven OK
echo.
echo Downloading dependencies...
call mvn dependency:resolve -q
echo.
echo Starting server...
echo Open browser: http://localhost:8080
echo.
call mvn spring-boot:run
pause


echo  COSMIC LIBRARY (JAVA)
echo ========================================
echo.
echo Checking Java...
java -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Java not installed!
    echo Install Java JDK 17 or higher
    pause
    exit /b 1
)
echo Java OK
echo.
echo Checking Maven...
mvn -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Maven not installed!
    echo Install Maven and add to PATH
    pause
    exit /b 1
)
echo Maven OK
echo.
echo Downloading dependencies...
call mvn dependency:resolve -q
echo.
echo Starting server...
echo Open browser: http://localhost:8080
echo.
call mvn spring-boot:run
pause

