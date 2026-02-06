const { spawn, execSync } = require('child_process');
const net = require('net');

const PORT = 3005;

// Check if port is taken (by trying to connect)
const isPortTaken = (port) => new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(400);
    socket.on('connect', () => { socket.destroy(); resolve(true); });
    socket.on('timeout', () => { socket.destroy(); resolve(false); });
    socket.on('error', () => { socket.destroy(); resolve(false); });
    socket.connect(port, '127.0.0.1');
});

(async () => {
    if (await isPortTaken(PORT)) {
        console.log(`⚠️  Port ${PORT} is already in use. Assuming Admin Panel is running.`);
        console.log('✅  Skipping Admin Panel start.');
        process.exit(0);
    }

    console.log(`🚀 Starting Admin Panel on port ${PORT}...`);

    // Navigate to admin directory
    const adminDir = __dirname; // This script should be in admin/ or we adjust path.
    // Actually, let's put it in root for consistency with other start scripts.

    // If in root, admin dir is ./admin
    const cwd = process.cwd().endsWith('admin') ? process.cwd() : 'admin';

    const child = spawn('pnpm', ['run', 'dev'], {
        stdio: 'inherit',
        shell: true,
        cwd: cwd,
        env: { ...process.env }
    });

    child.on('error', (error) => {
        console.error('Failed to start Admin Panel:', error);
        process.exit(1);
    });

    child.on('exit', (code) => {
        process.exit(code || 0);
    });
})();
