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
function publishJSMono(args) {
    var _a, e_1, _b, _c;
    var _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        const NPM_TOKEN = (_d = core.getInput('npm-token')) !== null && _d !== void 0 ? _d : '';
        if (NPM_TOKEN === '') {
            throw new Error('Call to NPM Publish without settng npm-token');
        }
        const commands = [
            'pnpm install',
            `echo "//registry.npmjs.org/:_authToken=${NPM_TOKEN}" > .npmrc`,
            `pnpm exec nx run statsig:publish-all --verbose`,
        ];
        const opts = {
            cwd: args.workingDir
        };
        try {
            for (var _f = true, commands_1 = __asyncValues(commands), commands_1_1; commands_1_1 = yield commands_1.next(), _a = commands_1_1.done, !_a; _f = true) {
                _c = commands_1_1.value;
                _f = false;
                const command = _c;
                console.log(`[${command}] Executing...`);
                try {
                    const result = (0, child_process_1.execSync)(command, opts);
                }
                catch (error) {
                    console.error(`[${command}] Error`, (_e = error.stdout) === null || _e === void 0 ? void 0 : _e.toString());
                    throw error;
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_f && !_a && (_b = commands_1.return)) yield _b.call(commands_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        console.log('🎉 JS Mono Done!');
    });
}
exports.default = publishJSMono;
