# Cixus Rage - Backend

A web game that takes intelligence directly from models and converts it to actionable plays. Strategy is peak and the aim is to defeat generals.

## Setup

1.  **Install Dependencies**:
    ```bash
    python -m pip install -r requirements.txt
    ```

2.  **Database**:
    Ensure PostgreSQL is running locally on port 5432.
    Update `.env` if your credentials differ from the defaults (`postgres`/`password`).
    
    Initialize tables:
    ```bash
    python init_db.py
    ```

3.  **Run Server**:
    Use `uvicorn` via python module to avoid path issues:
    ```bash
    python -m uvicorn app.main:app --reload
    ```

## API Usage

-   **Swagger UI**: Visit `http://127.0.0.1:8000/docs`
-   **Create Player**: POST `/api/v1/players/`
-   **Start War**: POST `/api/v1/war/start`
-   **Submit Command**: POST `/api/v1/war/{id}/command`
