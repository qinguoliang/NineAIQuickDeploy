"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const bull_1 = require("@nestjs/bull");
const utils_1 = require("../../common/utils");
const midjourney_service_1 = require("../midjourney/midjourney.service");
const userBalance_service_1 = require("../userBalance/userBalance.service");
const globalConfig_service_1 = require("../globalConfig/globalConfig.service");
let QueueService = class QueueService {
    constructor(mjDrawQueue, midjourneyService, userBalanceService, globalConfigService) {
        this.mjDrawQueue = mjDrawQueue;
        this.midjourneyService = midjourneyService;
        this.userBalanceService = userBalanceService;
        this.globalConfigService = globalConfigService;
        this.jobIds = [];
    }
    async onApplicationBootstrap() {
        await this.mjDrawQueue.clean(0, 'active');
        await this.midjourneyService.cleanQueue();
    }
    async addMjDrawQueue(body, req) {
        const { imgUrl, orderId, action, drawId } = body;
        await this.midjourneyService.checkLimit(req);
        await this.userBalanceService.validateBalance(req, 'mjDraw', action === 'UPSCALE' ? 1 : 4);
        if (action === 'IMAGINE') {
            const randomDrawId = `${(0, utils_1.createRandomUid)()}`;
            const params = Object.assign(Object.assign({}, body), { userId: req.user.id, randomDrawId });
            const res = await this.midjourneyService.addDrawQueue(params);
            const timeout = (await this.globalConfigService.getConfigs(['mjTimeoutMs'])) || 200000;
            const job = await this.mjDrawQueue.add('mjDraw', { id: res.id, action: action, userId: req.user.id }, { delay: 1000, timeout: +timeout });
            this.jobIds.push(job.id);
            return true;
        }
        else {
            const { orderId, action, drawId } = body;
            const actionDetail = await this.midjourneyService.getDrawActionDetail(action, drawId, orderId);
            const params = Object.assign(Object.assign(Object.assign({}, body), { userId: req.user.id }), actionDetail);
            const res = await this.midjourneyService.addDrawQueue(params);
            const timeout = (await this.globalConfigService.getConfigs(['mjTimeoutMs'])) || 200000;
            const job = await this.mjDrawQueue.add('mjDraw', { id: res.id, action, userId: req.user.id }, { delay: 1000, timeout: +timeout });
            this.jobIds.push(job.id);
            return;
        }
        if (!drawId || !orderId) {
            throw new common_1.HttpException('缺少必要参数！', common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async getQueue() {
        return { jobIds: this.jobIds };
    }
};
QueueService = __decorate([
    __param(0, (0, bull_1.InjectQueue)('MJDRAW')),
    __metadata("design:paramtypes", [Object, midjourney_service_1.MidjourneyService,
        userBalance_service_1.UserBalanceService,
        globalConfig_service_1.GlobalConfigService])
], QueueService);
exports.QueueService = QueueService;
