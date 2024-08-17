const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PLATFORM = os.platform().toLowerCase();

const LINUX_PATH = path.join(__dirname, './xmrig');
const WINDOWS_PATH = path.join(__dirname, './xmrig.exe');

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
        }

        else if (PLATFORM === 'win32') {
            this._loadWindows();
        }

        else {
            throw new Error('Unsopperted platform');
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

    }

    _loadLinux() {
        fs.chmodSync(LINUX_PATH, 754);

        this._filePath = LINUX_PATH;
    }

    _loadWindows() {
        this._filePath = WINDOWS_PATH;
    }

    _exec() {
        this._updateConfig(); 
    
        if (PLATFORM === 'win32') {
            const batFilePath = path.join(__dirname, 'config-xmrig.bat');
    
            this._worker = spawn('cmd.exe', ['/c', batFilePath], {
                cwd: path.dirname(batFilePath) 
            });
    
            this._worker.stdout.on('data', (data) => this._app.logger.info(data.toString()));
            this._worker.stderr.on('data', (data) => this._app.logger.error(data.toString()));
    
            this._worker.on('close', (code) => {
                this._app.logger.info(`Batch script exited with code ${code}`);
                this._running = false;
            });
        } else {

            // this._worker = spawn(this._filePath, [], {
            //     cwd: __dirname 
            // });

            this._worker = spawn('/bin/bash', ['config-xmrig.sh'], {
                cwd: __dirname 
            });
    
            this._worker.stdout.on('data', (data) => this._app.logger.info(data.toString()));
            this._worker.stderr.on('data', (data) => this._app.logger.error(data.toString()));
    
            this._worker.on('close', (code) => {
                this._app.logger.info(`Miner process exited with code ${code}`);
                this._running = false;
            });
        }
    }
    
    
    

    _updateConfig() {
        const batFilePath = path.join(__dirname, './config-xmrig.bat');
        const shFilePath = path.join(__dirname, './config-xmrig.sh')
    
        const poolConfig = this._app.config.pools[0];
        const options = this._app.config.options;
    
        let poolUrl;
        if (options.algorithm === 'gr') {
            poolUrl = 'stratum+ssl://ghostrider.unmineable.com:443';
        } else if (options.algorithm === 'rx') {
            poolUrl = 'stratum+ssl://rx.unmineable.com:443';
        } else {
            throw new Error(`Unsupported algorithm: ${options.algorithm}`);
        }
    
        const batcommand = `
        xmrig.exe -a ${options.algorithm} -o ${poolUrl} -u ${poolConfig.coin}:${poolConfig.user}.${poolConfig.worker} -p x --cpu-priority=${options.cpuPriority} --threads=${options.threads} pause`;
    
        const shcommand = `
        ./xmrig -a ${options.algorithm} -o ${poolUrl} -u ${poolConfig.coin}:${poolConfig.user}.${poolConfig.worker} -p x --cpu-priority=${options.cpuPriority} --threads=${options.threads}`;

        this._app.logger.info('XMRIG pools configuration');
        this._app.logger.info(JSON.stringify(poolConfig, null, 2));
    
        fs.writeFileSync(batFilePath, batcommand.trim());
        fs.writeFileSync(shFilePath, shcommand.trim());
    
        this._app.logger.info(`Batch and shell file created at: ${batFilePath}, ${shFilePath}`);
    }
    
    
}

