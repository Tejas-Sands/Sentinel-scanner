# 🚀 Sentinel Scanner — Local Development & Deployment Playbook

This document is your quick-reference guide for local testing, version control, and pushing updates live to production!

---

## 🗺️ System Overview
* **GitHub (`origin`)**: Used for code version control, backups, and tracking history.
* **Hugging Face (`hf`)**: Used to host your live backend 24/7 on high-performance CPU instances (16 GB RAM) running inside a secure Docker container.

---

## 🛠️ Step 1: Local Development & Editing

Whenever you want to test changes locally on your machine:

1. **Open your Terminal** inside the `backend` folder.
2. **Activate your Virtual Environment**:
   ```bash
   source venv/bin/activate
   ```
3. **Start the local server**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```
4. **Local Database Fallback**:
   If your local network blocks Supabase PostgreSQL connections, your backend will automatically and seamlessly fall back to your local SQLite database (`sentinel.db`) so your coding is never interrupted!

---

## 🔄 Step 2: Deploying Updates (The 3-Step Flow)

Once you edit your files and verify they work, use these commands to push them live:

### 1. Stage and Commit Your Changes
```bash
# Check what files you changed
git status

# Stage all edits (.gitignore will safely block venv/ and .env!)
git add .

# Commit with a short description of what you edited
git commit -m "Update risk scoring/auth routes"
```

### 2. Push to GitHub (For Version Control & Saving)
```bash
git push origin main
```

### 3. Push to Hugging Face (To Instantly Update the Live App)
```bash
git push hf main
```
*Note: If prompted for password, paste your Hugging Face **Write Access Token**.*

---

## ⚙️ Managing Environment Variables (Secrets)

If you ever need to change your API keys (e.g. Alchemy, Etherscan, Supabase) in production:

1. Go to your **Hugging Face Space** ➔ **Settings** ➔ Scroll down to **Variables and Secrets**.
2. Click **New Secret** (or **Edit** next to an existing one).
3. **Important**: Always keep `ENVIRONMENT=production` in your Hugging Face Secrets to ensure strict CORS security and error logs protection.
4. **Auto-Reboot**: The moment you save your secret, Hugging Face will **automatically reboot and restart** your server in the background (takes ~60 seconds).

---

## 🚨 Troubleshooting & Checking Logs

If your live app behaves unexpectedly:
* Go to your Hugging Face Space page ➔ Click **Container Logs** near the top.
* Here you will see Gunicorn/Uvicorn outputs, seeder logs, and active compliance scan traces in real-time!
