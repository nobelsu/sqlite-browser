# SQLite Web UI

A simple **web-based UI for browsing and editing SQLite databases**.

## 🧰 Features

- Browse SQLite database tables and schema
- Run custom SQL queries
- View and edit records in your browser
- Works with any local `.db` file

## 🚀 Quick Start

1. Clone the repo  
   ```sh
   git clone https://github.com/nobelsu/sqlite_web_ui.git
   cd sqlite_web_ui
    ```

2. Install dependencies

   ```sh
   uv add -r requirements.txt
   ```

3. Set up and adjust environment variables:

    ```
    SQLITE_DB=/path/to/example.db
    REFRESH_INTERVAL=2 
    ```

3. Run the app

   ```sh
   uv run app.py
   ```

4. Open your browser at:

   ```
   http://localhost:5000
   ```

## 📦 Example

Include a sample DB like `example.db` and start exploring right away!

## 📝 License

MIT
