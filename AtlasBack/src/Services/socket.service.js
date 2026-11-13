"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socketService = void 0;
var SocketService = /** @class */ (function () {
    function SocketService() {
        this.io = null;
    } // Private constructor for singleton
    SocketService.getInstance = function () {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    };
    SocketService.prototype.initialize = function (io) {
        this.io = io;
    };
    // General broadcast to all connected clients
    SocketService.prototype.broadcastEvent = function (event, data) {
        if (!this.io) {
            console.error('Socket.IO not initialized');
            return;
        }
        this.io.emit(event, data); // Broadcast to everyone
    };
    SocketService.prototype.emitToUser = function (userId, event, data) {
        if (!this.io) {
            throw new Error('Socket.IO not initialized. Call initialize() first.');
        }
        this.io.to("user_".concat(userId)).emit(event, data);
    };
    return SocketService;
}());
// Export singleton instance
exports.socketService = SocketService.getInstance();
