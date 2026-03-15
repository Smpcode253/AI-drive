const jobQueue = require('../queue/jobQueue');
setInterval(() => {
    jobQueue.processJobs();
}, 2000);
module.exports = setInterval;