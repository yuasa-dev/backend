"use strict";
/**
 * Repository層のエクスポート
 *
 * すべてのDBアクセスはこのRepository層を経由して行います。
 * RLS相当のセキュリティを確保するため、各メソッドでuserIdを必須としています。
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictionRepository = exports.predictionRepository = exports.RaceRepository = exports.raceRepository = exports.GroupRepository = exports.groupRepository = exports.UserRepository = exports.userRepository = void 0;
var UserRepository_1 = require("./UserRepository");
Object.defineProperty(exports, "userRepository", { enumerable: true, get: function () { return UserRepository_1.userRepository; } });
Object.defineProperty(exports, "UserRepository", { enumerable: true, get: function () { return UserRepository_1.UserRepository; } });
var GroupRepository_1 = require("./GroupRepository");
Object.defineProperty(exports, "groupRepository", { enumerable: true, get: function () { return GroupRepository_1.groupRepository; } });
Object.defineProperty(exports, "GroupRepository", { enumerable: true, get: function () { return GroupRepository_1.GroupRepository; } });
var RaceRepository_1 = require("./RaceRepository");
Object.defineProperty(exports, "raceRepository", { enumerable: true, get: function () { return RaceRepository_1.raceRepository; } });
Object.defineProperty(exports, "RaceRepository", { enumerable: true, get: function () { return RaceRepository_1.RaceRepository; } });
var PredictionRepository_1 = require("./PredictionRepository");
Object.defineProperty(exports, "predictionRepository", { enumerable: true, get: function () { return PredictionRepository_1.predictionRepository; } });
Object.defineProperty(exports, "PredictionRepository", { enumerable: true, get: function () { return PredictionRepository_1.PredictionRepository; } });
//# sourceMappingURL=index.js.map