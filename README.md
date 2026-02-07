# Cixus Rage - Backend

A web game that takes intelligence directly from models and converts it to actionable plays.

## Quick Start (SQLite Mode)

We are running with **SQLite** for zero-config local development.

1.  **Install**:
    ```bash
    python -m pip install -r requirements.txt
    python -m pip install aiosqlite
    ```

2.  **Initialize DB**:
    Creates `cixus.db` in this folder.
    ```bash
    python init_db.py
    ```

3.  **Run Server**:
    ```bash
    python -m uvicorn app.main:app --reload
    ```

## API Usage
-   **Documentation**: `http://127.0.0.1:8000/docs`
