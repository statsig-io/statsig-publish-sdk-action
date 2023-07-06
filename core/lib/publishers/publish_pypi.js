"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execPromise = (0, util_1.promisify)(child_process_1.exec);
function publishToPyPI(args) {
    var _a, e_1, _b, _c;
    var _d;
    return __awaiter(this, void 0, void 0, function* () {
        const isBeta = core.getBooleanInput('is-beta');
        const tokenName = isBeta ? 'pypi-beta-token' : 'pypi-token';
        const PYPI_TOKEN = (_d = core.getInput(tokenName)) !== null && _d !== void 0 ? _d : '';
        if (PYPI_TOKEN === '') {
            throw new Error('Call to PyPI Publish without settng pypi-token');
        }
        const version = args.tag.replace('v', '');
        let uploadCommand = `twine upload --skip-existing dist/statsig-${version}.tar.gz --verbose -u __token__ -p ${PYPI_TOKEN}`;
        if (isBeta) {
            uploadCommand += ' --repository-url https://test.pypi.org/legacy/';
        }
        const commands = [
            'python3 setup.py sdist',
            'twine check dist/*',
            `tar tzf dist/statsig-${version}.tar.gz`,
            uploadCommand
        ];
        const opts = {
            cwd: args.workingDir
        };
        try {
            for (var _e = true, commands_1 = __asyncValues(commands), commands_1_1; commands_1_1 = yield commands_1.next(), _a = commands_1_1.done, !_a; _e = true) {
                _c = commands_1_1.value;
                _e = false;
                const command = _c;
                console.log(`[${command}] Executing...`);
                const { stdout, stderr } = yield execPromise(command, opts);
                console.log(`[${command}] Done`, stdout, stderr);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_e && !_a && (_b = commands_1.return)) yield _b.call(commands_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        console.log('🎉 PyPI Done!');
    });
}
exports.default = publishToPyPI;
