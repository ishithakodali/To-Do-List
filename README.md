# Smart To-Do
A premium, modern task management application. Smart To-Do features a clean, portfolio-quality UI inspired by top-tier SaaS products, complete with fluid animations, adaptive light/dark modes, and secure user authentication.
## Features
- **Modern SaaS UI**: A highly polished, minimal design system with smooth microinteractions, subtle elevations, and premium typography.
- **Adaptive Themes**: Seamless toggle between a crisp Light Mode and a sophisticated Dark Mode, complete with adaptive icons and contrast-optimized colors.
- **User Authentication**: Secure signup and login functionality using JWTs (JSON Web Tokens) with encrypted passwords.
- **Task Management**: Full CRUD capabilities—create, read, complete, and delete tasks instantly.
- **Search & Filter**: Quickly find tasks with real-time search and status-based filtering (All, Pending, Completed).
- **Responsive Design**: Fluid and responsive layout providing a flawless experience across desktop, tablet, and mobile devices.
## Tech Stack
- **Frontend**: HTML5, Vanilla JavaScript, CSS3 (Custom CSS Variables, Flexbox, native SVGs)
- **Backend**: Node.js, Express.js
- **Database**: MongoDB (via Mongoose)
- **Authentication**: JSON Web Tokens (JWT), bcryptjs
## Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas connection)
## Getting Started
1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd smart-todo
   ```
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure Environment Variables**
   Ensure you have a `.env` file in the root directory (follow .env.example)
4. **Start the application**
   ```bash
   node server/server.js
   ```
5. **Open the app**
   Navigate to `http://localhost:3000` in your web browser.

