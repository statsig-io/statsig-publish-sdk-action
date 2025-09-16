"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyPackageManager = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
// --- Types
const SUPPORTED_PKG_MANAGER = ['npm', 'pnpm', 'yarn'];
// --- Helpers
function isValidPackageManager(value) {
    return !!(value && SUPPORTED_PKG_MANAGER.includes(value));
}
function readFileIfExists(path) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield (0, promises_1.readFile)(path, 'utf-8');
        }
        catch (e) {
            return undefined;
        }
    });
}
// --- package.json
function readPackageJson(rootDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const packageJsonPath = (0, path_1.join)(rootDir, 'package.json');
        const packageJsonContent = yield readFileIfExists(packageJsonPath);
        try {
            return JSON.parse(packageJsonContent !== null && packageJsonContent !== void 0 ? packageJsonContent : '{}');
        }
        catch (e) {
            console.error('Error parsing package.json', e);
        }
        return {};
    });
}
// --- Package manager
function parsePackageManager(packageJson) {
    var _a, _b, _c;
    const devEnginesName = (_b = (_a = packageJson.devEngines) === null || _a === void 0 ? void 0 : _a.packageManager) === null || _b === void 0 ? void 0 : _b.name;
    if (isValidPackageManager(devEnginesName)) {
        return devEnginesName;
    }
    const pkgManagerName = (_c = packageJson.packageManager) === null || _c === void 0 ? void 0 : _c.replace(/\@.*$/, '');
    if (isValidPackageManager(pkgManagerName)) {
        return pkgManagerName;
    }
    return undefined;
}
function inferPackageManagerFromLockfiles(rootDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const files = yield (0, promises_1.readdir)(rootDir);
        if (files.includes('package-lock.json')) {
            return 'npm';
        }
        if (files.includes('pnpm-lock.yaml')) {
            return 'pnpm';
        }
        if (files.includes('yarn.lock')) {
            return 'yarn';
        }
        return undefined;
    });
}
function identifyPackageManager(rootDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const packageJson = yield readPackageJson(rootDir);
        const packageJsonPkgManager = parsePackageManager(packageJson);
        if (packageJsonPkgManager) {
            return packageJsonPkgManager;
        }
        const lockfilePkgManager = yield inferPackageManagerFromLockfiles(rootDir);
        if (lockfilePkgManager) {
            return lockfilePkgManager;
        }
        return 'npm';
    });
}
exports.identifyPackageManager = identifyPackageManager;
