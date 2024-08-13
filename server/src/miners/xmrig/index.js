const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PLATFORM = os.platform().toLowerCase();
const LINUX_PATH = path.join(__dirname, './xmrig');
const WINDOWS_PATH = path.join(__dirname, './xmrig.exe');

class XMRIGMiner {
    constructor(app) {
        this.name = 'xmrig';
        this._app = app;
        this._initialized = false;
        this._filePath = null;
        this._worker = null;
        this._running = false;

        this._init();
    }

    async _init() {
        try {
            if (PLATFORM === 'linux') {
                this._loadLinux();
            } else if (PLATFORM === 'win32') {
                this._loadWindows();
            } else {
                throw new Error('Unsupported platform');
            }
            this._initialized = true;
        } catch (error) {
            this._app.logger.error(`Initialization failed: ${error.message}`);
        }
    }

    start() {
        if (this._running) {
            this._app.logger.info('XMRIG is already running');
            return;
        }
        if (!this._initialized) {
            this._app.logger.error('XMRIG not initialized');
            return;
        }

        this._running = true;
        this._exec();
    }

    stop() {
        if (this._worker) {
            this._worker.kill();
            this._worker = null;
            this._running = false;
            this._app.logger.info('XMRIG stopped');
        }
    }

    getStatus() {
        return this._running ? 'Running' : 'Stopped';
    }

    _loadLinux() {
        fs.chmodSync(LINUX_PATH, 0o754);
        this._filePath = LINUX_PATH;
    }

    _loadWindows() {
        this._filePath = WINDOWS_PATH;
    }

    _exec() {
        this._updateConfig();

        this._worker = spawn(this._filePath, []);

        this._worker.stdout.on('data', (data) => {
            this._app.logger.info(data.toString());
        });

        this._worker.stderr.on('data', (data) => {
            this._app.logger.error(data.toString());
        });

        this._worker.on('close', (code) => {
            this._app.logger.info(`XMRIG process exited with code ${code}`);
            this._running = false;
        });
    }

    _updateConfig() {
        const configBasePath = path.join(__dirname, './config.base.json');
        const configPath = path.join(__dirname, './config.json');

        const configBase = JSON.parse(fs.readFileSync(configBasePath, 'utf8'));

        const pools = this._app.config.pools.map(poolConfig => ({
            ...configBase.pools[0],
            ...poolConfig
        }));

        this._app.logger.info('XMRIG pools configuration');
        this._app.logger.info(JSON.stringify(pools, null, 2));

        configBase.pools = pools;
        Object.assign(configBase.opencl, this._app.config.opencl);
        Object.assign(configBase.cuda, this._app.config.cuda);

        fs.writeFileSync(configPath, JSON.stringify(configBase, null, 2), 'utf8');
    }
}

module.exports = XMRIGMiner;
