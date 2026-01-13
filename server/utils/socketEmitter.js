// Helper to emit socket events from routes
const emitToClassroom = (io, roomNumber, event, data) => {
  io.to(`classroom-${roomNumber}`).emit(event, data);
};

const emitToDashboard = (io, event, data) => {
  io.to('coordinator-dashboard').emit(event, data);
};

const emitToAll = (io, event, data) => {
  io.emit(event, data);
};

module.exports = {
  emitToClassroom,
  emitToDashboard,
  emitToAll
};

