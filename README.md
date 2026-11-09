# 🎮 Photo Reveal Guessing Game – Dual Panel Web Application

A modern, interactive, real-time Photo Reveal Guessing Game built with **React**, **Vite**, **Tailwind CSS**, **Framer Motion**, and an **Express + Socket.IO + SQLite** backend.

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Both Backend & Frontend
```bash
npm run dev
```
- **Frontend**: [http://localhost:5173](http://localhost:5173)
- **Backend API & WebSockets**: [http://localhost:3002](http://localhost:3002)

---

## 🕹️ Two-Panel Architecture

The application provides two synchronized routes:

1. **Admin Panel**: [`/admin`](http://localhost:5173/admin)
   - Manage games, configure reveal duration, grid size, auto/manual mode, sequential/random order.
   - Upload photos individually or in bulk with answers, categories, and progressive hints.
   - Reorder, edit, and delete photos.
   - Host controls: **Start Game**, **Pause**, **Resume**, **Reveal Next Part**, **Reveal Full Photo**, **Skip**, **Restart Round**, **Show Answer**, **Next Photo**, **End Game**.
   - Includes **Live Dual-View Preview** reflecting the exact reveal progress players see.

2. **User Panel**: [`/play`](http://localhost:5173/play) (or [`/play?gameId=<id>`](http://localhost:5173/play))
   - **Welcome Screen**: Join by code or URL.
   - **Waiting Room**: Real-time waiting screen with gameplay tips.
   - **Segmentation Grid**: Central photo covered by smooth flipping tiles that reveal genuine portions of the image.
   - **Countdown Timer**: Circular SVG timer with animated urgency transitions.
   - **Smart Guessing**: Instant validation ignoring case, spaces, and punctuation; score awarded based on remaining hidden tiles.
   - **Leaderboard & Reveal Screen**: Live standings, podium ranks, and full photo reveal.

---

## 🌟 Seed Demo Game Included
The database automatically seeds a demo championship with 4 challenges across **Landmarks**, **Space**, and **Animals**:
1. **Eiffel Tower** (Landmarks)
2. **Saturn** (Space)
3. **Golden Gate Bridge** (Landmarks)
4. **Lion** (Animals)

---

## 🔒 Security & Fair Play
- **Answer Masking**: The backend explicitly strips `photo.title` from all state payloads and socket broadcasts sent to `/play` players until the host triggers answer reveal or all tiles are uncovered. Answers cannot be inspected via client dev tools or network inspect.
# photo-reveal
